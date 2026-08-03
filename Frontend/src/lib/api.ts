import type { FieldError, Meta, TokenPair } from './types'
import { announceSessionEnd, tokenStore } from './tokens'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

/** §11: 5xx messages are masked in production — never surface a raw one. */
const SERVER_ERROR_COPY = 'Something failed on our end. Try again.'
const NETWORK_ERROR_COPY = "Can't reach the server. Check your connection and try again."

export interface Envelope<T> {
  success: boolean
  message: string
  data: T
  meta?: Meta
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldError[]

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Maps `errors[]` onto inputs: { title: 'Title is required' }. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const e of this.errors) {
      if (e.field && !out[e.field]) out[e.field] = e.message
    }
    return out
  }

  get isNetwork() {
    return this.status === 0
  }

  get isServer() {
    return this.status >= 500
  }
}

type QueryValue = string | number | boolean | null | undefined

/**
 * Takes any plain object (interfaces have no implicit index signature, so this
 * is deliberately loose) and drops empty values rather than sending `?q=`.
 */
export function buildQuery(params: object = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Record<string, QueryValue>)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

interface RequestOptions {
  method?: string
  body?: unknown
  /** Skip the Authorization header (login/register/refresh). */
  anonymous?: boolean
  /** Send the access token when we have one, but don't fail without it. */
  optionalAuth?: boolean
  signal?: AbortSignal
}

/* ────────────────────────────────────────────────────────────────────────
 * Single-flight refresh: many queries can 401 at once after the access token
 * expires. They all await the same rotation instead of racing — the API
 * rotates on every refresh and treats a replayed token as theft.
 * ──────────────────────────────────────────────────────────────────────── */
let refreshInFlight: Promise<string> | null = null

async function rotateRefreshToken(): Promise<string> {
  const refreshToken = tokenStore.getRefresh()
  if (!refreshToken) throw new ApiError(401, 'Your session ended — sign in again.')

  const response = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    // Reuse detected or expired: the API has revoked the whole family.
    throw new ApiError(401, payload?.message ?? 'Your session ended — sign in again.')
  }

  const pair = payload.data as TokenPair
  tokenStore.set(pair)
  return pair.accessToken
}

function refreshOnce(): Promise<string> {
  refreshInFlight ??= rotateRefreshToken().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {}
  const isForm = options.body instanceof FormData

  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    signal: options.signal,
    body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
}

async function toEnvelope<T>(response: Response): Promise<Envelope<T>> {
  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    const masked = response.status >= 500
    throw new ApiError(
      response.status,
      masked ? SERVER_ERROR_COPY : (payload?.message ?? 'Request failed'),
      payload?.errors ?? [],
    )
  }
  return payload as Envelope<T>
}

/**
 * The one path every request takes. On a 401 with a live session it refreshes
 * once and retries; if that fails the session is over — hard-logout (§10).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
  const useAuth = !options.anonymous
  let token = useAuth ? tokenStore.getAccess() : null

  let response: Response
  try {
    response = await send(path, options, token)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, NETWORK_ERROR_COPY)
  }

  if (response.status === 401 && useAuth && tokenStore.getRefresh()) {
    try {
      token = await refreshOnce()
    } catch (err) {
      announceSessionEnd(err instanceof ApiError ? err.message : 'Your session ended — sign in again.')
      throw err
    }
    try {
      response = await send(path, options, token)
    } catch {
      throw new ApiError(0, NETWORK_ERROR_COPY)
    }
    // Still refused with a fresh token: deactivated account, or revoked mid-flight.
    if (response.status === 401) {
      announceSessionEnd('Your session ended — sign in again.')
    }
  }

  return toEnvelope<T>(response)
}

/** Convenience wrappers — most callers only want `data`. */
export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}

/** A list response, unwrapped to the shape screens actually consume. */
export interface Paged<T> {
  items: T[]
  meta: Meta
}

export async function getPaged<T>(path: string, options?: RequestOptions): Promise<Paged<T>> {
  const envelope = await request<T[]>(path, options)
  return {
    items: envelope.data ?? [],
    meta: envelope.meta ?? { page: 1, limit: 10, total: envelope.data?.length ?? 0, totalPages: 1 },
  }
}
