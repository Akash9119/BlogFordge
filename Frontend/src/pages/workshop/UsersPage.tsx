import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi, type UserQuery } from '@/api/users'
import { useAuth } from '@/context/auth-context'
import { ROLE_SUMMARY } from '@/lib/permissions'
import { useDebounced } from '@/lib/useDebounced'
import { formatDate } from '@/lib/format'
import type { Role, User } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ActiveBadge, RoleBadge } from '@/components/ui/Badge'
import { BareSelect, SearchInput, SelectField } from '@/components/ui/Field'
import { Segmented, Toolbar, ToolbarSearch } from '@/components/ui/Panel'
import { Cell, IconAction, RowActions, Table, TableSkeleton } from '@/components/ui/Table'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState, ErrorState } from '@/components/ui/States'
import { useToast } from '@/components/ui/toast-context'
import styles from './Users.module.css'

const ROLE_OPTIONS: Array<{ value: Role | 'all'; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admins' },
  { value: 'editor', label: 'Editors' },
  { value: 'author', label: 'Authors' },
]

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [role, setRole] = useState<Role | 'all'>('all')
  const [active, setActive] = useState<'' | 'true' | 'false'>('')
  const [searchDraft, setSearchDraft] = useState('')
  const search = useDebounced(searchDraft.trim())

  const [editingRole, setEditingRole] = useState<User | null>(null)
  const [changingStatus, setChangingStatus] = useState<User | null>(null)

  const query: UserQuery = {
    page,
    limit: 15,
    ...(role !== 'all' && { role }),
    ...(active && { isActive: active }),
    ...(search && { q: search }),
  }

  const users = useQuery({
    queryKey: ['users', query],
    queryFn: ({ signal }) => usersApi.list(query, signal),
    placeholderData: keepPreviousData,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const setStatus = useMutation({
    mutationFn: (target: User) => usersApi.setStatus(target._id, !target.isActive),
    onSuccess: (updated) => {
      toast.success(updated.isActive ? 'Account activated.' : 'Account deactivated.')
      setChangingStatus(null)
      invalidate()
    },
    onError: (error: unknown) => toast.error(error),
  })

  const items = users.data?.items ?? []

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Members"
        subtitle="Who can write, publish, and moderate. Roles take effect immediately."
      />

      <Toolbar>
        <Segmented
          label="Filter by role"
          value={role}
          onChange={(value) => {
            setRole(value)
            setPage(1)
          }}
          options={ROLE_OPTIONS}
        />

        <ToolbarSearch>
          <SearchInput
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value)
              setPage(1)
            }}
            placeholder="Search name or email"
            aria-label="Search members"
          />
        </ToolbarSearch>

        <BareSelect
          value={active}
          onChange={(event) => {
            setActive(event.target.value as '' | 'true' | 'false')
            setPage(1)
          }}
          aria-label="Filter by account status"
          options={[
            { value: '', label: 'Any status' },
            { value: 'true', label: 'Active only' },
            { value: 'false', label: 'Deactivated only' },
          ]}
        />
      </Toolbar>

      {users.isError ? (
        <ErrorState error={users.error} onRetry={() => users.refetch()} />
      ) : !users.isPending && items.length === 0 ? (
        <EmptyState
          icon="users"
          title={search ? `No members match “${search}”.` : 'No members match these filters.'}
          body="Try another term or widen the filters."
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>

            {users.isPending ? (
              <TableSkeleton rows={8} columns={5} />
            ) : (
              <tbody>
                {items.map((member) => {
                  const isSelf = member._id === currentUser?._id

                  return (
                    <tr key={member._id}>
                      <Cell label="Member">
                        <span className={styles.member}>
                          <Avatar name={member.name} src={member.avatar} size={32} />
                          <span className={styles.memberText}>
                            <span className={styles.memberName}>
                              {member.name}
                              {isSelf && <span className={styles.you}>You</span>}
                            </span>
                            <span className={styles.memberEmail}>{member.email}</span>
                          </span>
                        </span>
                      </Cell>

                      <Cell label="Role">
                        <RoleBadge role={member.role} />
                      </Cell>

                      <Cell label="Status">
                        <ActiveBadge isActive={member.isActive} />
                      </Cell>

                      <Cell label="Joined" numeric style={{ textAlign: 'left' }}>
                        {formatDate(member.createdAt)}
                      </Cell>

                      <Cell label="" actions>
                        <RowActions>
                          {/* The API refuses self role/status changes — don't
                              offer a control that is guaranteed to fail. */}
                          {!isSelf && (
                            <>
                              <IconAction
                                icon="settings"
                                label={`Change ${member.name}'s role`}
                                onClick={() => setEditingRole(member)}
                              />
                              <IconAction
                                icon={member.isActive ? 'logout' : 'check'}
                                label={member.isActive ? `Deactivate ${member.name}` : `Activate ${member.name}`}
                                danger={member.isActive}
                                onClick={() => setChangingStatus(member)}
                              />
                            </>
                          )}
                          <IconAction icon="file" label={`Posts by ${member.name}`} to={`/author/${member._id}`} />
                        </RowActions>
                      </Cell>
                    </tr>
                  )
                })}
              </tbody>
            )}
          </Table>

          {users.data && <Pagination meta={users.data.meta} onPageChange={setPage} noun="member" />}
        </>
      )}

      <RoleModal member={editingRole} onClose={() => setEditingRole(null)} onSaved={invalidate} />

      <ConfirmModal
        open={changingStatus !== null}
        onClose={() => setChangingStatus(null)}
        onConfirm={() => changingStatus && setStatus.mutate(changingStatus)}
        title={
          changingStatus?.isActive
            ? `Deactivate ${changingStatus.name}?`
            : `Activate ${changingStatus?.name ?? 'this account'}?`
        }
        description={
          changingStatus?.isActive
            ? 'They will not be able to sign in until the account is reactivated.'
            : 'They will be able to sign in again straight away.'
        }
        confirmLabel={changingStatus?.isActive ? 'Deactivate account' : 'Activate account'}
        destructive={changingStatus?.isActive ?? false}
        loading={setStatus.isPending}
        consequence={
          changingStatus?.isActive
            ? 'This also ends every session they have open — they are signed out everywhere immediately.'
            : undefined
        }
      />
    </>
  )
}

interface RoleModalProps {
  member: User | null
  onClose: () => void
  onSaved: () => void
}

function RoleModal({ member, onClose, onSaved }: RoleModalProps) {
  const toast = useToast()
  const [role, setRole] = useState<Role>('author')
  const [seeded, setSeeded] = useState<string | null>(null)

  // Seed from the member the first render this modal opens for them.
  if (member && seeded !== member._id) {
    setRole(member.role)
    setSeeded(member._id)
  }
  if (!member && seeded !== null) setSeeded(null)

  const save = useMutation({
    mutationFn: () => usersApi.setRole(member!._id, role),
    onSuccess: (updated) => {
      toast.success(`${updated.name} is now ${updated.role === 'admin' ? 'an' : 'a'} ${updated.role}.`)
      onSaved()
      onClose()
    },
    onError: (error: unknown) => toast.error(error),
  })

  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      title={`Change ${member?.name ?? ''}'s role`}
      description="Role changes apply to their next request — no sign-out required."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={role === member?.role}
          >
            Save role
          </Button>
        </>
      }
    >
      <SelectField
        label="Role"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
        options={[
          { value: 'author', label: 'Author' },
          { value: 'editor', label: 'Editor' },
          { value: 'admin', label: 'Admin' },
        ]}
      />
      <p className={styles.roleSummary}>{ROLE_SUMMARY[role]}</p>
    </Modal>
  )
}
