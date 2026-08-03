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
