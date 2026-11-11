import { useEffect, type ReactNode } from 'react'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  /** Rich heading to show instead of `title` (which still names the tab). */
  heading?: ReactNode
  subtitle?: string
  actions?: ReactNode
  /** Defaults to the title — keeps the browser tab honest. */
  documentTitle?: string
}

export function PageHeader({ eyebrow, title, heading, subtitle, actions, documentTitle }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${documentTitle ?? title} — BlogForge`
  }, [title, documentTitle])

  return (
    <header className={styles.header}>
      <div className={styles.text}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <h1 className={styles.title}>
          <span className="line">
            <span>{heading ?? title}</span>
          </span>
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  )
}
