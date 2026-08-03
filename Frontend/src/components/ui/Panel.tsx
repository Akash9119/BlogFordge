import type { ReactNode } from 'react'
import styles from './Panel.module.css'

interface PanelProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  /** Remove body padding — for a table that should meet the panel edge. */
  flush?: boolean
  className?: string
}

export function Panel({ title, subtitle, action, children, flush, className }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      {(title || action) && (
        <header className={styles.header}>
          <div className={styles.headerText}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={[styles.body, flush ? styles.flush : ''].filter(Boolean).join(' ')}>{children}</div>
    </section>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className={styles.toolbar}>{children}</div>
}

export function ToolbarSearch({ children }: { children: ReactNode }) {
  return <div className={styles.toolbarSearch}>{children}</div>
}

export function ToolbarSpacer() {
  return <span className={styles.toolbarSpacer} />
}

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; count?: number }>
  label: string
}

/** Status filter strip. Generic so posts, comments, and users all reuse it. */
export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  return (
    <div className={styles.segments} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.segment} ${option.value === value ? styles.segmentActive : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
        >
          {option.label}
          {option.count !== undefined && <span className={styles.segmentCount}>{option.count}</span>}
        </button>
      ))}
    </div>
  )
}
