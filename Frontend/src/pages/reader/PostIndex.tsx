import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { PostCard, PostGrid, PostCardSkeleton, PostGridSkeleton } from '@/components/reader/PostCard'
import styles from './Reader.module.css'

interface PostIndexProps {
  /** Filters this page pins — an archive can't change its own category. */
  fixed?: Pick<PostQuery, 'category' | 'tag' | 'author'>
  /** Show the category/tag chip rows and the search box. */
  showFilters?: boolean
  /** Promote the first result on page 1 to a full-width hero. */
  showHero?: boolean
  masthead: ReactNode
  emptyTitle?: string
  emptyBody?: string
}

const PAGE_SIZE = 9

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const items = posts.data?.items ?? []
  const heroPost = showHero && page === 1 && !search ? items[0] : undefined
  const gridPosts = heroPost ? items.slice(1) : items

  return (
    <div className={styles.container}>
      {masthead}

      {showFilters && (
        <>
          <div className={styles.filters}>
            <div className={styles.search}>
              <SearchInput
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search posts"
                aria-label="Search posts"
              />
            </div>
          </div>

          {taxonomy.data && taxonomy.data.categories.length > 0 && (
            <div className={`${styles.chipRow} ${styles.filters}`}>
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

          {taxonomy.data && taxonomy.data.tags.length > 0 && (
            <div className={`${styles.chipRow} ${styles.filters}`}>
              <span className={styles.chipRowLabel}>Tags</span>
              {taxonomy.data.tags.map((term) => (
                <Chip
                  key={term._id}
                  selected={tag === term.slug}
                  onClick={() => setParam('tag', tag === term.slug ? '' : term.slug)}
                >
                  {term.name}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      <section className={`${styles.section} ${styles.bottom}`}>
        {posts.isPending ? (
          <>
            {showHero && <PostCardSkeleton featured />}
            <div style={{ marginTop: showHero ? 'var(--space-5)' : 0 }}>
              <PostGridSkeleton count={6} />
            </div>
          </>
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
        ) : items.length === 0 ? (
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
          <>
            {heroPost && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <PostCard post={heroPost} featured />
              </div>
            )}

            {gridPosts.length > 0 && (
              <>
                {heroPost && (
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>More posts</h2>
                    <span className={styles.resultCount}>{posts.data.meta.total} total</span>
                  </div>
                )}
                <PostGrid>
                  {gridPosts.map((post, index) => (
                    <PostCard key={post._id} post={post} index={index} />
                  ))}
                </PostGrid>
              </>
            )}

            {posts.data && <Pagination meta={posts.data.meta} onPageChange={goToPage} noun="post" />}
          </>
        )}
      </section>
    </div>
  )
}
