import { api, buildQuery, getPaged, type Paged } from '@/lib/api'
import type { Role, User } from '@/lib/types'

export interface UserQuery {
  page?: number
  limit?: number
  sort?: string
  role?: Role | ''
  isActive?: 'true' | 'false' | ''
  q?: string
}

export const usersApi = {
  list: (query: UserQuery = {}, signal?: AbortSignal): Promise<Paged<User>> =>
    getPaged<User>(`/users${buildQuery(query)}`, { signal }),

  get: async (id: string): Promise<User> => (await api.get<User>(`/users/${id}`)).data,

  updateMe: async (input: { name?: string; bio?: string; avatar?: string }): Promise<User> =>
    (await api.patch<{ user: User }>('/users/me', input)).data.user,

  /** Succeeds → every session is revoked, including this one. */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/password', { currentPassword, newPassword }),

  setRole: async (id: string, role: Role): Promise<User> => (await api.patch<User>(`/users/${id}/role`, { role })).data,

  /** Deactivating also kills that user's sessions. */
  setStatus: async (id: string, isActive: boolean): Promise<User> =>
    (await api.patch<User>(`/users/${id}/status`, { isActive })).data,
}
