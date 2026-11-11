import { useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Logo } from '@/components/Logo'
import { Button, LinkButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useReveal, useSmoothScroll } from '@/lib/motion'
import styles from './ReaderLayout.module.css'

const NAV = [
  { to: '/', label: 'Index', end: true },
  { to: '/categories', label: 'Categories', end: false },
  { to: '/tags', label: 'Tags', end: false },
]

const issueDate = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date())

export function ReaderLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const shellRef = useRef<HTMLDivElement>(null)

  useSmoothScroll()
  useReveal(shellRef)

  const navLinks = NAV.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      // Following a link closes the mobile sheet — handled here rather than in
      // an effect on the location, which would be a render-triggered setState.
      onClick={() => setMenuOpen(false)}
      className={`draw-line ${styles.navLink}`}
    >
      {item.label}
    </NavLink>
  ))

  return (
    <div className={styles.shell} ref={shellRef}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo size={28} />
          <span className={styles.issue}>{issueDate}</span>

          <nav className={styles.nav} aria-label="Primary">
            {navLinks}
          </nav>

          <div className={styles.headerActions}>
            <ThemeToggle className={styles.hideSm} />
            {user ? (
              <LinkButton to="/workshop" variant="secondary" size="sm" icon={<Avatar name={user.name} src={user.avatar} size={20} />}>
                Workshop
              </LinkButton>
            ) : (
              <>
                <NavLink to="/login" className={`draw-line ${styles.navLink} ${styles.hideSm}`}>
                  Sign in
                </NavLink>
                <LinkButton to="/register" variant="primary" size="sm">
                  Start writing <span className="nudge">→</span>
                </LinkButton>
              </>
            )}

            <Button
              className={styles.menuButton}
              variant="ghost"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="reader-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </Button>
          </div>
        </div>

        <nav
          id="reader-mobile-nav"
          className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ''}`}
          aria-label="Primary (mobile)"
        >
          {navLinks}
          {!user && (
            <NavLink to="/login" className={styles.navLink} onClick={() => setMenuOpen(false)}>
              Sign in
            </NavLink>
          )}
          <ThemeToggle />
        </nav>
      </header>

      <main className={styles.main} id="main">
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <p className={`display ${styles.footerLine}`}>
              Written slowly, <span className="wonk">published</span> when it's ready.
            </p>
            <nav className={styles.footerLinks} aria-label="Footer">
              <NavLink to="/" end className={`draw-line ${styles.footerLink}`}>
                Index
              </NavLink>
              <NavLink to="/categories" className={`draw-line ${styles.footerLink}`}>
                Categories
              </NavLink>
              <NavLink to="/tags" className={`draw-line ${styles.footerLink}`}>
                Tags
              </NavLink>
              <NavLink to={user ? '/workshop' : '/login'} className={`draw-line ${styles.footerLink}`}>
                {user ? 'Workshop' : 'Sign in'}
              </NavLink>
            </nav>
          </div>
          <div className={styles.colophon}>
            <span>Set in Fraunces, Geist &amp; JetBrains Mono.</span>
            <span>© {new Date().getFullYear()} BlogForge — heated, hammered, quenched.</span>
          </div>
        </div>
        <div className={styles.wordmark} aria-hidden="true">
          Blog<span className="wonk">Forge</span>
        </div>
      </footer>
    </div>
  )
}
