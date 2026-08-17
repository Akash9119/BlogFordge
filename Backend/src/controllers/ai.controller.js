const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/respond');
const aiService = require('../services/aiService');
const Embedding = require('../models/Embedding');
const Post = require('../models/Post');

/**
 * The proxy layer for the AI microservice.
 *
 * Clients never reach FastAPI. They authenticate here, this controller resolves
 * their role into a `scope`, and the AI service trusts that scope precisely
 * because nothing else can reach its port. Retrieval is over published posts
 * only, so the corpus is content every role may already read; the scope decides
 * whose *analytics* the answer is allowed to draw on — the same line
 * `GET /analytics/overview` draws.
 */

/** POST /ai/reports — the RAG question. Any authenticated user. */
async function createReport(req, res) {
  const { question, topK, days, includeAnalytics, history } = req.body;

  const report = await aiService.report({
    question,
    scope: aiService.scopeFor(req.user),
    topK,
    days,
    includeAnalytics: includeAnalytics !== false,
    history: Array.isArray(history) ? history.slice(-6) : [],
  });

  return ok(res, { message: 'Report generated', data: report });
}

/** POST /ai/assist — summaries, SEO metadata, topic ideas, editorial notes. */
async function assist(req, res) {
  const { task, title, content, postId } = req.body;

  const suggestion = await aiService.assist({
    task,
    title: title || '',
    content: content || '',
    postId: postId || null,
    scope: aiService.scopeFor(req.user),
  });

  return ok(res, { message: 'Suggestion ready', data: suggestion });
}

/**
 * GET /ai/status — is the feature live, and how much is indexed?
 *
 * Answers without the AI service too: the corpus counts come from Mongo, so the
 * screen can say "12 posts indexed, service offline" instead of just failing.
 */
async function status(req, res) {
  const [publishedPosts, indexedChunks, indexedPosts] = await Promise.all([
    Post.countDocuments({ status: 'published' }),
    Embedding.estimatedDocumentCount(),
    Embedding.distinct('post').then((ids) => ids.length),
  ]);

  const corpus = { publishedPosts, indexedPosts, indexedChunks };

  if (!aiService.isEnabled()) {
    return ok(res, {
      message: 'AI service not configured',
      data: { available: false, reason: aiService.UNAVAILABLE, ...corpus },
    });
  }

  try {
    const health = await aiService.health();
    return ok(res, {
      message: 'OK',
      data: {
        available: Boolean(health?.ready),
        reason: health?.ready ? null : health?.modelError || 'The AI service is not ready yet',
        ...corpus,
        embeddingModel: health?.embeddingModel,
        chatModel: health?.chatModel,
        vectorIndex: health?.vectorIndex,
        lastIndexedAt: health?.lastIndexedAt ?? null,
      },
    });
  } catch (err) {
    return ok(res, {
      message: 'AI service unreachable',
      data: { available: false, reason: err.message, ...corpus },
    });
  }
}

/** POST /ai/reindex — admin only. Rebuilds the corpus from every published post. */
async function reindex(req, res) {
  if (!aiService.isEnabled()) throw new ApiError(503, aiService.UNAVAILABLE);
  const summary = await aiService.backfill(req.body?.force === true);
  return ok(res, { message: 'Reindex complete', data: summary });
}

module.exports = { createReport, assist, status, reindex };
