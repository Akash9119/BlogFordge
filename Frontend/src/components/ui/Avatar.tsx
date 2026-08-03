import { Link } from 'react-router-dom'
import { initials } from '@/lib/format'
import styles from './Avatar.module.css'

interface AvatarProps {
  name: string
  src?: string
  size?: number
}

/** Falls back to mono initials — no generated cartoon faces. */
export function Avatar({ name, src, size = 32 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
      aria-hidden="true"
    >
      {src ? <img className={styles.image} src={src} alt="" loading="lazy" /> : initials(name)}
    </span>
  )
}

interface BylineProps {
  name: string
  avatar?: string
  to?: string
  size?: number
}

export function Byline({ name, avatar, to, size = 28 }: BylineProps) {
  return (
    <span className={styles.byline}>
      <Avatar name={name} src={avatar} size={size} />
      {to ? (
        <Link to={to} className={styles.bylineName}>
          {name}
        </Link>
      ) : (
        <span className={styles.bylineName}>{name}</span>
      )}
    </span>
  )
}
