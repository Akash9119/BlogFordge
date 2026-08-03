import type { TokenPair } from './types'

const ACCESS_KEY = 'blogforge.accessToken'
const REFRESH_KEY = 'blogforge.refreshToken'

/**
 * Access token is held in memory (fast path) and mirrored to localStorage so a
 * page reload doesn't force a refresh round-trip. The refresh token has to
 * persist regardless — it is what survives the reload.
 */
let accessToken: string | null = null

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // private mode / storage disabled
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* non-fatal: we still work for the life of this tab */
  }
}

export const tokenStore = {
  getAccess(): string | null {
    if (accessToken === null) accessToken = read(ACCESS_KEY)
    return accessToken
  },

  getRefresh(): string | null {
    return read(REFRESH_KEY)
  },

  set(pair: TokenPair) {
    accessToken = pair.accessToken
    write(ACCESS_KEY, pair.accessToken)
    write(REFRESH_KEY, pair.refreshToken)
  },

  clear() {
    accessToken = null
    write(ACCESS_KEY, null)
    write(REFRESH_KEY, null)
  },

  get hasSession(): boolean {
    return Boolean(this.getAccess() ?? this.getRefresh())
  },
}

/**
 * Broadcast when a session ends involuntarily — refresh failed, the token was
 * reused (the API revokes the whole family), or the account was deactivated.
 * AuthProvider listens and routes to login with an explanation.
 */
export const SESSION_ENDED = 'blogforge:session-ended'

export function announceSessionEnd(reason: string) {
  tokenStore.clear()
  window.dispatchEvent(new CustomEvent(SESSION_ENDED, { detail: { reason } }))
}
