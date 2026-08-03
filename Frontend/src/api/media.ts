import { api, buildQuery, getPaged, type Paged } from '@/lib/api'
import type { MediaItem } from '@/lib/types'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // the API rejects anything larger

export const mediaApi = {
  list: (query: { page?: number; limit?: number } = {}, signal?: AbortSignal): Promise<Paged<MediaItem>> =>
    getPaged<MediaItem>(`/media${buildQuery({ limit: 24, ...query })}`, { signal }),

  upload: async (file: File): Promise<MediaItem> => {
    const form = new FormData()
    form.append('file', file) // multipart field name is fixed server-side
    return (await api.post<MediaItem>('/media', form)).data
  },

  remove: (id: string) => api.delete(`/media/${id}`),
}
