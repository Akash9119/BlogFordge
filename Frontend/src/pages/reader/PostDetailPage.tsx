import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { useAuth } from '@/context/auth-context'
import { can } from '@/lib/permissions'
import { formatCount, formatDate, formatReadingTime } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { Avatar } from '@/components/ui/Avatar'
import { Chip, Kicker } from '@/components/ui/Chip'
import { Icon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { Prose } from '@/components/reader/Prose'
import { outline } from '@/lib/outline'
import { Comments } from '@/components/reader/Comments'
import styles from './PostDetail.module.css'

export function PostDetailPage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const viewed = useRef<string | null>(null)
  // A cover that fails to load is dropped rather than shown broken.
  const [failedCover, setFailedCover] = useState<string | null>(null)

  const post = useQuery({
    queryKey: ['post', slug],
    queryFn: ({ signal }) => postsApi.get(slug, signal),
    retry: (failureCount, error) => !(error instanceof ApiError && error.status === 404) && failureCount < 2,
  })

  const data = post.data

  // Count the read once per post per mount. The endpoint is rate-limited and
  // only accepts published posts, so drafts never inflate their own numbers.
  useEffect(() => {
    if (!data || data.status !== 'published') return
    if (viewed.current === data._id) return
    viewed.current = data._id
    void postsApi.recordView(data._id)
  }, [data])

  useEffect(() => {
    if (data) document.title = `${data.title} — BlogForge`
    return () => {
      document.title = 'BlogForge'
    }
  }, [data])

  if (post.isPending) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.column}>
            <Skeleton width={120} height={12} />
            <Skeleton width="90%" height={44} style={{ marginTop: 'var(--space-4)' }} />
            <Skeleton width="70%" height={44} style={{ marginTop: 'var(--space-2)' }} />
            <Skeleton width="100%" height={64} style={{ marginTop: 'var(--space-5)' }} />
            <Skeleton width="100%" height={1} style={{ marginTop: 'var(--space-6)' }} />
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton
                key={index}
                width={index % 3 === 2 ? '65%' : '100%'}
                height={20}
                style={{ marginTop: 'var(--space-4)' }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (post.isError) {
    const notFound = post.error instanceof ApiError && post.error.status === 404
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.column}>
            {notFound ? (
              <EmptyState
                icon="file"
                title="That post isn't here."
                body="It may have been unpublished, archived, or the link is wrong."
                action={
                  <LinkButton to="/" variant="secondary">
                    Back to the index
                  </LinkButton>
                }
              />
            ) : (
              <ErrorState error={post.error} onRetry={() => post.refetch()} />
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const category = data.categories?.[0]
  const isUnpublished = data.status !== 'published'
  const contents = outline(data.content ?? '')

  return (
    <article className={styles.page}>
      <ReadingProgress />

      <div className={styles.inner}>
        <Link to="/" className={`draw-line ${styles.back}`}>
          <span aria-hidden="true">←</span> Back to the index
        </Link>

        {isUnpublished && (
          <p className={styles.draftNotice}>
            <Icon name={data.status === 'draft' ? 'flame' : 'archive'} size={16} className={styles.draftNoticeIcon} />
            <span>
              {data.status === 'draft'
                ? 'This post is still on the anvil. Only you and the editors can see it.'
                : 'This post is archived. It is no longer listed publicly.'}
              {can.editPost(user, data) && (
                <>
                  {' '}
                  <Link to={`/workshop/posts/${data._id}`} style={{ color: 'inherit', fontWeight: 600 }}>
                    Open in the Workshop
                  </Link>
                  .
                </>
              )}
            </span>
          </p>
        )}

        <header className={styles.header}>
          <div className={styles.metaCol}>
            <StatusBadge status={data.status} />
            {category && <Kicker to={`/category/${category.slug}`}>{category.name}</Kicker>}
            <span className={styles.stat}>{formatDate(data.publishedAt ?? data.createdAt)}</span>
            <span className={styles.stat}>{formatReadingTime(data.readingTime)}</span>
            <span className={styles.stat}>{formatCount(data.viewCount)} reads</span>
          </div>

          <h1 className={styles.title}>
            <span className="line">
              <span>{data.title}</span>
            </span>
          </h1>

          {data.excerpt && <p className={styles.excerpt}>{data.excerpt}</p>}

          <div className={styles.byline}>
            <Avatar name={data.author?.name ?? 'Unknown'} src={data.author?.avatar} size={44} />
            <div className={styles.authorBlock}>
              <span className={styles.wordsBy}>Words by</span>
              <Link to={`/author/${data.author?._id}`} className={`draw-line ${styles.authorName}`}>
                {data.author?.name ?? 'Unknown'}
              </Link>
              {data.author?.role && <span className={styles.authorRole}>{data.author.role}</span>}
            </div>
          </div>
        </header>
      </div>

      {data.coverImage && failedCover !== data.coverImage && (
        <figure className={styles.coverFigure}>
          <div className={styles.cover} data-reveal="wipe">
            <img src={data.coverImage} alt="" onError={() => setFailedCover(data.coverImage)} />
          </div>
        </figure>
      )}

      <div className={styles.inner}>
        <div className={styles.body}>
          <aside className={styles.margin}>
            {contents.length > 1 && (
              <nav className={styles.toc} aria-label="On this page">
                <span className={styles.marginLabel}>Contents</span>
                {contents.map((item, index) => (
                  <a key={`${item.id}-${index}`} href={`#${item.id}`} className={styles.tocLink}>
                    <span className={styles.tocNumber}>{toRoman(index + 1)}.</span>
                    {item.text}
                  </a>
                ))}
              </nav>
            )}
          </aside>

          <div className={styles.column}>
            <Prose content={data.content ?? ''} />

            {(data.categories?.length > 0 || data.tags?.length > 0) && (
              <div className={styles.taxonomy}>
                <span className={styles.taxonomyLabel}>Filed under</span>
                {data.categories?.map((term) => (
                  <Chip key={term._id} to={`/category/${term.slug}`}>
                    {term.name}
                  </Chip>
                ))}
                {data.tags?.map((term) => (
                  <Chip key={term._id} to={`/tag/${term.slug}`}>
                    #{term.name}
                  </Chip>
                ))}
              </div>
            )}

            {/* The API only accepts comments on published posts. */}
            <Comments postId={data._id} canComment={data.status === 'published'} />
          </div>
        </div>
      </div>
    </article>
  )
}

const ROMAN: [number, string][] = [
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
]

/** 1 → "i", 4 → "iv" … numbers the contents like a printed book. */
function toRoman(value: number): string {
  let rest = value
  let out = ''
  for (const [n, glyph] of ROMAN) {
    while (rest >= n) {
      out += glyph
      rest -= n
    }
  }
  return out.toUpperCase()
}

/** A thin ember rule across the top that fills as the article is read. */
function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    function update() {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0
      bar.current?.style.setProperty('--progress', String(progress))
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return <div ref={bar} className={styles.progress} style={{ '--progress': 0 } as CSSProperties} aria-hidden="true" />
}
