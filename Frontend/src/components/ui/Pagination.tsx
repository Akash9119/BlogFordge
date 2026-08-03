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
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3)

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
}

export function Pagination({ meta, onPageChange, noun = 'item' }: PaginationProps) {
  const { page, limit, total, totalPages } = meta
  if (total === 0) return null

  const first = (page - 1) * limit + 1
  const last = Math.min(page * limit, total)
  const plural = total === 1 ? noun : `${noun}s`

  return (
    <nav className={styles.pager} aria-label="Pagination">
      <p className={styles.summary}>
        {first}–{last} of {total} {plural}
      </p>

      {totalPages > 1 && (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.page}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <Icon name="chevronLeft" size={16} />
          </button>

          {pageWindow(page, totalPages).map((entry, index) =>
            entry === 'gap' ? (
              <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className={`${styles.page} ${entry === page ? styles.current : ''}`}
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                aria-label={`Page ${entry}`}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            className={styles.page}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}
    </nav>
  )
}
