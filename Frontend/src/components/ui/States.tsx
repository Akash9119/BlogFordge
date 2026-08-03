import type { CSSProperties, ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { Button } from './Button'
import { Icon, type IconName } from './Icon'
import styles from './States.module.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = 16, radius, className, style }: SkeletonProps) {
  return (
    <span
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  )
}

interface EmptyStateProps {
  icon?: IconName
  title: string
  body?: string
  action?: ReactNode
  /** Drop the panel border when it already sits inside a card. */
  inset?: boolean
}

/**
 * Empty screens are invitations, written in the interface's voice — §12.
 * The forge metaphor is allowed here, sparingly.
 */
export function EmptyState({ icon = 'file', title, body, action, inset }: EmptyStateProps) {
  return (
    <div className={[styles.state, inset ? styles.inset : ''].filter(Boolean).join(' ')}>
      <span className={styles.glyph}>
        <Icon name={icon} size={22} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      {body && <p className={styles.body}>{body}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  inset?: boolean
}

/** Errors explain and fix — they don't apologise, and they never leak a 5xx. */
export function ErrorState({ error, onRetry, inset }: ErrorStateProps) {
  const message =
    error instanceof ApiError ? error.message : 'Something failed on our end. Try again.'
  const title = error instanceof ApiError && error.isNetwork ? "Can't reach the server" : 'That request failed'

  return (
    <div className={[styles.state, inset ? styles.inset : ''].filter(Boolean).join(' ')} role="alert">
      <span className={`${styles.glyph} ${styles.glyphDanger}`}>
        <Icon name="alert" size={22} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{message}</p>
      {onRetry && (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  )
}

export function InlineLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className={styles.inlineLoading} role="status">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
