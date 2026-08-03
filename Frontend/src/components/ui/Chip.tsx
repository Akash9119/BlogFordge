import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import styles from './Chip.module.css'

interface ChipProps {
  children: ReactNode
  to?: string
  selected?: boolean
  onClick?: () => void
  /** Renders an inline remove control — used by the editor's taxonomy pickers. */
  onRemove?: () => void
  removeLabel?: string
  className?: string
}

export function Chip({ children, to, selected, onClick, onRemove, removeLabel, className }: ChipProps) {
  const cls = [styles.chip, selected ? styles.selected : '', className].filter(Boolean).join(' ')

  if (onRemove) {
    return (
      <span className={cls}>
        {children}
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={removeLabel ?? 'Remove'}>
          <Icon name="close" size={12} />
        </button>
      </span>
    )
  }

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} aria-pressed={selected}>
        {children}
      </button>
    )
  }

  return <span className={cls}>{children}</span>
}

/** The mono category eyebrow that sits above a post title. */
export function Kicker({ children, to }: { children: ReactNode; to?: string }) {
  return to ? (
    <Link to={to} className={styles.kicker}>
      {children}
    </Link>
  ) : (
    <span className={styles.kicker}>{children}</span>
  )
}
