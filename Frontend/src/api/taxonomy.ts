import { api, buildQuery, getPaged, type Paged } from '@/lib/api'
import type { Term } from '@/lib/types'

export type TaxonomyKind = 'categories' | 'tags'

export interface TermInput {
  name: string
  description?: string
}

/** Categories and tags expose identical CRUD — one client covers both. */
function resource(kind: TaxonomyKind) {
  return {
    list: (query: { page?: number; limit?: number } = {}, signal?: AbortSignal): Promise<Paged<Term>> =>
      getPaged<Term>(`/${kind}${buildQuery({ limit: 100, ...query })}`, { optionalAuth: true, signal }),

    get: async (slug: string): Promise<Term> => (await api.get<Term>(`/${kind}/${slug}`, { optionalAuth: true })).data,

    create: async (input: TermInput): Promise<Term> => (await api.post<Term>(`/${kind}`, input)).data,

    update: async (id: string, input: Partial<TermInput>): Promise<Term> =>
      (await api.patch<Term>(`/${kind}/${id}`, input)).data,

    remove: (id: string) => api.delete(`/${kind}/${id}`),
  }
}

export const categoriesApi = resource('categories')
export const tagsApi = resource('tags')
export const taxonomyApi = { categories: categoriesApi, tags: tagsApi }
