import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError } from '@/lib/api'
import { SESSION_ENDED, tokenStore } from '@/lib/tokens'
import type { AuthPayload, User } from '@/lib/types'
import { AuthContext, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(() => tokenStore.hasSession)
  const [endedReason, setEndedReason] = useState<string | null>(null)

  // Resolve the stored session once on boot. A 401 here is already handled by
  // the client's refresh path; if it still fails we simply start signed out.
  useEffect(() => {
    if (!tokenStore.hasSession) return

    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        tokenStore.clear()
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Refresh failed, the token was reused, or the account was deactivated —
  // the API client announces it and we hard-logout (§10).
  useEffect(() => {
    function onSessionEnded(event: Event) {
      const reason = (event as CustomEvent<{ reason: string }>).detail?.reason
      setUser(null)
      setEndedReason(reason ?? 'Your session ended — sign in again.')
      queryClient.clear()
    }
    window.addEventListener(SESSION_ENDED, onSessionEnded)
    return () => window.removeEventListener(SESSION_ENDED, onSessionEnded)
  }, [queryClient])

  const adopt = useCallback(
    (payload: AuthPayload) => {
      tokenStore.set({ accessToken: payload.accessToken, refreshToken: payload.refreshToken })
      setUser(payload.user)
      setEndedReason(null)
      queryClient.clear() // never show the previous account's cached data
      return payload.user
    },
    [queryClient],
  )

  const login = useCallback(
    async (email: string, password: string) => adopt(await authApi.login(email, password)),
    [adopt],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => adopt(await authApi.register(name, email, password)),
    [adopt],
  )

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh()
    if (refreshToken) {
      // Best-effort revoke; a failure here must not trap the user signed in.
      await authApi.logout(refreshToken).catch((error: unknown) => {
        if (!(error instanceof ApiError)) throw error
      })
    }
    tokenStore.clear()
    setUser(null)
    setEndedReason(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo<AuthState>(
    () => ({
      user,
      booting,
      endedReason,
      login,
      register,
      logout,
      setUser,
      clearEndedReason: () => setEndedReason(null),
    }),
    [user, booting, endedReason, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
