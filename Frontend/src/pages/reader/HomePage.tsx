import type { CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { postsApi } from '@/api/posts'
import { PostIndex } from './PostIndex'
import styles from './Reader.module.css'

const issueDate = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date())

export function HomePage() {
  // The "issue number" is simply how many posts have been published.
  const published = useQuery({
    queryKey: ['posts', 'reader', 'published-count'],
    queryFn: ({ signal }) => postsApi.list({ status: 'published', limit: 1 }, signal),
    staleTime: 5 * 60 * 1000,
  })
  const total = published.data?.meta.total

  return (
    <PostIndex
      showFilters
      showHero
      emptyTitle="Nothing has come off the anvil yet."
      emptyBody="Published posts will appear here as soon as the first one is quenched."
      masthead={
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>
            <span className="line">
              <span>Notes from</span>
            </span>
            <span className="line" style={{ '--i': 1 } as CSSProperties}>
              <span>
                the{' '}
                <span className={styles.circled}>
                  <span className="wonk">workbench</span>
                  <svg className={styles.scribble} viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
                    <path
                      d="M30 96 C 40 30, 220 12, 340 18 S 590 50, 584 104 S 420 172, 280 168 S 18 150, 26 92 S 120 34, 210 30"
                      pathLength={1}
                    />
                  </svg>
                </span>
                .
              </span>
            </span>
          </h1>

          <div className={styles.heroAside}>
            <p className={styles.heroIssue}>
              {total !== undefined && <>Nº {total} — </>}
              {issueDate}
            </p>
            <p className={styles.heroLede}>
              Writing on building software, shaping words, and the slow work in between. Everything here is finished;
              drafts stay on the anvil until they're ready.
            </p>
            <span className={`hand ${styles.heroNote}`}>— the editors</span>
          </div>
        </header>
      }
    />
  )
}
