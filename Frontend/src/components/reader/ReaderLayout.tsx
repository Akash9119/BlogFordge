import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Logo } from '@/components/Logo'
import { Button, LinkButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import styles from './ReaderLayout.module.css'

const NAV = [
  { to: '/', label: 'Latest', end: true },
  { to: '/categories', label: 'Categories', end: false },
  { to: '/tags', label: 'Tags', end: false },
]

export function ReaderLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = NAV.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      // Following a link closes the mobile sheet — handled here rather than in
      // an effect on the location, which would be a render-triggered setState.
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
    >
      {item.label}
    </NavLink>
  ))

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Logo />
          <nav className={styles.nav} aria-label="Primary">
            {navLinks}
          </nav>

          <div className={styles.headerActions}>
            {user ? (
              <LinkButton to="/workshop" variant="secondary" size="sm" icon={<Avatar name={user.name} src={user.avatar} size={20} />}>
                Workshop
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton to="/register" variant="primary" size="sm">
                  Start writing
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
        </nav>
      </header>

      <main className={styles.main} id="main">
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerNote}>BlogForge — heated, hammered, quenched</p>
          <div className={styles.footerLinks}>
            <NavLink to="/" className={styles.footerLink}>
              Latest
            </NavLink>
            <NavLink to="/categories" className={styles.footerLink}>
              Categories
            </NavLink>
            <NavLink to="/tags" className={styles.footerLink}>
              Tags
            </NavLink>
            <NavLink to={user ? '/workshop' : '/login'} className={styles.footerLink}>
              {user ? 'Workshop' : 'Sign in'}
            </NavLink>
          </div>
        </div>
      </footer>
    </div>
  )
}
