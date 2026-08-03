import { Link } from 'react-router-dom'

interface LogoProps {
  /** 'dark' inverts for the --anvil sidebar. */
  tone?: 'light' | 'dark'
  size?: number
  to?: string
  showWordmark?: boolean
}

/**
 * The mark: a struck anvil face with an ember spark coming off it. Geometric,
 * no gradient — it has to read at 20px in the sidebar rail.
 */
export function LogoMark({ size = 28, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const body = tone === 'dark' ? 'var(--on-anvil)' : 'var(--anvil)'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="22" height="22" rx="6" stroke={body} strokeWidth="1.5" />
      {/* the anvil face */}
      <path d="M6 14h9a3 3 0 0 0 3-3" stroke={body} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14v4h6" stroke={body} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* the spark — the only ember in the mark */}
      <path d="M14 6.5 12 10h2.5L13 13" stroke="var(--ember)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ tone = 'light', size = 28, to = '/', showWordmark = true }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size} tone={tone} />
      {showWordmark && (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.125rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: tone === 'dark' ? 'var(--on-anvil)' : 'var(--anvil)',
          }}
        >
          BlogForge
        </span>
      )}
    </>
  )

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    textDecoration: 'none',
  } as const

  return to ? (
    <Link to={to} style={style} aria-label="BlogForge home">
      {content}
    </Link>
  ) : (
    <span style={style}>{content}</span>
  )
}
