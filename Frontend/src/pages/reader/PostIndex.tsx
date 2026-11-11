import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { postsApi, type PostQuery } from '@/api/posts'
import { categoriesApi, tagsApi } from '@/api/taxonomy'
import { useAuth } from '@/context/auth-context'
import { useDebounced } from '@/lib/useDebounced'
import { SearchInput } from '@/components/ui/Field'
import { Chip } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { LinkButton } from '@/components/ui/Button'
import {
  PostFeature,
  PostFeatureSkeleton,
  PostRow,
  PostRows,
  PostRowsSkeleton,
  PostSpot,
} from '@/components/reader/PostCard'
import styles from './Reader.module.css'

interface PostIndexProps {
  /** Filters this page pins — an archive can't change its own category. */
  fixed?: Pick<PostQuery, 'category' | 'tag' | 'author'>
  /** Show the category/tag chip rows and the search box. */
  showFilters?: boolean
  /** Promote the first results on page 1 to a cover story and a spotlight pair. */
  showHero?: boolean
  masthead: ReactNode
  emptyTitle?: string
  emptyBody?: string
}

const PAGE_SIZE = 5

export function PostIndex({
  fixed = {},
  showFilters = false,
  showHero = false,
  masthead,
  emptyTitle = 'Nothing published here yet.',
  emptyBody,
}: PostIndexProps) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()

  const page = Math.max(1, Number(params.get('page')) || 1)
  const category = fixed.category ?? params.get('category') ?? ''
  const tag = fixed.tag ?? params.get('tag') ?? ''
  const urlQuery = params.get('q') ?? ''

  const [searchDraft, setSearchDraft] = useState(urlQuery)
  const search = useDebounced(searchDraft.trim())

  // Keep the debounced search in the URL so results stay shareable/bookmarkable.
  useEffect(() => {
    if (search === urlQuery) return
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (search) next.set('q', search)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [search, urlQuery, setParams])

  const query: PostQuery = {
    page,
    limit: PAGE_SIZE,
    status: 'published', // the Reader shows finished work only
    ...(category && { category }),
    ...(tag && { tag }),
    ...(fixed.author && { author: fixed.author }),
    ...(search && { q: search }),
  }

  const posts = useQuery({
    queryKey: ['posts', 'reader', query, Boolean(user)],
    queryFn: ({ signal }) => postsApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

  const taxonomy = useQuery({
    queryKey: ['taxonomy', 'reader'],
    queryFn: async ({ signal }) => {
      const [categories, tags] = await Promise.all([
        categoriesApi.list({ limit: 24 }, signal),
        tagsApi.list({ limit: 24 }, signal),
      ])
      return { categories: categories.items, tags: tags.items }
    },
    enabled: showFilters,
    staleTime: 5 * 60 * 1000,
  })

  function setParam(key: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page') // a new filter always starts at page 1
      return next
    })
  }

  function goToPage(nextPage: number) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      return next
    })
    // No jump to the top: the pager swaps the list in place and scrolls back
    // to the index once the new page has landed.
  }

  const items = posts.data?.items ?? []
  // Lay out for the page that is actually on screen, not the one requested —
  // otherwise the cover story vanishes before page 2 has even arrived.
  const shownPage = posts.data?.meta.page ?? page
  const heroPost = showHero && shownPage === 1 && !search ? items[0] : undefined
  // The topics ribbon belongs to the unfiltered front page only.
  const featured = Boolean(heroPost) && !category && !tag
  // The offset pair only when there's enough left to still fill an index.
  const spotPosts = heroPost && items.length >= 5 ? items.slice(1, 3) : []
  // The index lists every post on the page — including the ones featured above
  // it — so its rows always match the pager's "1–5 of 5".
  const listPosts = items
  const firstNumber = (shownPage - 1) * PAGE_SIZE + 1
  const categories = taxonomy.data?.categories ?? []

  return (
    <div className={styles.container}>
      {masthead}

      <section className={`${styles.section} ${styles.bottom}`}>
        {posts.isPending
          ? showHero && <PostFeatureSkeleton />
          : !posts.isError && (
              <>
                {heroPost && <PostFeature post={heroPost} />}

                {/* Topics, as a slow ribbon. Each one filters the index. */}
                {featured && categories.length > 0 && (
                  <div className={styles.marqueeBand}>
                    <div className={styles.marquee}>
                      {[0, 1].map((copy) => (
                        <div key={copy} className={styles.marqueeSet} aria-hidden={copy === 1 || undefined}>
                          {categories.map((term, index) => (
                            <Link
                              key={term._id}
                              to={`/category/${term.slug}`}
                              className={`${styles.marqueeItem} ${index % 2 ? 'wonk' : ''}`}
                              tabIndex={copy === 1 ? -1 : undefined}
                            >
                              {term.name}
                              <span className={styles.marqueeSlash} aria-hidden="true">
                                /
                              </span>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {spotPosts.length === 2 && (
                  <div className={styles.pair}>
                    <div className={styles.pairLead}>
                      <PostSpot post={spotPosts[0]} />
                    </div>
                    <div className={styles.pairSide}>
                      <PostSpot post={spotPosts[1]} tall note="worth your evening ↓" />
                    </div>
                  </div>
                )}

                {heroPost?.excerpt && spotPosts.length === 2 && (
                  <figure className={styles.quoteBand}>
                    <span className={styles.quoteMark} aria-hidden="true">
                      “
                    </span>
                    <blockquote className={styles.quote} data-reveal>
                      {heroPost.excerpt}
                    </blockquote>
                    <figcaption className={styles.quoteBy} data-reveal style={{ '--i': 2 } as CSSProperties}>
                      — From <Link to={`/posts/${heroPost.slug}`}>“{heroPost.title}”</Link>, {heroPost.author?.name ?? 'Unknown'}
                    </figcaption>
                  </figure>
                )}
              </>
            )}

        {/* The paged region: the pager dims and scrolls back to this block. */}
        <div className={styles.paged}>
        <div className={styles.indexHead} id="index">
          <h2 className={styles.indexTitle}>
            {search ? (
              <>
                Results for <span className="wonk">“{search}”</span>
              </>
            ) : (
              <>
                The <span className="wonk">index</span>
              </>
            )}
            {posts.data && <sup className={styles.indexCount}>({posts.data.meta.total})</sup>}
          </h2>

          {showFilters && (
            <div className={styles.search}>
              <SearchInput
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search the archive"
                aria-label="Search posts"
              />
            </div>
          )}
        </div>

        {showFilters && taxonomy.data && (taxonomy.data.categories.length > 0 || taxonomy.data.tags.length > 0) && (
          <div className={styles.filters}>
            {taxonomy.data.categories.length > 0 && (
              <div className={styles.chipRow}>
                <span className={styles.chipRowLabel}>Categories</span>
                <Chip selected={!category} onClick={() => setParam('category', '')}>
                  All
                </Chip>
                {taxonomy.data.categories.map((term) => (
                  <Chip
                    key={term._id}
                    selected={category === term.slug}
                    onClick={() => setParam('category', category === term.slug ? '' : term.slug)}
                  >
                    {term.name}
                  </Chip>
                ))}
              </div>
            )}

            {taxonomy.data.tags.length > 0 && (
              <div className={styles.chipRow}>
                <span className={styles.chipRowLabel}>Tags</span>
                {taxonomy.data.tags.map((term) => (
                  <Chip
                    key={term._id}
                    selected={tag === term.slug}
                    onClick={() => setParam('tag', tag === term.slug ? '' : term.slug)}
                  >
                    #{term.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}

        {posts.isPending ? (
          <PostRowsSkeleton count={6} />
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
        ) : (
          <>
            {items.length === 0 ? (
              <EmptyState
                icon="flame"
                title={search ? `No posts match “${search}”.` : emptyTitle}
                body={search ? 'Try another term.' : emptyBody}
                action={
                  search ? undefined : user ? (
                    <LinkButton to="/workshop/posts/new" variant="primary">
                      New post
                    </LinkButton>
                  ) : undefined
                }
              />
            ) : (
              listPosts.length > 0 && (
                <PostRows>
                  {listPosts.map((post, index) => (
                    <PostRow key={post._id} post={post} number={firstNumber + index} />
                  ))}
                </PostRows>
              )
            )}

            {posts.data && <Pagination meta={posts.data.meta} onPageChange={goToPage} noun="post" busy={posts.isPlaceholderData} />}
          </>
        )}
        </div>
      </section>
    </div>
  )
}
