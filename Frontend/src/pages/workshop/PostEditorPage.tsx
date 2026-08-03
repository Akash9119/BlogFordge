import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postsApi, type PostInput } from '@/api/posts'
import { categoriesApi, tagsApi } from '@/api/taxonomy'
import { useAuth } from '@/context/auth-context'
import { can } from '@/lib/permissions'
import { ApiError } from '@/lib/api'
import { useFormErrors } from '@/lib/useFormErrors'
import { formatCount, formatDate, formatDateTime, previewSlug } from '@/lib/format'
import type { Post, Term } from '@/lib/types'
import { Button, LinkButton } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { StatusBadge } from '@/components/ui/Badge'
import { Chip } from '@/components/ui/Chip'
import { Panel, Segmented } from '@/components/ui/Panel'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { ConfirmModal } from '@/components/ui/Modal'
import { ErrorState, InlineLoading } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import { Prose } from '@/components/reader/Prose'
import { MediaPicker } from '@/components/workshop/MediaBrowser'
import styles from './PostEditor.module.css'

const IGNITE_MS = 180

interface Draft {
  title: string
  content: string
  excerpt: string
  coverImage: string
  categories: string[]
  tags: string[]
  metaTitle: string
  metaDescription: string
}

const BLANK: Draft = {
  title: '',
  content: '',
  excerpt: '',
  coverImage: '',
  categories: [],
  tags: [],
  metaTitle: '',
  metaDescription: '',
}

function toDraft(post: Post): Draft {
  return {
    title: post.title,
    content: post.content ?? '',
    excerpt: post.excerpt ?? '',
    coverImage: post.coverImage ?? '',
    categories: post.categories?.map((term) => term._id) ?? [],
    tags: post.tags?.map((term) => term._id) ?? [],
    metaTitle: post.seo?.metaTitle ?? '',
    metaDescription: post.seo?.metaDescription ?? '',
  }
}

function toInput(draft: Draft): PostInput {
  return {
    title: draft.title.trim(),
    content: draft.content,
    excerpt: draft.excerpt.trim(),
    coverImage: draft.coverImage,
    categories: draft.categories,
    tags: draft.tags,
    seo: { metaTitle: draft.metaTitle.trim(), metaDescription: draft.metaDescription.trim() },
  }
}

export function PostEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { errors, capture, reset, clearField } = useFormErrors()

  const [draft, setDraft] = useState<Draft>(BLANK)
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState<'split' | 'write' | 'preview'>('split')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [igniting, setIgniting] = useState(false)
  const igniteTimer = useRef<number | undefined>(undefined)

  const post = useQuery({
    queryKey: ['post', 'edit', id],
    queryFn: ({ signal }) => postsApi.get(id!, signal),
    enabled: !isNew,
  })

  const taxonomy = useQuery({
    queryKey: ['taxonomy', 'editor'],
    queryFn: async ({ signal }) => {
      const [categories, tags] = await Promise.all([
        categoriesApi.list({ limit: 100 }, signal),
        tagsApi.list({ limit: 100 }, signal),
      ])
      return { categories: categories.items, tags: tags.items }
    },
    staleTime: 5 * 60 * 1000,
  })

  // Load the server copy into the form once; later refetches must not stomp
  // on edits in progress.
  const loadedId = useRef<string | null>(null)
  useEffect(() => {
    if (!post.data || loadedId.current === post.data._id) return
    loadedId.current = post.data._id
    setDraft(toDraft(post.data))
    setDirty(false)
  }, [post.data])

  useEffect(() => () => window.clearTimeout(igniteTimer.current), [])

  // Don't let a reload or a stray back-navigation eat unsaved work.
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setDirty(true)
    clearField(key === 'metaTitle' || key === 'metaDescription' ? `seo.${key}` : key)
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['post'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      reset()
      const input = toInput(draft)
      return isNew ? postsApi.create(input) : postsApi.update(post.data!._id, input)
    },
    onSuccess: (saved) => {
      setDirty(false)
      invalidate()
      if (isNew) {
        toast.success('Draft created.')
        // Replace so Back doesn't return to the empty "new post" form.
        navigate(`/workshop/posts/${saved._id}`, { replace: true })
      } else {
        toast.success('Draft saved.')
      }
    },
    onError: (error: unknown) => {
      capture(error)
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        toast.error(null, 'Fix the highlighted fields and try again.')
      } else {
        toast.error(error)
      }
    },
  })

  const publish = useMutation({
    mutationFn: async () => {
      // Never publish a stale body: flush pending edits first.
      if (dirty && post.data) await postsApi.update(post.data._id, toInput(draft))
      return postsApi.publish(post.data!._id)
    },
    onSuccess: () => {
      setDirty(false)
      toast.success('Post published.')
      invalidate()
    },
    onError: (error: unknown) => {
      capture(error)
      toast.error(error)
    },
  })

  const archive = useMutation({
    mutationFn: () => postsApi.archive(post.data!._id),
    onSuccess: () => {
      toast.success('Post archived.')
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const remove = useMutation({
    mutationFn: () => postsApi.remove(post.data!._id),
    onSuccess: () => {
      toast.success('Post deleted.')
      setConfirmDelete(false)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      navigate('/workshop/posts', { replace: true })
    },
    onError: (error: unknown) => toast.error(error),
  })

  /** The forge moment: ignite flash, then the status badge morphs to quench. */
  function onPublish() {
    setIgniting(true)
    igniteTimer.current = window.setTimeout(() => setIgniting(false), IGNITE_MS)
    publish.mutate()
  }

  const wordCount = useMemo(() => draft.content.trim().split(/\s+/).filter(Boolean).length, [draft.content])
  const readingTime = Math.max(1, Math.round(wordCount / 200))
  const slug = previewSlug(draft.title)
  const status = post.data?.status ?? 'draft'
  const busy = save.isPending || publish.isPending || archive.isPending

  if (!isNew && post.isPending) {
    return <InlineLoading label="Loading post" />
  }

  if (!isNew && post.isError) {
    return <ErrorState error={post.error} onRetry={() => post.refetch()} />
  }

  // Ownership is decided by the API; mirror it so we never show a dead control.
  const editable = isNew || (post.data && can.editPost(user, post.data))
  if (!editable) {
    return (
      <ErrorState
        error={new ApiError(403, 'You can only edit your own posts.')}
        onRetry={() => navigate('/workshop/posts')}
      />
    )
  }

  function toggleTerm(field: 'categories' | 'tags', term: Term) {
    const current = draft[field]
    update(field, current.includes(term._id) ? current.filter((value) => value !== term._id) : [...current, term._id])
  }

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.barLeft}>
          <Link to="/workshop/posts" className={styles.back}>
            <Icon name="arrowLeft" size={16} />
            Posts
          </Link>
          <StatusBadge status={status} igniting={igniting} />
          {dirty && <span className={styles.barMeta}>Unsaved changes</span>}
        </div>

        <div className={styles.barActions}>
          {post.data?.status === 'published' && (
            <LinkButton to={`/posts/${post.data.slug}`} variant="ghost" size="sm" icon={<Icon name="eye" size={16} />}>
              View
            </LinkButton>
          )}

          {!isNew && post.data && can.deletePost(user, post.data) && (
            <Button variant="dangerGhost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}

          {!isNew && can.archivePost(user) && status === 'published' && (
            <Button variant="secondary" size="sm" onClick={() => archive.mutate()} loading={archive.isPending}>
              Archive
            </Button>
          )}

          <Button
            variant={can.publishPost(user) && !isNew && status !== 'published' ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={busy && !save.isPending}
          >
            {isNew ? 'Create draft' : 'Save draft'}
          </Button>

          {/* Publish belongs to editors and admins only — §9. */}
          {!isNew && can.publishPost(user) && status !== 'published' && (
            <span className={`${styles.igniteWrap} ${igniting ? styles.igniting : ''}`}>
              <Button variant="primary" size="sm" onClick={onPublish} loading={publish.isPending}>
                Publish post
              </Button>
            </span>
          )}
        </div>
      </div>

      <div className={styles.layout}>
        <div>
          <input
            className={styles.titleInput}
            value={draft.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Post title"
            aria-label="Post title"
            aria-invalid={errors.fields.title ? true : undefined}
            maxLength={200}
          />

          <div className={styles.slugRow}>
            <span>Slug</span>
            <span className={`${styles.slugValue} ${dirty && !isNew ? styles.slugPending : ''}`}>
              /{slug || '—'}
            </span>
            {post.data && slug !== post.data.slug && (
              <span title="The API regenerates the slug when the title changes">· regenerates on save</span>
            )}
          </div>

          {errors.fields.title && (
            <p className={styles.fieldError}>
              <Icon name="alert" size={14} />
              {errors.fields.title}
            </p>
          )}

          <div className={styles.editorHead}>
            <Segmented
              label="Editor view"
              value={view}
              onChange={setView}
              options={[
                { value: 'write', label: 'Write' },
                { value: 'split', label: 'Split' },
                { value: 'preview', label: 'Preview' },
              ]}
            />
            <span className={styles.editorStats}>
              {formatCount(wordCount)} words · {readingTime} min read
            </span>
          </div>

          <div className={`${styles.split} ${view !== 'split' ? styles.splitSingle : ''}`}>
            {view !== 'preview' && (
              <div className={`${styles.pane} ${errors.fields.content ? styles.markdownInvalid : ''}`}>
                <span className={styles.paneLabel}>Markdown</span>
                <textarea
                  className={styles.markdown}
                  value={draft.content}
                  onChange={(event) => update('content', event.target.value)}
                  placeholder={'# Start writing\n\nMarkdown works here — **bold**, _italic_, lists, links, and code.'}
                  aria-label="Post content (Markdown)"
                  aria-invalid={errors.fields.content ? true : undefined}
                  spellCheck
                />
              </div>
            )}

            {view !== 'write' && (
              <div className={styles.pane}>
                <span className={styles.paneLabel}>Preview</span>
                <div className={styles.preview}>
                  {draft.content.trim() ? (
                    <Prose content={draft.content} compact />
                  ) : (
                    <p className={styles.previewEmpty}>Nothing to preview yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {errors.fields.content && (
            <p className={styles.fieldError}>
              <Icon name="alert" size={14} />
              {errors.fields.content}
            </p>
          )}
        </div>

        <aside className={styles.side}>
          <Panel title="Status">
            <div className={styles.statusRow}>
              <StatusBadge status={status} igniting={igniting} />
              {post.data?.publishedAt && (
                <span className={styles.metaRow}>{formatDate(post.data.publishedAt)}</span>
              )}
            </div>

            <p className={styles.statusHint}>
              {status === 'draft'
                ? can.publishPost(user)
                  ? 'Hot on the anvil. Publishing quenches it and makes it public.'
                  : 'Hot on the anvil. An editor publishes it when it is ready.'
                : status === 'published'
                  ? 'Quenched and set. This post is live on the blog.'
                  : 'Cold. Archived posts stay out of the public listing.'}
            </p>

            {post.data && (
              <div className={styles.metaList}>
                <div className={styles.metaRow}>
                  <span>Views</span>
                  <span className={styles.metaValue}>{formatCount(post.data.viewCount)}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Created</span>
                  <span className={styles.metaValue}>{formatDate(post.data.createdAt)}</span>
                </div>
                <div className={styles.metaRow}>
                  <span>Updated</span>
                  <span className={styles.metaValue}>{formatDateTime(post.data.updatedAt)}</span>
                </div>
                {can.viewPostAnalytics(user, post.data) && (
                  <LinkButton to={`/workshop/analytics/${post.data._id}`} variant="secondary" size="sm" block>
                    View analytics
                  </LinkButton>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Featured image">
            {draft.coverImage ? (
              <img className={styles.cover} src={draft.coverImage} alt="" />
            ) : (
              <div className={styles.coverEmpty}>
                <Icon name="image" size={24} />
              </div>
            )}
            <Button variant="secondary" size="sm" block onClick={() => setPickerOpen(true)}>
              {draft.coverImage ? 'Change image' : 'Choose image'}
            </Button>
          </Panel>

          <Panel title="Categories">
            <div className={styles.chipField}>
              {taxonomy.data?.categories.length ? (
                taxonomy.data.categories.map((term) => (
                  <Chip
                    key={term._id}
                    selected={draft.categories.includes(term._id)}
                    onClick={() => toggleTerm('categories', term)}
                  >
                    {term.name}
                  </Chip>
                ))
              ) : (
                <span className={styles.chipEmpty}>No categories yet.</span>
              )}
            </div>
            {can.manageTaxonomy(user) && (
              <LinkButton to="/workshop/taxonomy" variant="ghost" size="sm">
                Manage categories
              </LinkButton>
            )}
          </Panel>

          <Panel title="Tags">
            <div className={styles.chipField}>
              {taxonomy.data?.tags.length ? (
                taxonomy.data.tags.map((term) => (
                  <Chip key={term._id} selected={draft.tags.includes(term._id)} onClick={() => toggleTerm('tags', term)}>
                    {term.name}
                  </Chip>
                ))
              ) : (
                <span className={styles.chipEmpty}>No tags yet.</span>
              )}
            </div>
          </Panel>

          <Panel title="Excerpt & SEO">
            <TextAreaField
              label="Excerpt"
              optional
              value={draft.excerpt}
              onChange={(event) => update('excerpt', event.target.value)}
              maxLength={300}
              counter={{ value: draft.excerpt.length, max: 300 }}
              hint="Left blank, the API takes the opening of your post."
              error={errors.fields.excerpt}
              rows={3}
            />

            <div className={styles.stack}>
              <TextField
                label="Meta title"
                optional
                value={draft.metaTitle}
                onChange={(event) => update('metaTitle', event.target.value)}
                maxLength={70}
                counter={{ value: draft.metaTitle.length, max: 70 }}
                hint="Shown as the search-result headline. Falls back to the post title."
                error={errors.fields['seo.metaTitle']}
              />

              <TextAreaField
                label="Meta description"
                optional
                value={draft.metaDescription}
                onChange={(event) => update('metaDescription', event.target.value)}
                maxLength={160}
                counter={{ value: draft.metaDescription.length, max: 160 }}
                error={errors.fields['seo.metaDescription']}
                rows={3}
              />
            </div>
          </Panel>
        </aside>
      </div>

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(url) => update('coverImage', url)}
        selectedUrl={draft.coverImage}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}
        title={`Delete “${draft.title || 'this post'}”?`}
        confirmLabel="Delete post"
        loading={remove.isPending}
        consequence="Its comments and view history go with it. This can't be undone."
      />
    </>
  )
}
