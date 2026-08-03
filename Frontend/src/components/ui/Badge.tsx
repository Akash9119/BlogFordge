import type { CommentStatus, PostStatus, Role } from '@/lib/types'
import styles from './Badge.module.css'

/**
 * ★ The Temperature Lifecycle (§5) — the one element BlogForge is remembered
 * by. Post and comment status is expressed as heat, never as an arbitrary
 * palette of badges. Use this component everywhere status appears.
 */

const POST_LABEL: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

/** Human-readable temperature, for tooltips and screen readers. */
const POST_TEMPERATURE: Record<PostStatus, string> = {
  draft: 'Hot — on the anvil',
  published: 'Quenched — cooled and set',
  archived: 'Cold',
}

export function StatusBadge({
  status,
  igniting,
  className,
}: {
  status: PostStatus
  /** True for the ~180ms of the publish click, before the colour morphs. */
  igniting?: boolean
  className?: string
}) {
  return (
    <span
      className={[styles.badge, styles[status], igniting ? styles.igniting : '', className].filter(Boolean).join(' ')}
      title={POST_TEMPERATURE[status]}
    >
      <span className={styles.dot} aria-hidden="true" />
      {POST_LABEL[status]}
    </span>
  )
}

const COMMENT_LABEL: Record<CommentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
}

export function CommentStatusBadge({ status, className }: { status: CommentStatus; className?: string }) {
  return (
    <span className={[styles.badge, styles[status], className].filter(Boolean).join(' ')}>
      {COMMENT_LABEL[status]}
    </span>
  )
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`${styles.role} ${role === 'admin' ? styles.roleAdmin : ''}`}>{role}</span>
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className={`${styles.badge} ${styles.approved}`}>Active</span>
  ) : (
    <span className={`${styles.role} ${styles.inactive}`}>Deactivated</span>
  )
}
