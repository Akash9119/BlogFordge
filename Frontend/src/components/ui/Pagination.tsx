import { useEffect, useRef, useState } from 'react'
import type { Meta } from '@/lib/types'
import { Icon } from './Icon'
import styles from './Pagination.module.css'

/**
 * One shared pager, driven straight off the API's `meta` block (§11).
 * Windows to ~5 numbered pages with first/last anchors.
 */
function pageWindow(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current])
  if (current > 1) pages.add(current - 1)
  if (current < total) pages.add(current + 1)
  if (current <= 3) pages.add(2).add(3).add(4)
  if (current >= total - 2)
    pages
      .add(total - 1)
      .add(total - 2)
      .add(total - 3)

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push('gap')
    out.push(page)
    previous = page
  }
  return out
}

interface PaginationProps {
  meta: Meta
  onPageChange: (page: number) => void
  /** Singular noun for the summary line: "post", "comment", "member". */
  noun?: string
  /** True while the requested page is still loading (the query's `isPlaceholderData`). */
  busy?: boolean
}

/** Room for the sticky header when bringing a list back into view. */
const SCROLL_OFFSET = 112

export function Pagination({ meta, onPageChange, noun = 'item', busy = false }: PaginationProps) {
  const { page, limit, total, totalPages } = meta
  const navRef = useRef<HTMLElement>(null)
  // The page the reader asked for, shown as current while it loads.
  const [requested, setRequested] = useState<number | null>(null)
  const loading = busy && requested !== null && requested !== page

  // Async paging: the list swaps in place. Once the new page has landed, bring
  // the top of the list back into view — but only if the reader is below it.
  useEffect(() => {
    if (requested === null || busy || requested !== page) return
    const list = navRef.current?.parentElement
    if (list) {
      const top = list.getBoundingClientRect().top
      if (top < 0) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: window.scrollY + top - SCROLL_OFFSET, behavior: reduced ? 'auto' : 'smooth' })
      }
    }
    // A completed request: forget it so later re-renders never scroll again.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequested(null)
  }, [requested, busy, page])

  if (total === 0) return null

  function go(target: number) {
    if (target === page || target < 1 || target > totalPages) return
    setRequested(target)
    onPageChange(target)
  }

  const shownPage = loading && requested !== null ? requested : page
  const first = (page - 1) * limit + 1
  const last = Math.min(page * limit, total)
  const plural = total === 1 ? noun : `${noun}s`

  return (
    <nav
      ref={navRef}
      className={styles.pager}
      aria-label="Pagination"
      aria-busy={loading || undefined}
      data-busy={loading || undefined}
    >
      <p className={styles.summary} aria-live="polite">
        {loading
          ? `Loading page ${shownPage}…`
          : `${first === last ? first : `${first}–${last}`} of ${total} ${plural} · Page ${page} of ${Math.max(1, totalPages)}`}
      </p>

      {/* Always shown, so the pager is visible even when everything fits on one page. */}
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.page}
          onClick={() => go(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={16} />
        </button>

        {pageWindow(shownPage, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className={`${styles.page} ${entry === shownPage ? styles.current : ''} ${
                loading && entry === shownPage ? styles.pending : ''
              }`}
              onClick={() => go(entry)}
              aria-current={entry === shownPage ? 'page' : undefined}
              aria-label={`Page ${entry}`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          className={styles.page}
          onClick={() => go(page + 1)}
          disabled={page >= totalPages || loading}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </nav>
  )
}
