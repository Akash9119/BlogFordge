/** Mirrors the Mongoose models in Backend/src/models. */

export type Role = 'admin' | 'editor' | 'author'
export type PostStatus = 'draft' | 'published' | 'archived'
export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface User {
  _id: string
  name: string
  email: string
  role: Role
  bio: string
  avatar: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Posts populate `author` with only these fields (post.controller AUTHOR_FIELDS). */
export interface AuthorRef {
  _id: string
  name: string
  avatar?: string
  role?: Role
}

export interface Term {
  _id: string
  name: string
  slug: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface Post {
  _id: string
  title: string
  slug: string
  /** Absent on list endpoints — the API projects it out with `-content`. */
  content?: string
  excerpt: string
  coverImage: string
  author: AuthorRef
  categories: Term[]
  tags: Term[]
  status: PostStatus
  publishedAt: string | null
  readingTime: number
  viewCount: number
  seo: { metaTitle: string; metaDescription: string }
  createdAt: string
  updatedAt: string
}

export interface Comment {
  _id: string
  post: string
  author: Pick<AuthorRef, '_id' | 'name' | 'avatar'>
  parent: string | null
  content: string
  status: CommentStatus
  createdAt: string
  updatedAt: string
}

export interface MediaItem {
  _id: string
  uploadedBy: { _id: string; name: string } | string
  publicId: string
  url: string
  resourceType: string
  format: string
  bytes: number
  width: number
  height: number
  originalName: string
  createdAt: string
}

export interface DailyViews {
  date: string
  views: number
}

export interface AnalyticsOverview {
  range: { from: string; to: string }
  postsByStatus: Partial<Record<PostStatus, number>>
  totalViews: number
  topPosts: Array<
    Pick<Post, '_id' | 'title' | 'slug' | 'viewCount' | 'publishedAt'> & {
      author: { _id: string; name: string }
    }
  >
  dailyViews: DailyViews[]
}

export interface PostAnalytics {
  post: Pick<Post, '_id' | 'title' | 'slug' | 'status' | 'viewCount' | 'publishedAt'> & {
    author: string
  }
  range: { from: string; to: string }
  daily: DailyViews[]
}

/* ── AI Reports (Phase 3) ────────────────────────────────────────────────
 * Mirrors ai-service/app/schemas.py. The FastAPI service serialises camelCase
 * so these shapes survive the Node proxy unchanged.
 * ──────────────────────────────────────────────────────────────────────── */

/** A published post the answer was drawn from. `chunks` are its cited passages. */
export interface AiSource {
  postId: string
  title: string
  slug: string
  publishedAt: string | null
  /** Cosine similarity in [0, 1]. */
  score: number
  excerpt: string
  chunks: number[]
}

export interface AiReport {
  /** Markdown. Citations appear as [1], [2] and index into `sources`. */
  answer: string
  sources: AiSource[]
  /** False when nothing was retrieved — the answer stands on metrics alone. */
  grounded: boolean
  usedAnalytics: boolean
  retrieval: { strategy: 'atlas' | 'memory' | 'none'; topK: number; chunks: number }
  model: string
  latencyMs: number
}

/** One prior exchange, replayed so a follow-up keeps the thread. */
export interface AiTurn {
  question: string
  answer: string
}

export interface AiStatus {
  available: boolean
  /** Why it isn't available — written to be shown to the user. */
  reason: string | null
  publishedPosts: number
  indexedPosts: number
  indexedChunks: number
  embeddingModel?: string
  chatModel?: string
  vectorIndex?: { available: boolean; status: string; name: string }
  lastIndexedAt?: string | null
}

export type AiAssistTask = 'summary' | 'seo' | 'topics' | 'improve'

export interface AiSuggestion {
  task: AiAssistTask
  summary?: string | null
  excerpt?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  keywords: string[]
  topics: Array<{ title: string; angle: string; whyNow: string }>
  notes: string[]
  sources: AiSource[]
  model: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthPayload extends TokenPair {
  user: User
}

/** The pagination block every listing endpoint returns. */
export interface Meta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface FieldError {
  field: string
  message: string
}
