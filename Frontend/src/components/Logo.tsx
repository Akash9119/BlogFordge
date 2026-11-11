import { Link } from 'react-router-dom'

interface LogoProps {
  /** Kept for API compatibility; the editorial chrome is the same in both. */
  tone?: 'light' | 'dark'
  size?: number
  to?: string
  showWordmark?: boolean
}

/**
 * The mark: a struck anvil face with an ember spark coming off it. Used alone
 * where there is no room for the wordmark (the collapsed sidebar rail).
 */
export function LogoMark({ size = 28 }: { size?: number; tone?: 'light' | 'dark' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="22" height="22" rx="2" stroke="var(--anvil)" strokeWidth="1.5" />
      <path d="M6 14h9a3 3 0 0 0 3-3" stroke="var(--anvil)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 14v4h6" stroke="var(--anvil)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 6.5 12 10h2.5L13 13" stroke="var(--ember)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Wordmark: "Blog" roman, "Forge" in the wonky italic. */
export function Logo({ size = 28, to = '/', showWordmark = true }: LogoProps) {
  const content = showWordmark ? (
    <span className="display" style={{ fontSize: `${Math.round(size * 0.9)}px`, lineHeight: 1, letterSpacing: '-0.03em' }}>
      Blog<span className="wonk">Forge</span>
    </span>
  ) : (
    <LogoMark size={size} />
  )

  const style = { display: 'inline-flex', alignItems: 'center', textDecoration: 'none', color: 'var(--anvil)' } as const

  return to ? (
    <Link to={to} style={style} aria-label="BlogForge home">
      {content}
    </Link>
  ) : (
    <span style={style}>{content}</span>
  )
}
