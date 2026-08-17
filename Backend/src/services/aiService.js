/**
 * The only place this API talks to the FastAPI RAG service.
 *
 * The AI service is never public: it has no CORS, no user model, and no JWT
 * verification. Node is the single auth boundary — it checks the token, applies
 * RBAC, then calls here with a shared service secret. Keeping that call in one
 * module means the boundary is one file to audit, not a habit spread across
 * controllers.
 */

const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SERVICE_TOKEN_HEADER = 'X-AI-Service-Token';

const UNAVAILABLE = 'AI Reports are not connected yet. Set AI_SERVICE_URL and start the AI service.';
const UNREACHABLE = "The AI service isn't responding. Try again in a moment.";
const TIMED_OUT = 'The AI service took too long to answer. Try a shorter question.';

const isEnabled = () => env.ai.enabled;

/**
 * @param {string} path e.g. '/reports'
 * @param {{ method?: string, body?: unknown, timeoutMs?: number }} [options]
 */
async function call(path, { method = 'POST', body, timeoutMs } = {}) {
  if (!isEnabled()) throw new ApiError(503, UNAVAILABLE);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? env.ai.timeoutMs);

  let response;
  try {
    response = await fetch(`${env.ai.serviceUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(env.ai.serviceToken ? { [SERVICE_TOKEN_HEADER]: env.ai.serviceToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(503, err.name === 'AbortError' ? TIMED_OUT : UNREACHABLE);
  } finally {
    clearTimeout(timer);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : null;

    // 503 is the AI service saying "I'm not set up" — a missing API key, a
    // provider it can't reach. That text is written for a human and is the
    // difference between a fixable message and a shrug, so it passes through.
    if (response.status === 503) {
      throw new ApiError(503, detail || 'The AI service is not ready yet');
    }
    // Any other 5xx is an internal failure; mask it the way the API masks its own.
    if (response.status >= 500) {
      // eslint-disable-next-line no-console
      console.error('[ai] service error', response.status, detail || payload);
      throw new ApiError(502, 'The AI service failed to answer. Try again.');
    }
    throw new ApiError(response.status, detail || 'The AI service rejected that request');
  }

  return payload;
}

/** Resolve the caller's RBAC scope once, so every AI call carries the same one. */
function scopeFor(user) {
  return { role: user.role, userId: String(user._id) };
}

module.exports = {
  isEnabled,
  scopeFor,
  UNAVAILABLE,

  health: () => call('/health', { method: 'GET', timeoutMs: 10000 }),

  report: (body) => call('/reports', { body }),

  assist: (body) => call('/assist', { body }),

  ingestPost: (postId, { force = false } = {}) =>
    call(`/ingest/posts/${postId}${force ? '?force=true' : ''}`, {
      timeoutMs: env.ai.ingestTimeoutMs,
    }),

  removePost: (postId) =>
    call(`/ingest/posts/${postId}`, { method: 'DELETE', timeoutMs: env.ai.ingestTimeoutMs }),

  backfill: (force = false) =>
    call('/ingest/backfill', { body: { force }, timeoutMs: env.ai.ingestTimeoutMs }),
};
