import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Icon } from '@/components/ui/Icon'
import styles from './Auth.module.css'

interface AuthShellProps {
  eyebrow: string
  title: string
  lede?: string
  children: ReactNode
  aside?: ReactNode
}

export function AuthShell({ eyebrow, title, lede, children, aside }: AuthShellProps) {
  return (
    <main className={styles.page} id="main">
      <div className={styles.brand}>
        <Logo size={32} />
      </div>

      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {children}
      </div>

      {aside}

      <Link to="/" className={styles.back}>
        <Icon name="arrowLeft" size={16} />
        Back to the blog
      </Link>
    </main>
  )
}

export function Banner({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  return (
    <p
      className={`${styles.banner} ${tone === 'info' ? styles.bannerInfo : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={tone === 'error' ? 'alert' : 'info'} size={16} className={styles.bannerIcon} />
      <span>{children}</span>
    </p>
  )
}
