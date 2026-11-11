import { useTheme } from '@/lib/theme'

/** "( Lights off )" — a text switch, in keeping with the editorial chrome. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={className}
      style={{
        minHeight: 44,
        padding: '0 var(--space-1)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-label)',
        letterSpacing: '0.04em',
        color: 'var(--anvil)',
        whiteSpace: 'nowrap',
      }}
    >
      ( {dark ? 'Lights on' : 'Lights off'} )
    </button>
  )
}
