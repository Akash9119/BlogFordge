import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi, nestComments, type CommentNode } from '@/api/comments'
import { useAuth } from '@/context/auth-context'
import { isStaff } from '@/lib/permissions'
import { formatRelative } from '@/lib/format'
import { Avatar } from '@/components/ui/Avatar'
import { Button, LinkButton } from '@/components/ui/Button'
import { CommentStatusBadge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import styles from './Comments.module.css'

const MAX_LENGTH = 2000

interface ComposerProps {
  postId: string
  parent?: string | null
  onDone?: () => void
  autoFocus?: boolean
  placeholder?: string
}

function Composer({ postId, parent = null, onDone, autoFocus, placeholder }: ComposerProps) {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = useMutation({
    mutationFn: () => commentsApi.create(postId, content.trim(), parent),
    onSuccess: (envelope) => {
      // The API's own message distinguishes "posted" from "sent for review".
      toast.success(envelope.message)
      setContent('')
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      onDone?.()
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.fieldErrors.content ?? err.message)
      } else throw err
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!content.trim()) {
      setError('Write something first.')
      return
    }
    submit.mutate()
  }

  const staff = isStaff(user)

  return (
    <form className={styles.composer} onSubmit={onSubmit}>
      <textarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value)
          setError(null)
        }}
        maxLength={MAX_LENGTH}
        rows={parent ? 3 : 4}
        autoFocus={autoFocus}
        placeholder={placeholder ?? 'Add your comment'}
        aria-label={parent ? 'Write a reply' : 'Write a comment'}
        aria-invalid={error ? true : undefined}
        style={{
          width: '100%',
          padding: 'var(--space-3)',
          background: 'var(--surface)',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--filing)'}`,
          borderRadius: 'var(--radius-control)',
          resize: 'vertical',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--text-body-lh)',
        }}
      />

      <div className={styles.composerActions}>
        <p className={styles.composerNote} style={error ? { color: 'var(--danger-strong)' } : undefined}>
          {error ?? (staff ? 'Your comment appears immediately.' : 'Comments are reviewed before they appear.')}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {parent && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" size="sm" loading={submit.isPending}>
            {parent ? 'Post reply' : 'Post comment'}
          </Button>
        </div>
      </div>
    </form>
  )
}

interface CommentItemProps {
  comment: CommentNode
  postId: string
  depth: number
}

function CommentItem({ comment, postId, depth }: CommentItemProps) {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const remove = useMutation({
    mutationFn: () => commentsApi.remove(comment._id),
    onSuccess: () => {
      toast.success('Comment deleted.')
      setConfirmingDelete(false)
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (error: unknown) => toast.error(error),
  })

  const isOwn = user?._id === comment.author?._id
  const canDelete = isOwn || isStaff(user)
  const isPendingOwn = comment.status === 'pending' && isOwn

  return (
    <article className={`${styles.comment} ${isPendingOwn ? styles.pendingOwn : ''}`}>
      <header className={styles.commentHead}>
        <Avatar name={comment.author?.name ?? 'Unknown'} src={comment.author?.avatar} size={28} />
        <span className={styles.commentAuthor}>{comment.author?.name ?? 'Unknown'}</span>
        <span className={styles.commentTime}>{formatRelative(comment.createdAt)}</span>
        {comment.status !== 'approved' && <CommentStatusBadge status={comment.status} />}
      </header>

      <p className={styles.commentBody}>{comment.content}</p>

      {isPendingOwn && (
        <p className={styles.composerNote}>Waiting on a moderator. Only you can see this.</p>
      )}

      <div className={styles.commentActions}>
        {user && depth < 3 && (
          <Button variant="ghost" size="sm" onClick={() => setReplying((open) => !open)}>
            {replying ? 'Cancel' : 'Reply'}
          </Button>
        )}
        {canDelete && (
          <Button variant="dangerGhost" size="sm" onClick={() => setConfirmingDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      {replying && (
        <div className={styles.replyForm}>
          <Composer
            postId={postId}
            parent={comment._id}
            autoFocus
            placeholder={`Reply to ${comment.author?.name ?? 'this comment'}`}
            onDone={() => setReplying(false)}
          />
        </div>
      )}

      {comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map((reply) => (
            <CommentItem key={reply._id} comment={reply} postId={postId} depth={depth + 1} />
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => remove.mutate()}
        title="Delete this comment?"
        confirmLabel="Delete comment"
        loading={remove.isPending}
        // Backend detaches replies rather than cascading — say so plainly.
        consequence={
          comment.replies.length > 0
            ? `Its ${comment.replies.length} ${comment.replies.length === 1 ? 'reply stays' : 'replies stay'} on the post, moved to the top level.`
            : undefined
        }
      />
    </article>
  )
}

export function Comments({ postId, canComment }: { postId: string; canComment: boolean }) {
  const { user } = useAuth()

  const comments = useQuery({
    queryKey: ['comments', postId],
    queryFn: ({ signal }) => commentsApi.list(postId, { limit: 100 }, signal),
  })

  const nested = comments.data ? nestComments(comments.data.items) : []

  return (
    <section className={styles.section} aria-labelledby="comments-heading">
      <header className={styles.head}>
        <h2 className={styles.title} id="comments-heading">
          Comments
        </h2>
        {comments.data && <span className={styles.count}>{comments.data.meta.total} total</span>}
      </header>

      {!canComment ? null : user ? (
        <Composer postId={postId} />
      ) : (
        <div className={styles.signInPrompt}>
          <span>Sign in to join the conversation.</span>
          <LinkButton to="/login" variant="secondary" size="sm">
            Sign in
          </LinkButton>
        </div>
      )}

      {comments.isPending ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className={styles.comment}>
              <Skeleton width={200} height={28} />
              <Skeleton width="100%" height={16} />
              <Skeleton width="70%" height={16} />
            </div>
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState error={comments.error} onRetry={() => comments.refetch()} inset />
      ) : nested.length === 0 ? (
        <EmptyState
          icon="comment"
          title="No comments yet."
          body={canComment ? 'Be the first to say something.' : undefined}
          inset
        />
      ) : (
        <div className={styles.list}>
          {nested.map((comment) => (
            <CommentItem key={comment._id} comment={comment} postId={postId} depth={0} />
          ))}
        </div>
      )}

      {/* A link out for anyone who wants their own space to write. */}
      {!user && (
        <p className={styles.composerNote} style={{ marginTop: 'var(--space-5)' }}>
          Want to publish here?{' '}
          <Link to="/register" style={{ color: 'var(--quench-strong)', fontWeight: 500 }}>
            Create an account
          </Link>
          .
        </p>
      )}
    </section>
  )
}
