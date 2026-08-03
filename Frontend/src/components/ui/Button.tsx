import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost'
type Size = 'sm' | 'md' | 'lg'

interface CommonProps {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

function classes({ variant = 'secondary', size = 'md', block, className }: CommonProps) {
  return [styles.button, styles[variant], styles[size], block ? styles.block : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}

interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {}

/**
 * Labels name their outcome — "Publish post", "Save draft" — never "Submit".
 * While loading the label stays put so the button doesn't resize mid-action.
 */
export function Button({ variant, size, block, loading, icon, children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={classes({ variant, size, block, className })}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

interface LinkButtonProps extends CommonProps {
  to: string
  state?: unknown
  title?: string
  'aria-label'?: string
}

/** Same skin, but it navigates — so it stays a real anchor for a11y. */
export function LinkButton({ to, state, variant, size, block, icon, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link {...rest} to={to} state={state} className={classes({ variant, size, block, className })}>
      {icon}
      {children}
    </Link>
  )
}
