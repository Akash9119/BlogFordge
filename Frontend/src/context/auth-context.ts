import { createContext, use } from 'react'
import type { User } from '@/lib/types'

export interface AuthState {
  user: User | null
  /** True until the initial /auth/me settles, so guards don't bounce early. */
  booting: boolean
  /** Set when a session ended involuntarily; the login page explains it. */
  endedReason: string | null
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Replace the cached user after a profile edit. */
  setUser: (user: User) => void
  clearEndedReason: () => void
}

/** Split from AuthContext.tsx so that file only exports components. */
export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
