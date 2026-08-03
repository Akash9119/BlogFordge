import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { can, isAdmin } from '@/lib/permissions'
import { Logo, LogoMark } from '@/components/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { Button, LinkButton } from '@/components/ui/Button'
import { Icon, type IconName } from '@/components/ui/Icon'
import { RoleBadge } from '@/components/ui/Badge'
import { InlineLoading } from '@/components/ui/States'
import styles from './WorkshopLayout.module.css'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
  /** Hidden entirely when false — never a disabled control (§9). */
  visible: boolean
}

const COLLAPSE_KEY = 'blogforge.sidebarCollapsed'

export function WorkshopLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Dismiss the user menu on an outside click or ESC.
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const primary: NavItem[] = [
    { to: '/workshop', label: 'Overview', icon: 'gauge', end: true, visible: can.viewOverview(user) },
    { to: '/workshop/posts', label: 'Posts', icon: 'file', visible: true },
    { to: '/workshop/comments', label: 'Comments', icon: 'comment', visible: can.moderateComments(user) },
    { to: '/workshop/media', label: 'Media', icon: 'image', visible: true },
  ]

  const manage: NavItem[] = [
    { to: '/workshop/taxonomy', label: 'Categories & tags', icon: 'tag', visible: can.manageTaxonomy(user) },
    { to: '/workshop/analytics', label: 'Analytics', icon: 'chart', visible: can.viewOverview(user) },
    { to: '/workshop/reports', label: 'AI Reports', icon: 'spark', visible: true },
    { to: '/workshop/users', label: 'Members', icon: 'users', visible: isAdmin(user) },
  ]

  function renderNav(items: NavItem[]) {
    return items
      .filter((item) => item.visible)
      .map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          // Following a link closes the mobile drawer — done here rather than
          // in a location effect, which would be a render-triggered setState.
          onClick={() => setDrawerOpen(false)}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          title={collapsed ? item.label : undefined}
        >
          <Icon name={item.icon} size={18} />
          <span className={styles.navLabel}>{item.label}</span>
        </NavLink>
      ))
  }

  async function onSignOut() {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      <a className="skip-link" href="#workshop-main">
        Skip to content
      </a>

      <div
        className={`${styles.scrim} ${drawerOpen ? styles.scrimOpen : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className={`${styles.sidebar} ${drawerOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHead}>
          {collapsed ? (
            <LogoMark size={24} tone="dark" />
          ) : (
            <Logo tone="dark" size={24} to="/workshop" />
          )}
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
          </button>
        </div>

        <nav className={styles.nav} aria-label="Workshop">
          {renderNav(primary)}
          <span className={styles.navGroupLabel}>Manage</span>
          {renderNav(manage)}
        </nav>

        <div className={styles.sidebarFoot}>
          <NavLink to="/" className={styles.navItem} title={collapsed ? 'View the blog' : undefined}>
            <Icon name="arrowUpRight" size={18} />
            <span className={styles.navLabel}>View the blog</span>
          </NavLink>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.drawerButton}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={20} />
          </button>

          <span className={styles.topbarSpacer} />

          <div className={styles.topbarActions}>
            {can.createPost(user) && (
              <LinkButton to="/workshop/posts/new" variant="primary" size="sm" icon={<Icon name="plus" size={16} />}>
                New post
              </LinkButton>
            )}

            <div className={styles.userMenu} ref={menuRef}>
              <button
                type="button"
                className={styles.userButton}
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <Avatar name={user?.name ?? '?'} src={user?.avatar} size={28} />
                <span className={styles.userName}>{user?.name}</span>
                <Icon name="chevronDown" size={14} />
              </button>

              {menuOpen && (
                <div className={styles.menu} role="menu">
                  <div className={styles.menuHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <strong style={{ fontSize: 'var(--text-small)' }}>{user?.name}</strong>
                      {user && <RoleBadge role={user.role} />}
                    </div>
                    <span className={styles.menuEmail}>{user?.email}</span>
                  </div>

                  <NavLink to="/workshop/account" className={styles.menuItem} role="menuitem">
                    <Icon name="settings" size={16} />
                    Account settings
                  </NavLink>
                  <NavLink to="/" className={styles.menuItem} role="menuitem">
                    <Icon name="arrowUpRight" size={16} />
                    View the blog
                  </NavLink>
                  <Button
                    variant="ghost"
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={onSignOut}
                    role="menuitem"
                  >
                    <Icon name="logout" size={16} />
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={styles.content} id="workshop-main">
          {/* Page chunks suspend here, so the shell never blinks out. */}
          <Suspense fallback={<InlineLoading label="Loading" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
