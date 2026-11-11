import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Icon } from '@/components/ui/Icon'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import styles from './Auth.module.css'

interface AuthShellProps {
  eyebrow: string
  title: string
  lede?: string
  children: ReactNode
  aside?: ReactNode
}

/** "Back to the forge" → "Back to the" + italic "forge". */
function setTitle(title: string) {
  const at = title.lastIndexOf(' ')
  if (at < 0) return <span className="wonk">{title}</span>
  return (
    <>
      {title.slice(0, at)} <span className="wonk">{title.slice(at + 1)}</span>
    </>
  )
}

export function AuthShell({ eyebrow, title, lede, children, aside }: AuthShellProps) {
  return (
    <main className={styles.page} id="main">
      <section className={styles.visual} aria-hidden="true">
        <div className={styles.photo}>
          <img src="/images/auth-cafe.jpg" alt="" />
        </div>
        <div className={styles.visualInner}>
          <span className={styles.visualBrand}>
            Blog<span className="wonk">Forge</span>
          </span>
          <div>
            <p className={styles.visualTitle}>
              <span className="line">
                <span>Every good post</span>
              </span>
              <span className="line" style={{ '--i': 1 } as CSSProperties}>
                <span>
                  starts as <span className={`wonk ${styles.visualAccent}`}>a mess.</span>
                </span>
              </span>
            </p>
            <span className={`hand ${styles.visualNote}`}>ours included. come in.</span>
          </div>
          <span className={styles.visualCredit}>Photo via Unsplash</span>
        </div>
      </section>

      <section className={styles.side}>
        <div className={styles.sideTop}>
          <span className={styles.brand}>
            <Logo size={24} />
          </span>
          <ThemeToggle />
        </div>

        <div className={styles.card}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{setTitle(title)}</h1>
          {lede && <p className={styles.lede}>{lede}</p>}
          {children}
        </div>

        {aside}

        <Link to="/" className={`draw-line ${styles.back}`}>
          <Icon name="arrowLeft" size={14} />
          Back to the blog
        </Link>
      </section>
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
