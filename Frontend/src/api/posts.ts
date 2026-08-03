import { api, buildQuery, getPaged, request, type Paged } from '@/lib/api'
import type { Post, PostStatus } from '@/lib/types'

export interface PostQuery {
  page?: number
  limit?: number
  sort?: string
  status?: PostStatus | ''
  category?: string
  tag?: string
  /** An author id, or the literal 'me'. */
  author?: string
  q?: string
}

export interface PostInput {
  title: string
  content: string
  excerpt?: string
  coverImage?: string
  categories?: string[]
  tags?: string[]
  seo?: { metaTitle?: string; metaDescription?: string }
}

export const postsApi = {
  list: (query: PostQuery = {}, signal?: AbortSignal): Promise<Paged<Post>> =>
    getPaged<Post>(`/posts${buildQuery(query)}`, { optionalAuth: true, signal }),

  get: async (idOrSlug: string, signal?: AbortSignal): Promise<Post> =>
    (await api.get<Post>(`/posts/${encodeURIComponent(idOrSlug)}`, { signal })).data,

  create: async (input: PostInput): Promise<Post> => (await api.post<Post>('/posts', input)).data,

  update: async (id: string, input: Partial<PostInput>): Promise<Post> =>
    (await api.patch<Post>(`/posts/${id}`, input)).data,

  remove: (id: string) => api.delete(`/posts/${id}`),

  publish: async (id: string): Promise<Post> => (await api.patch<Post>(`/posts/${id}/publish`)).data,

  archive: async (id: string): Promise<Post> => (await api.patch<Post>(`/posts/${id}/archive`)).data,

  /** Fire-and-forget view ping; rate-limited server-side. */
  recordView: (postId: string) =>
    request(`/posts/${postId}/views`, { method: 'POST', optionalAuth: true }).catch(() => undefined),
}
