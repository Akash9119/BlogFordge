import { useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '@/lib/types'
import { formatCount, formatDate, formatReadingTime } from '@/lib/format'
import { Kicker } from '@/components/ui/Chip'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import styles from './PostCard.module.css'

/*
 * Three ways to show a post in the Reader, from loudest to quietest:
 *   PostFeature — the cover story (big image, title beside it)
 *   PostSpot    — an image-led story in the offset pair
 *   PostRow     — a numbered line in the index, with a photo that opens on hover
 */

const dateOf = (post: Post) => formatDate(post.publishedAt ?? post.createdAt)

/**
 * The cover photo, or — when a post has none, or its URL fails to load (a
 * deleted Cloudinary asset, a stale link) — a typographic stand-in.
 */
export function CoverArt({ post, eager }: { post: Post; eager?: boolean }) {
  // Remember which URL failed, so a reused instance showing another post retries.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (post.coverImage && failedSrc !== post.coverImage) {
    return (
      <img
        className={styles.photo}
        src={post.coverImage}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailedSrc(post.coverImage)}
      />
    )
  }
  return (
    <div className={styles.fallback} aria-hidden="true">
      <span className={styles.fallbackLetter}>{post.title.trim().charAt(0) || 'B'}</span>
    </div>
  )
}

export function PostFeature({ post }: { post: Post }) {
  const category = post.categories?.[0]
  return (
    <article className={styles.feature}>
      <Link to={`/posts/${post.slug}`} className={styles.featureMedia} tabIndex={-1} aria-hidden="true">
        <div className={styles.featureFrame} data-reveal="wipe">
          <CoverArt post={post} eager />
        </div>
        <svg className={styles.badgeSpin} viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <path id="read-circle" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0" />
          </defs>
          <circle cx="100" cy="100" r="98" className={styles.badgeDisc} />
          <text className={styles.badgeText}>
            <textPath href="#read-circle">Read the story · Read the story ·</textPath>
          </text>
          <path d="M84 116 L116 84 M92 84 H116 V108" className={styles.badgeArrow} />
        </svg>
      </Link>

      <div className={styles.featureText}>
        <span className={styles.caption} data-reveal style={{ '--i': 1 } as CSSProperties}>
          Cover story{category ? ` · ${category.name}` : ''}
        </span>
        <div className={styles.featureBody} data-reveal style={{ '--i': 2 } as CSSProperties}>
          {category && <Kicker to={`/category/${category.slug}`}>{category.name}</Kicker>}
          <h2 className={styles.featureTitle}>
            <Link to={`/posts/${post.slug}`} className={styles.titleLink}>
              {post.title}
            </Link>
          </h2>
          {post.excerpt && <p className={styles.featureExcerpt}>{post.excerpt}</p>}
          <p className={styles.meta}>
            {post.author?.name ?? 'Unknown'} · {formatReadingTime(post.readingTime)} · {dateOf(post)}
          </p>
        </div>
      </div>
    </article>
  )
}

export function PostSpot({ post, tall, note }: { post: Post; tall?: boolean; note?: string }) {
  const category = post.categories?.[0]
  return (
    <article className={`${styles.spot} ${tall ? styles.spotTall : ''}`} data-reveal>
      {note && <span className={`hand ${styles.spotNote}`}>{note}</span>}
      <Link to={`/posts/${post.slug}`} className={styles.spotLink}>
        <div className={styles.spotMedia}>
          <CoverArt post={post} />
        </div>
        <span className={styles.caption}>
          {category ? `${category.name} · ` : ''}
          {formatReadingTime(post.readingTime)}
        </span>
        <h3 className={styles.spotTitle}>{post.title}</h3>
      </Link>
    </article>
  )
}

export function PostRow({ post, number }: { post: Post; number: number }) {
  const category = post.categories?.[0]
  return (
    <Link to={`/posts/${post.slug}`} className={styles.row} data-reveal>
      <span className={styles.rowNumber}>{String(number).padStart(2, '0')}</span>
      <span className={styles.rowMain}>
        <span className={styles.rowTitle}>{post.title}</span>
        {post.excerpt && <span className={styles.rowExcerpt}>{post.excerpt}</span>}
        {post.status !== 'published' && <StatusBadge status={post.status} />}
      </span>
      <span className={styles.rowCat}>{category?.name ?? '—'}</span>
      <span className={styles.rowMeta}>
        <span>{dateOf(post)}</span>
        <span>{formatCount(post.viewCount)} reads</span>
      </span>
      {/* Decorative: the cover peeks out on hover (desktop only). */}
      <span className={styles.peek} aria-hidden="true">
        <CoverArt post={post} />
      </span>
    </Link>
  )
}

export function PostRows({ children }: { children: ReactNode }) {
  return <div className={styles.rows}>{children}</div>
}

/** Skeletons reserve the same footprint as the real thing — no shift. */
export function PostFeatureSkeleton() {
  return (
    <div className={styles.feature}>
      <div className={styles.featureMedia}>
        <Skeleton height="100%" radius="0" />
      </div>
      <div className={styles.featureText}>
        <Skeleton width={160} height={12} />
        <div className={styles.featureBody}>
          <Skeleton width="90%" height={40} />
          <Skeleton width="70%" height={40} />
          <Skeleton width="100%" height={16} />
          <Skeleton width="60%" height={16} />
        </div>
      </div>
    </div>
  )
}

export function PostRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <PostRows>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.row}>
          <Skeleton width={24} height={12} />
          <Skeleton width={`${70 - (index % 3) * 12}%`} height={30} />
          <Skeleton width={80} height={12} />
          <Skeleton width={70} height={12} />
        </div>
      ))}
    </PostRows>
  )
}
