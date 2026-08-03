import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi, tagsApi, type TaxonomyKind } from '@/api/taxonomy'
import { useFormErrors } from '@/lib/useFormErrors'
import { formatDate } from '@/lib/format'
import type { Term } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { Button } from '@/components/ui/Button'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Panel'
import { Cell, IconAction, PrimaryCell, RowActions, Table, TableSkeleton } from '@/components/ui/Table'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import { Icon } from '@/components/ui/Icon'

const COPY = {
  categories: {
    singular: 'Category',
    plural: 'Categories',
    empty: 'No categories yet.',
    emptyBody: 'Categories are the broad subject areas posts are filed under.',
  },
  tags: {
    singular: 'Tag',
    plural: 'Tags',
    empty: 'No tags yet.',
    emptyBody: 'Tags are finer-grained labels that cut across categories.',
  },
} satisfies Record<TaxonomyKind, { singular: string; plural: string; empty: string; emptyBody: string }>

export function TaxonomyPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<TaxonomyKind>('categories')
  const [editing, setEditing] = useState<Term | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Term | null>(null)

  const api = kind === 'categories' ? categoriesApi : tagsApi
  const copy = COPY[kind]

  const terms = useQuery({
    queryKey: [kind, 'admin'],
    queryFn: ({ signal }) => api.list({ limit: 100 }, signal),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
    queryClient.invalidateQueries({ queryKey: ['taxonomy'] })
    queryClient.invalidateQueries({ queryKey: [kind] })
  }

  const remove = useMutation({
    mutationFn: (term: Term) => api.remove(term._id),
    onSuccess: () => {
      toast.success(`${copy.singular} deleted.`)
      setPendingDelete(null)
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const items = terms.data?.items ?? []

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Categories & tags"
        subtitle="The taxonomy posts are filed under. Deleting a term unfiles it from every post but leaves the posts alone."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)} icon={<Icon name="plus" size={16} />}>
            New {copy.singular.toLowerCase()}
          </Button>
        }
      />

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Segmented
          label="Taxonomy type"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'categories', label: 'Categories', count: kind === 'categories' ? terms.data?.meta.total : undefined },
            { value: 'tags', label: 'Tags', count: kind === 'tags' ? terms.data?.meta.total : undefined },
          ]}
        />
      </div>

      {terms.isError ? (
        <ErrorState error={terms.error} onRetry={() => terms.refetch()} />
      ) : !terms.isPending && items.length === 0 ? (
        <EmptyState
          icon={kind === 'categories' ? 'folder' : 'tag'}
          title={copy.empty}
          body={copy.emptyBody}
          action={
            <Button variant="primary" onClick={() => setCreating(true)}>
              New {copy.singular.toLowerCase()}
            </Button>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>

          {terms.isPending ? (
            <TableSkeleton rows={5} columns={4} />
          ) : (
            <tbody>
              {items.map((term) => (
                <tr key={term._id}>
                  <PrimaryCell title={term.name} meta={`/${term.slug}`} label="Name" />
                  <Cell label="Description">{term.description || '—'}</Cell>
                  <Cell label="Created" numeric style={{ textAlign: 'left' }}>
                    {formatDate(term.createdAt)}
                  </Cell>
                  <Cell label="" actions>
                    <RowActions>
                      <IconAction
                        icon="eye"
                        label={`View ${term.name} on the blog`}
                        to={`/${kind === 'categories' ? 'category' : 'tag'}/${term.slug}`}
                      />
                      <IconAction icon="edit" label={`Edit ${term.name}`} onClick={() => setEditing(term)} />
                      <IconAction icon="trash" label={`Delete ${term.name}`} danger onClick={() => setPendingDelete(term)} />
                    </RowActions>
                  </Cell>
                </tr>
              ))}
            </tbody>
          )}
        </Table>
      )}

      <TermFormModal
        open={creating || editing !== null}
        kind={kind}
        term={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
        onSaved={invalidate}
      />

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
        title={`Delete “${pendingDelete?.name ?? ''}”?`}
        confirmLabel={`Delete ${copy.singular.toLowerCase()}`}
        loading={remove.isPending}
        consequence={`Posts filed under it stay published — they just lose this ${copy.singular.toLowerCase()}.`}
      />
    </>
  )
}

interface TermFormModalProps {
  open: boolean
  kind: TaxonomyKind
  term: Term | null
  onClose: () => void
  onSaved: () => void
}

function TermFormModal({ open, kind, term, onClose, onSaved }: TermFormModalProps) {
  const toast = useToast()
  const api = kind === 'categories' ? categoriesApi : tagsApi
  const copy = COPY[kind]
  const { errors, capture, reset, clearField } = useFormErrors()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [initialised, setInitialised] = useState(false)

  // Seed the form the first render the modal is open for this term.
  if (open && !initialised) {
    setName(term?.name ?? '')
    setDescription(term?.description ?? '')
    setInitialised(true)
  }
  if (!open && initialised) setInitialised(false)

  const save = useMutation({
    mutationFn: async () => {
      reset()
      const input = { name: name.trim(), description: description.trim() }
      return term ? api.update(term._id, input) : api.create(input)
    },
    onSuccess: () => {
      toast.success(term ? `${copy.singular} updated.` : `${copy.singular} created.`)
      onSaved()
      onClose()
    },
    onError: (error: unknown) => capture(error),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={term ? `Edit ${copy.singular.toLowerCase()}` : `New ${copy.singular.toLowerCase()}`}
      description={
        term
          ? 'Renaming regenerates the slug, so existing links to this archive will change.'
          : `The slug is generated from the name.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={save.isPending}>
            {term ? 'Save changes' : `Create ${copy.singular.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {errors.banner && (
          <p style={{ color: 'var(--danger-strong)', fontSize: 'var(--text-small)' }} role="alert">
            {errors.banner}
          </p>
        )}

        <TextField
          label="Name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            clearField('name')
          }}
          error={errors.fields.name}
          maxLength={60}
          counter={{ value: name.length, max: 60 }}
          required
          autoFocus
        />

        <TextAreaField
          label="Description"
          optional
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            clearField('description')
          }}
          error={errors.fields.description}
          maxLength={300}
          counter={{ value: description.length, max: 300 }}
          hint="Shown at the top of the archive page."
          rows={3}
        />
      </form>
    </Modal>
  )
}
