import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '@/api/comments'
import { postsApi } from '@/api/posts'
import { formatRelative } from '@/lib/format'
import type { Comment, CommentStatus, Post } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { CommentStatusBadge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { BareSelect } from '@/components/ui/Field'
import { Segmented, Toolbar, ToolbarSpacer } from '@/components/ui/Panel'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import styles from './Moderation.module.css'

/**
 * The API exposes comments per post (`GET /posts/:postId/comments`) — there is
 * no global feed. To still offer a real queue we fan out across the most
 * recent posts and merge the results. The fan-out is bounded and cached so it
 * stays well inside the API's 300-requests-per-15-minutes budget.
 */
const SCAN_LIMIT = 12

interface QueueEntry {
  post: Pick<Post, '_id' | 'title' | 'slug'>
  comments: Comment[]
}

const STATUS_OPTIONS: Array<{ value: CommentStatus | 'all'; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

export function CommentsModerationPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<CommentStatus | 'all'>('pending')
  const [postFilter, setPostFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null)

  const posts = useQuery({
    queryKey: ['posts', 'moderation-scope'],
    queryFn: ({ signal }) => postsApi.list({ limit: SCAN_LIMIT, sort: '-createdAt' }, signal),
    staleTime: 5 * 60 * 1000,
  })

  const scopedPosts = posts.data?.items.filter((post) => !postFilter || post._id === postFilter) ?? []

  const queue = useQuery({
    queryKey: ['comments', 'queue', status, postFilter, scopedPosts.map((post) => post._id)],
    enabled: scopedPosts.length > 0,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      const results = await Promise.all(
        scopedPosts.map(async (post) => {
          const page = await commentsApi.list(
            post._id,
            { status: status === 'all' ? '' : status, limit: 100 },
            signal,
          )
          return { post, comments: page.items } satisfies QueueEntry
        }),
      )
      return results.filter((entry) => entry.comments.length > 0)
    },
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['comments'] })
  }

  const moderate = useMutation({
    mutationFn: ({ comment, next }: { comment: Comment; next: CommentStatus }) =>
      commentsApi.moderate(comment._id, next),
    onSuccess: (updated) => {
      toast.success(updated.status === 'approved' ? 'Comment approved.' : `Comment ${updated.status}.`)
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const remove = useMutation({
    mutationFn: (comment: Comment) => commentsApi.remove(comment._id),
    onSuccess: () => {
      toast.success('Comment deleted.')
      setPendingDelete(null)
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const entries = queue.data ?? []
  const total = entries.reduce((sum, entry) => sum + entry.comments.length, 0)
  const loading = posts.isPending || queue.isPending

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Comments"
        subtitle="Approve, reject, or remove reader comments. Pending comments are invisible to everyone but their author."
      />

      <Toolbar>
        <Segmented label="Filter by status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />

        <BareSelect
          value={postFilter}
          onChange={(event) => setPostFilter(event.target.value)}
          aria-label="Filter by post"
          options={[
            { value: '', label: `All recent posts (${SCAN_LIMIT})` },
            ...(posts.data?.items.map((post) => ({ value: post._id, label: post.title })) ?? []),
          ]}
        />

        <ToolbarSpacer />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => queue.refetch()}
          loading={queue.isFetching}
          icon={<Icon name="filter" size={16} />}
        >
          Refresh
        </Button>
      </Toolbar>

      {!postFilter && (
        <p className={styles.scanNote}>
          <Icon name="info" size={16} />
          Showing comments on the {SCAN_LIMIT} most recent posts. Pick a post above to see its full history.
        </p>
      )}

      {posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
      ) : queue.isError ? (
        <ErrorState error={queue.error} onRetry={() => queue.refetch()} />
      ) : loading ? (
        <div className={styles.queue}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} height={160} radius="var(--radius-card)" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          icon="comment"
          title={status === 'pending' ? "Queue's clear. Nothing waiting to be worked." : 'No comments here.'}
          body={
            status === 'pending'
              ? 'New comments from readers land here for review before they go live.'
              : 'Try another status filter.'
          }
        />
      ) : (
        <div className={styles.queue}>
          {entries.map((entry) => (
            <section key={entry.post._id} className={styles.group}>
              <header className={styles.groupHead}>
                <Link to={`/posts/${entry.post.slug}`} className={styles.groupTitle}>
                  {entry.post.title}
                </Link>
                <span className={styles.groupCount}>
                  {entry.comments.length} {entry.comments.length === 1 ? 'comment' : 'comments'}
                </span>
              </header>

              {entry.comments.map((comment) => {
                const parent = comment.parent
                  ? entry.comments.find((other) => other._id === comment.parent)
                  : undefined

                return (
                  <article key={comment._id} className={styles.item}>
                    <Avatar name={comment.author?.name ?? 'Unknown'} src={comment.author?.avatar} size={32} />

                    <div className={styles.itemBody}>
                      <header className={styles.itemHead}>
                        <span className={styles.itemAuthor}>{comment.author?.name ?? 'Unknown'}</span>
                        <span className={styles.itemTime}>{formatRelative(comment.createdAt)}</span>
                        <CommentStatusBadge status={comment.status} />
                      </header>

                      {parent && (
                        <p className={styles.replyContext}>
                          <Icon name="comment" size={14} />
                          <span className={styles.replyContextText}>
                            Replying to {parent.author?.name ?? 'a comment'}: “{parent.content}”
                          </span>
                        </p>
                      )}

                      <p className={styles.itemText}>{comment.content}</p>

                      <div className={styles.itemActions}>
                        {comment.status !== 'approved' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => moderate.mutate({ comment, next: 'approved' })}
                            loading={moderate.isPending && moderate.variables?.comment._id === comment._id}
                          >
                            Approve
                          </Button>
                        )}
                        {comment.status !== 'rejected' && (
                          <Button variant="secondary" size="sm" onClick={() => moderate.mutate({ comment, next: 'rejected' })}>
                            Reject
                          </Button>
                        )}
                        {comment.status !== 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => moderate.mutate({ comment, next: 'pending' })}>
                            Send back to pending
                          </Button>
                        )}
                        <Button variant="dangerGhost" size="sm" onClick={() => setPendingDelete(comment)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          ))}
        </div>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title="Delete this comment?"
        description="Rejecting hides a comment; deleting removes it for good."
        confirmLabel="Delete comment"
        loading={remove.isPending}
        consequence="Any replies to it stay on the post and move to the top level."
      />
    </>
  )
}
