import { api } from '@/lib/api'
import type { AiAssistTask, AiReport, AiStatus, AiSuggestion, AiTurn } from '@/lib/types'

/**
 * The AI layer — design_guide.md §8 ("Reserved: AI Reports"), now wired.
 *
 * Every call goes to the Node API, never to the FastAPI service: Node is the
 * one auth boundary, and the AI service has no public route. So these requests
 * carry the same JWT, hit the same envelope, and fail the same way as every
 * other resource in this folder.
 */

export interface ReportInput {
  question: string
  /** Prior turns, so a follow-up is answered against the same thread. */
  history?: AiTurn[]
  /** Chunks to retrieve — the service default (6) is right almost always. */
  topK?: number
  /** Days of analytics to consider. */
  days?: number
  includeAnalytics?: boolean
}

export interface AssistInput {
  task: AiAssistTask
  title?: string
  content?: string
  postId?: string
}

export const aiApi = {
  /**
   * Is the feature live, and how much is indexed? Answers even when the AI
   * service is down — the corpus counts come from Mongo — so the screen can
   * explain itself instead of just erroring.
   */
  status: async (signal?: AbortSignal): Promise<AiStatus> =>
    (await api.get<AiStatus>('/ai/status', { signal })).data,

  report: async (input: ReportInput, signal?: AbortSignal): Promise<AiReport> =>
    (await api.post<AiReport>('/ai/reports', input, { signal })).data,

  assist: async (input: AssistInput, signal?: AbortSignal): Promise<AiSuggestion> =>
    (await api.post<AiSuggestion>('/ai/assist', input, { signal })).data,

  /** Rebuilds the corpus from every published post. Admin only. */
  reindex: async (force = false): Promise<{ postsSeen: number; indexed: number; chunksWritten: number }> =>
    (await api.post<{ postsSeen: number; indexed: number; chunksWritten: number }>('/ai/reindex', { force })).data,
}
