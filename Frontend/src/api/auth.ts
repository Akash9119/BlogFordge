import { api } from '@/lib/api'
import type { AuthPayload, TokenPair, User } from '@/lib/types'

export const authApi = {
  login: async (email: string, password: string): Promise<AuthPayload> =>
    (await api.post<AuthPayload>('/auth/login', { email, password }, { anonymous: true })).data,

  /** Public sign-up always creates an `author` — there is no role selector. */
  register: async (name: string, email: string, password: string): Promise<AuthPayload> =>
    (await api.post<AuthPayload>('/auth/register', { name, email, password }, { anonymous: true })).data,

  me: async (): Promise<User> => (await api.get<{ user: User }>('/auth/me')).data.user,

  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }, { anonymous: true }),

  refresh: async (refreshToken: string): Promise<TokenPair> =>
    (await api.post<TokenPair>('/auth/refresh', { refreshToken }, { anonymous: true })).data,
}
