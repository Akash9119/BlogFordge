import type { Post, User } from './types'

/**
 * RBAC capabilities — design_guide.md §9, mirroring the guards in
 * Backend/src/middleware/auth.js and the ownership checks in the controllers.
 *
 * Render by capability, never by role name scattered through the JSX. The API
 * is the real enforcement boundary; this only decides what the UI offers, so a
 * role is never shown a control it cannot use.
 */

export type Actor = User | null

export const isStaff = (user: Actor): boolean => user?.role === 'admin' || user?.role === 'editor'
export const isAdmin = (user: Actor): boolean => user?.role === 'admin'

function ownsPost(user: Actor, post: Pick<Post, 'author'>): boolean {
  if (!user) return false
  const authorId = typeof post.author === 'string' ? post.author : post.author?._id
  return authorId === user._id
}

export const can = {
  /** Any authenticated writer can start a post — it always begins as a draft. */
  createPost: (user: Actor): boolean => Boolean(user),

  /** Owner or staff. */
  editPost: (user: Actor, post: Pick<Post, 'author'>): boolean => isStaff(user) || ownsPost(user, post),

  /** Authors may delete only their own drafts; staff may delete anything. */
  deletePost: (user: Actor, post: Pick<Post, 'author' | 'status'>): boolean =>
    isStaff(user) || (ownsPost(user, post) && post.status === 'draft'),

  /** The forge moment belongs to editors and admins. */
  publishPost: (user: Actor): boolean => isStaff(user),
  archivePost: (user: Actor): boolean => isStaff(user),

  moderateComments: (user: Actor): boolean => isStaff(user),

  /** Post analytics: staff, or the post's own author. */
  viewPostAnalytics: (user: Actor, post: Pick<Post, 'author'>): boolean => isStaff(user) || ownsPost(user, post),

  /** The overview dashboard is an editor/admin endpoint. */
  viewOverview: (user: Actor): boolean => isStaff(user),

  /** Taxonomy CRUD is editor/admin (see category.routes.js). */
  manageTaxonomy: (user: Actor): boolean => isStaff(user),

  /** Own uploads always; admins may delete anyone's. */
  deleteMedia: (user: Actor, ownerId: string): boolean => isAdmin(user) || user?._id === ownerId,

  manageUsers: (user: Actor): boolean => isAdmin(user),
}

/** Human-readable role descriptions, used in the users admin screen. */
export const ROLE_SUMMARY: Record<string, string> = {
  admin: 'Full access, including member management.',
  editor: 'Publish, archive, and moderate any post or comment.',
  author: 'Write and manage their own drafts.',
}
