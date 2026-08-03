import { api, buildQuery } from '@/lib/api'
import type { AnalyticsOverview, PostAnalytics } from '@/lib/types'

export interface DateRange {
  from?: string
  to?: string
}

export const analyticsApi = {
  overview: async (range: DateRange = {}, signal?: AbortSignal): Promise<AnalyticsOverview> =>
    (await api.get<AnalyticsOverview>(`/analytics/overview${buildQuery(range)}`, { signal })).data,

  forPost: async (postId: string, range: DateRange = {}, signal?: AbortSignal): Promise<PostAnalytics> =>
    (await api.get<PostAnalytics>(`/analytics/posts/${postId}${buildQuery(range)}`, { signal })).data,
}
