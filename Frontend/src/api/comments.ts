import { api, buildQuery, getPaged, type Paged } from '@/lib/api'
import type { Comment, CommentStatus } from '@/lib/types'

export const commentsApi = {
  /** Anonymous callers get approved only; staff may filter by status. */
  list: (
    postId: string,
    query: { status?: CommentStatus | ''; page?: number; limit?: number } = {},
    signal?: AbortSignal,
  ): Promise<Paged<Comment>> =>
    getPaged<Comment>(`/posts/${postId}/comments${buildQuery(query)}`, { optionalAuth: true, signal }),

  create: async (postId: string, content: string, parent?: string | null) =>
    await api.post<Comment>(`/posts/${postId}/comments`, { content, parent: parent ?? undefined }),

  moderate: async (id: string, status: CommentStatus): Promise<Comment> =>
    (await api.patch<Comment>(`/comments/${id}/moderate`, { status })).data,

  remove: (id: string) => api.delete(`/comments/${id}`),
}

/** The API returns comments flat with `parent` refs — clients nest. */
export interface CommentNode extends Comment {
  replies: CommentNode[]
}

export function nestComments(comments: Comment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>()
  for (const comment of comments) byId.set(comment._id, { ...comment, replies: [] })

  const roots: CommentNode[] = []
  for (const node of byId.values()) {
    // A reply whose parent is filtered out (or was deleted and detached)
    // surfaces at the top level rather than vanishing.
    const parent = node.parent ? byId.get(node.parent) : undefined
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }
  return roots
}
