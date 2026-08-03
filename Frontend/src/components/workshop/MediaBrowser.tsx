import { useRef, useState, type DragEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MAX_UPLOAD_BYTES, mediaApi } from '@/api/media'
import { useAuth } from '@/context/auth-context'
import { can } from '@/lib/permissions'
import { formatBytes, formatDate } from '@/lib/format'
import type { MediaItem } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import styles from './MediaBrowser.module.css'

const ACCEPT = 'image/*'

function ownerId(item: MediaItem): string {
  return typeof item.uploadedBy === 'string' ? item.uploadedBy : item.uploadedBy._id
}

interface DropzoneProps {
  onFiles: (files: File[]) => void
  busy: boolean
}

function Dropzone({ onFiles, busy }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    onFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <span className={styles.dropzoneGlyph}>
        <Icon name="upload" size={20} />
      </span>
      <p className={styles.dropzoneTitle}>Drop images here to add them</p>
      <p className={styles.dropzoneHint}>PNG, JPG, WEBP · max {formatBytes(MAX_UPLOAD_BYTES)}</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className={styles.hiddenInput}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []))
          event.target.value = '' // let the same file be picked twice
        }}
      />
      <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={busy}>
        Choose files
      </Button>
    </div>
  )
}

interface MediaBrowserProps {
  /** Picker mode: clicking a tile selects it instead of doing nothing. */
  onSelect?: (item: MediaItem) => void
  selectedUrl?: string
  /** Library mode shows delete controls and pagination. */
  showDelete?: boolean
  pageSize?: number
}

export function MediaBrowser({ onSelect, selectedUrl, showDelete = true, pageSize = 24 }: MediaBrowserProps) {
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null)

  const media = useQuery({
    queryKey: ['media', page, pageSize],
    queryFn: ({ signal }) => mediaApi.list({ page, limit: pageSize }, signal),
    placeholderData: keepPreviousData,
  })

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const results: MediaItem[] = []
      // Sequential: Cloudinary uploads are the slow part and a burst of
      // parallel requests just trips the global rate limit.
      for (const file of files) {
        results.push(await mediaApi.upload(file))
      }
      return results
    },
    onSuccess: (items) => {
      toast.success(items.length === 1 ? 'Image uploaded.' : `${items.length} images uploaded.`)
      queryClient.invalidateQueries({ queryKey: ['media'] })
      if (items.length === 1) onSelect?.(items[0])
    },
    onError: (error: unknown) => toast.error(error),
  })

  const remove = useMutation({
    mutationFn: (item: MediaItem) => mediaApi.remove(item._id),
    onSuccess: () => {
      toast.success('Media deleted.')
      setPendingDelete(null)
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
    onError: (error: unknown) => toast.error(error),
  })

  function onFiles(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (images.length !== files.length) toast.error(null, 'Only images can be uploaded.')

    const tooBig = images.filter((file) => file.size > MAX_UPLOAD_BYTES)
    if (tooBig.length > 0) {
      toast.error(null, `${tooBig[0].name} is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`)
    }

    const accepted = images.filter((file) => file.size <= MAX_UPLOAD_BYTES)
    if (accepted.length > 0) upload.mutate(accepted)
  }

  const items = media.data?.items ?? []

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <Dropzone onFiles={onFiles} busy={upload.isPending} />
      </div>

      {upload.isPending && (
        <p className={styles.uploading}>
          <Icon name="upload" size={16} />
          Uploading…
        </p>
      )}

      {media.isPending ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} height={168} radius="var(--radius-card)" />
          ))}
        </div>
      ) : media.isError ? (
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="image" title="No media yet." body="Drop images here to add them." />
      ) : (
        <>
          <div className={styles.grid}>
            {items.map((item) => {
              const selected = selectedUrl === item.url
              const className = `${styles.item} ${selected ? styles.itemSelected : ''}`

              const body = (
                <>
                  <img className={styles.thumb} src={item.url} alt={item.originalName || ''} loading="lazy" />
                  <span className={styles.itemMeta}>
                    <span className={styles.itemName}>{item.originalName || item.publicId}</span>
                    <span className={styles.itemStats}>
                      {item.width}×{item.height} · {formatBytes(item.bytes)} · {formatDate(item.createdAt)}
                    </span>
                  </span>
                  {selected && (
                    <span className={styles.checkMark}>
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </>
              )

              const deleteControl =
                showDelete && can.deleteMedia(user, ownerId(item)) ? (
                  <span className={styles.itemActions}>
                    <button
                      type="button"
                      className={styles.itemAction}
                      aria-label={`Delete ${item.originalName || 'image'}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        setPendingDelete(item)
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </span>
                ) : null

              // In picker mode the tile itself is the control; in library mode
              // it is inert, so it must not be a button.
              return onSelect ? (
                <div key={item._id} className={styles.tileWrap}>
                  <button type="button" className={className} onClick={() => onSelect(item)} aria-pressed={selected}>
                    {body}
                  </button>
                  {deleteControl}
                </div>
              ) : (
                <div key={item._id} className={className}>
                  {body}
                  {deleteControl}
                </div>
              )
            })}
          </div>

          {media.data && <Pagination meta={media.data.meta} onPageChange={setPage} noun="file" />}
        </>
      )}

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title="Delete this image?"
        confirmLabel="Delete image"
        loading={remove.isPending}
        consequence="It is removed from Cloudinary too. Posts already using it will show a broken image."
      />
    </div>
  )
}

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  onPick: (url: string) => void
  selectedUrl?: string
}

/** The same browser in a modal — the editor's featured-image picker. */
export function MediaPicker({ open, onClose, onPick, selectedUrl }: MediaPickerProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Choose an image"
      description="Pick from your library, or drop a new file to upload and use it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {selectedUrl && (
            <Button
              variant="dangerGhost"
              onClick={() => {
                onPick('')
                onClose()
              }}
            >
              Remove image
            </Button>
          )}
        </>
      }
    >
      <MediaBrowser
        selectedUrl={selectedUrl}
        showDelete={false}
        pageSize={12}
        onSelect={(item) => {
          onPick(item.url)
          onClose()
        }}
      />
    </Modal>
  )
}
