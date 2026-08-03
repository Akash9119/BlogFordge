import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '@/lib/api'
import { formatTime } from '@/lib/format'
import { Icon } from './Icon'
import { ToastContext, type ToastApi } from './toast-context'
import styles from './Toast.module.css'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
  at: string
}

const ICON = { success: 'check', error: 'alert', info: 'info' } as const
const DURATION = { success: 4000, info: 5000, error: 7000 }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current.slice(-3), { id, kind, message, at: formatTime() }])
      window.setTimeout(() => dismiss(id), DURATION[kind])
    },
    [dismiss],
  )

  /**
   * Toast copy comes from the API's `message` field wherever there is one —
   * "Post published.", "Draft saved." — so the action keeps its name (§12).
   */
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      info: (message) => push('info', message),
      error: (error, fallback = 'That request failed.') =>
        push('error', error instanceof ApiError ? error.message : fallback),
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.region} role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <output key={toast.id} className={`${styles.toast} ${styles[toast.kind]}`}>
            <Icon name={ICON[toast.kind]} size={16} className={styles.icon} />
            <div className={styles.content}>
              <p className={styles.message}>{toast.message}</p>
              <span className={styles.time}>{toast.at}</span>
            </div>
            <button
              type="button"
              className={styles.dismiss}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </output>
        ))}
      </div>
    </ToastContext>
  )
}
