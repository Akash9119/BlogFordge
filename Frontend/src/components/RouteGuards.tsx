import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { isAdmin, isStaff } from '@/lib/permissions'
import { InlineLoading } from '@/components/ui/States'

/** Nothing renders until the stored session has resolved — avoids a flash of login. */
function Booting() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60dvh' }}>
      <InlineLoading label="Restoring your session" />
    </div>
  )
}

export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) return <Booting />
  // Remember where they were headed so login can send them back.
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  return children ? <>{children}</> : <Outlet />
}

/**
 * Guards a route by capability. The matching nav item is hidden too — this is
 * the backstop for a typed URL, not the only line of defence (§9).
 */
export function RequireStaff({ children }: { children?: ReactNode }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) return <Booting />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isStaff(user)) return <Navigate to="/workshop/posts" replace />

  return children ? <>{children}</> : <Outlet />
}

export function RequireAdmin({ children }: { children?: ReactNode }) {
  const { user, booting } = useAuth()
  const location = useLocation()

  if (booting) return <Booting />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin(user)) return <Navigate to="/workshop/posts" replace />

  return children ? <>{children}</> : <Outlet />
}

/** Signed-in users have no business on login/register. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth()

  if (booting) return <Booting />
  if (user) return <Navigate to="/workshop" replace />

  return <>{children}</>
}
