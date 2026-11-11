import { useCallback, useEffect, useState } from 'react'

/*
 * Light/dark theme. index.html sets data-theme on <html> before first paint
 * (same rules as initialTheme below) so there is no flash; this hook only
 * reads it and flips it.
 */

export type Theme = 'light' | 'dark'

const KEY = 'blogforge.theme'

function stored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null // storage blocked (private mode) — fall back to the OS
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-switching')
    window.setTimeout(() => root.classList.remove('theme-switching'), 600)
  }
  root.dataset.theme = theme
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) ?? stored() ?? systemTheme())

  // Until the reader picks one, follow the OS when it changes.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      if (stored()) return
      const next = systemTheme()
      apply(next, true)
      setTheme(next)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      apply(next, true)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        // not persisted; still switches for this visit
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
