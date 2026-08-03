import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postsApi, type PostQuery } from '@/api/posts'
import { categoriesApi, tagsApi } from '@/api/taxonomy'
import { useAuth } from '@/context/auth-context'
import { can, isStaff } from '@/lib/permissions'
import { useDebounced } from '@/lib/useDebounced'
import { formatCount, formatDate } from '@/lib/format'
import type { Post, PostStatus } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { LinkButton } from '@/components/ui/Button'
import { BareSelect, SearchInput } from '@/components/ui/Field'
import { Segmented, Toolbar, ToolbarSearch } from '@/components/ui/Panel'
import { StatusBadge } from '@/components/ui/Badge'
import { Cell, IconAction, PrimaryCell, RowActions, Table, TableSkeleton } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/toast-context'
import { Icon } from '@/components/ui/Icon'

const STATUS_OPTIONS: Array<{ value: PostStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: '-publishedAt', label: 'Recently published' },
  { value: '-viewCount', label: 'Most viewed' },
  { value: 'title', label: 'Title A–Z' },
]

const PAGE_SIZE = 15

export function PostsListPage() {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const staff = isStaff(user)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const status = (params.get('status') ?? 'all') as PostStatus | 'all'
  const category = params.get('category') ?? ''
  const tag = params.get('tag') ?? ''
  const sort = params.get('sort') ?? '-createdAt'
  // Authors only ever see their own work here; staff can switch.
  const scope = staff ? (params.get('scope') ?? 'all') : 'me'

  const [searchDraft, setSearchDraft] = useState(params.get('q') ?? '')
  const search = useDebounced(searchDraft.trim())

  const [pendingDelete, setPendingDelete] = useState<Post | null>(null)

  const query: PostQuery = {
    page,
    limit: PAGE_SIZE,
    sort,
    ...(status !== 'all' && { status }),
    ...(category && { category }),
    ...(tag && { tag }),
    ...(scope === 'me' && { author: 'me' }),
    ...(search && { q: search }),
  }

  const posts = useQuery({
    queryKey: ['posts', 'workshop', query],
    queryFn: ({ signal }) => postsApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

  const taxonomy = useQuery({
    queryKey: ['taxonomy', 'workshop'],
    queryFn: async ({ signal }) => {
      const [categories, tags] = await Promise.all([
        categoriesApi.list({ limit: 100 }, signal),
        tagsApi.list({ limit: 100 }, signal),
      ])
      return { categories: categories.items, tags: tags.items }
    },
    staleTime: 5 * 60 * 1000,
  })

  /** Changing any filter resets to page 1 — page 42 of the old result set is meaningless. */
  function setParam(key: string, value: string, replace = false) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value && value !== 'all') next.set(key, value)
        else next.delete(key)
        next.delete('page')
        return next
      },
      { replace },
    )
  }

  function goToPage(nextPage: number) {
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('page', String(nextPage))
      return next
    })
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const publish = useMutation({
    mutationFn: (post: Post) => postsApi.publish(post._id),
    onSuccess: () => {
      toast.success('Post published.')
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const archive = useMutation({
    mutationFn: (post: Post) => postsApi.archive(post._id),
    onSuccess: () => {
      toast.success('Post archived.')
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const remove = useMutation({
    mutationFn: (post: Post) => postsApi.remove(post._id),
    onSuccess: () => {
      toast.success('Post deleted.')
      setPendingDelete(null)
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const items = posts.data?.items ?? []
  const filtered = Boolean(search || category || tag || status !== 'all')

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Posts"
        subtitle={
          staff
            ? 'Every post across the site. Publish, archive, or hand work back to its author.'
            : 'Your posts. Drafts stay private until an editor publishes them.'
        }
        actions={
          can.createPost(user) ? (
            <LinkButton to="/workshop/posts/new" variant="primary" icon={<Icon name="plus" size={16} />}>
              New post
            </LinkButton>
          ) : undefined
        }
      />

      <Toolbar>
        <Segmented
          label="Filter by status"
          value={status}
          onChange={(value) => setParam('status', value)}
          options={STATUS_OPTIONS}
        />

        <ToolbarSearch>
          <SearchInput
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value)
              setParam('q', event.target.value.trim(), true)
            }}
            placeholder="Search posts"
            aria-label="Search posts"
          />
        </ToolbarSearch>

        {staff && (
          <BareSelect
            value={scope}
            onChange={(event) => setParam('scope', event.target.value)}
            aria-label="Filter by author"
            options={[
              { value: 'all', label: 'All authors' },
              { value: 'me', label: 'Only mine' },
            ]}
          />
        )}

        <BareSelect
          value={category}
          onChange={(event) => setParam('category', event.target.value)}
          aria-label="Filter by category"
          options={[
            { value: '', label: 'All categories' },
            ...(taxonomy.data?.categories.map((term) => ({ value: term.slug, label: term.name })) ?? []),
          ]}
        />

        <BareSelect
          value={tag}
          onChange={(event) => setParam('tag', event.target.value)}
          aria-label="Filter by tag"
          options={[
            { value: '', label: 'All tags' },
            ...(taxonomy.data?.tags.map((term) => ({ value: term.slug, label: term.name })) ?? []),
          ]}
        />

        <BareSelect
          value={sort}
          onChange={(event) => setParam('sort', event.target.value)}
          aria-label="Sort posts"
          options={SORT_OPTIONS}
        />
      </Toolbar>

      {posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : !posts.isPending && items.length === 0 ? (
        <EmptyState
          icon={filtered ? 'search' : 'flame'}
          title={
            search
              ? `No posts match “${search}”.`
              : filtered
                ? 'No posts match these filters.'
                : 'Nothing on the anvil yet.'
          }
          body={filtered ? 'Try widening the filters.' : 'Forge your first post.'}
          action={
            filtered ? undefined : can.createPost(user) ? (
              <LinkButton to="/workshop/posts/new" variant="primary">
                New post
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                {staff && <th>Author</th>}
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Views</th>
                <th>Updated</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            {posts.isPending ? (
              <TableSkeleton rows={8} columns={staff ? 7 : 6} />
            ) : (
              <tbody>
                {items.map((post) => (
                  <tr key={post._id}>
                    <PrimaryCell title={post.title} meta={`/${post.slug}`} to={`/workshop/posts/${post._id}`} label="Title" />

                    <Cell label="Status">
                      <StatusBadge status={post.status} />
                    </Cell>

                    {staff && <Cell label="Author">{post.author?.name ?? '—'}</Cell>}

                    <Cell label="Category">
                      {post.categories?.length ? post.categories.map((term) => term.name).join(', ') : '—'}
                    </Cell>

                    <Cell label="Views" numeric>
                      {formatCount(post.viewCount)}
                    </Cell>

                    <Cell label="Updated" numeric style={{ textAlign: 'left' }}>
                      {formatDate(post.updatedAt)}
                    </Cell>

                    <Cell label="" actions>
                      <RowActions>
                        {post.status === 'published' && (
                          <IconAction icon="eye" label="View on the blog" to={`/posts/${post.slug}`} />
                        )}
                        {can.editPost(user, post) && (
                          <IconAction icon="edit" label="Edit post" to={`/workshop/posts/${post._id}`} />
                        )}
                        {can.publishPost(user) && post.status !== 'published' && (
                          <IconAction
                            icon="droplet"
                            label="Publish post"
                            onClick={() => publish.mutate(post)}
                            disabled={publish.isPending}
                          />
                        )}
                        {can.archivePost(user) && post.status === 'published' && (
                          <IconAction
                            icon="archive"
                            label="Archive post"
                            onClick={() => archive.mutate(post)}
                            disabled={archive.isPending}
                          />
                        )}
                        {can.deletePost(user, post) && (
                          <IconAction icon="trash" label="Delete post" danger onClick={() => setPendingDelete(post)} />
                        )}
                      </RowActions>
                    </Cell>
                  </tr>
                ))}
              </tbody>
            )}
          </Table>

          {posts.data && <Pagination meta={posts.data.meta} onPageChange={goToPage} noun="post" />}
        </>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title={`Delete “${pendingDelete?.title ?? ''}”?`}
        description="This removes the post permanently."
        confirmLabel="Delete post"
        loading={remove.isPending}
        consequence="Its comments and view history are deleted with it. This can't be undone."
      />

      {/* Authors reach the public archive from here rather than a second nav item. */}
      {!staff && items.length > 0 && (
        <p style={{ marginTop: 'var(--space-5)', fontSize: 'var(--text-small)', color: 'var(--steel)' }}>
          Looking for your public author page?{' '}
          <Link to={`/author/${user?._id}`} style={{ color: 'var(--quench-strong)', fontWeight: 500 }}>
            View it on the blog
          </Link>
          .
        </p>
      )}
    </>
  )
}
