import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '@/lib/types'
import { formatCount, formatDate } from '@/lib/format'
import { Byline } from '@/components/ui/Avatar'
import { Kicker } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/States'
import styles from './PostCard.module.css'

interface PostCardProps {
  post: Post
  featured?: boolean
  /** Index in the list — drives the staggered fade-up. */
  index?: number
  /** Authors browsing the Reader see their own drafts; mark them. */
  showStatus?: boolean
}

export function PostCard({ post, featured, index = 0, showStatus }: PostCardProps) {
  const category = post.categories?.[0]

  return (
    <article
      className={`${styles.card} ${featured ? styles.featured : ''} ${styles.stagger}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      {post.coverImage ? (
        <img className={styles.thumb} src={post.coverImage} alt="" loading={featured ? 'eager' : 'lazy'} />
      ) : (
        <div className={styles.thumbFallback} aria-hidden="true">
          <Icon name="flame" size={featured ? 32 : 24} />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.kickerRow}>
          {category ? <Kicker>{category.name}</Kicker> : <span />}
          {showStatus && post.status !== 'published' && <StatusBadge status={post.status} />}
        </div>

        <h3 className={styles.title}>
          <Link to={`/posts/${post.slug}`} className={styles.titleLink}>
            {post.title}
          </Link>
        </h3>

        {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}

        <div className={styles.footer}>
          <Byline name={post.author?.name ?? 'Unknown'} avatar={post.author?.avatar} size={24} />
          <span className={styles.stats}>
            <span className={styles.stat}>{formatDate(post.publishedAt ?? post.createdAt)}</span>
            <span className={styles.stat}>
              <Icon name="eye" size={12} />
              {formatCount(post.viewCount)}
            </span>
          </span>
        </div>
      </div>
    </article>
  )
}

export function PostGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}

/** Card skeletons reserve the same footprint as the real thing — no shift. */
export function PostCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <div className={`${styles.card} ${featured ? styles.featured : ''}`}>
      <Skeleton
        height={featured ? 320 : undefined}
        style={featured ? undefined : { aspectRatio: '16 / 9', height: 'auto' }}
        radius="0"
      />
      <div className={styles.body}>
        <Skeleton width={90} height={12} />
        <Skeleton width="85%" height={featured ? 32 : 22} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="60%" height={14} />
        <div className={styles.footer}>
          <Skeleton width={120} height={24} />
          <Skeleton width={80} height={12} />
        </div>
      </div>
    </div>
  )
}

export function PostGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <PostGrid>
      {Array.from({ length: count }, (_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </PostGrid>
  )
}
