import type { ReactNode, TdHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import { Skeleton } from './States'
import styles from './Table.module.css'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <div className={styles.scroll}>
        <table className={styles.table}>{children}</table>
      </div>
    </div>
  )
}

interface CellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Becomes the mono label when the row collapses to a card on mobile. */
  label?: string
  numeric?: boolean
  actions?: boolean
}

export function Cell({ label, numeric, actions, className, children, ...rest }: CellProps) {
  return (
    <td
      {...rest}
      data-label={label ?? ''}
      className={[numeric ? styles.numeric : '', actions ? styles.actionsCell : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  )
}

/** Title + a mono sub-line (slug, email, id) — the anchor cell of a row. */
export function PrimaryCell({ title, meta, to, label }: { title: string; meta?: string; to?: string; label?: string }) {
  return (
    <Cell label={label ?? 'Name'}>
      <span className={styles.primary}>
        {to ? (
          <Link to={to} className={styles.primaryTitle}>
            {title}
          </Link>
        ) : (
          <span className={styles.primaryTitle}>{title}</span>
        )}
        {meta && <span className={styles.primaryMeta}>{meta}</span>}
      </span>
    </Cell>
  )
}

export function RowActions({ children }: { children: ReactNode }) {
  return <span className={styles.actions}>{children}</span>
}

interface IconActionProps {
  icon: IconName
  label: string
  onClick?: () => void
  to?: string
  danger?: boolean
  disabled?: boolean
}

export function IconAction({ icon, label, onClick, to, danger, disabled }: IconActionProps) {
  const cls = [styles.iconAction, danger ? styles.iconDanger : ''].filter(Boolean).join(' ')

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label}>
        <Icon name={icon} size={16} />
      </Link>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon name={icon} size={16} />
    </button>
  )
}

/** Row skeletons that reserve the real row height — no layout shift. */
export function TableSkeleton({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              <Skeleton height={column === 0 ? 32 : 16} width={column === 0 ? '70%' : '50%'} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}
