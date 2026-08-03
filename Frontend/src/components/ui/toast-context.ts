import { createContext, use } from 'react'

export interface ToastApi {
  success: (message: string) => void
  /** Non-ApiError values fall back to `fallback` — 5xx text never leaks. */
  error: (error: unknown, fallback?: string) => void
  info: (message: string) => void
}

/** Split from Toast.tsx so that file only exports components (fast refresh). */
export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
