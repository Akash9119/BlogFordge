import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { usersApi } from '@/api/users'
import { useAuth } from '@/context/auth-context'
import { useFormErrors } from '@/lib/useFormErrors'
import { formatDate } from '@/lib/format'
import type { User } from '@/lib/types'
import { PageHeader } from '@/components/workshop/PageHeader'
import { MediaPicker } from '@/components/workshop/MediaBrowser'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/Badge'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/toast-context'
import styles from './Account.module.css'

const MIN_PASSWORD = 8

export function AccountPage() {
  const { user, setUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const profile = useFormErrors()
  const password = useFormErrors()

  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Re-seed the form when a different user object arrives (boot, or a save).
  // Adjusting state during render is the documented alternative to a
  // setState-in-effect; React re-runs this component before touching the DOM.
  const [syncedFrom, setSyncedFrom] = useState<User | null>(null)
  if (user && user !== syncedFrom) {
    setSyncedFrom(user)
    setName(user.name)
    setBio(user.bio ?? '')
    setAvatar(user.avatar ?? '')
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      profile.reset()
      return usersApi.updateMe({ name: name.trim(), bio: bio.trim(), avatar })
    },
    onSuccess: (updated) => {
      setUser(updated)
      toast.success('Profile updated.')
    },
    onError: (error: unknown) => profile.capture(error),
  })

  /**
   * The API revokes every refresh token on success — including this session's.
   * Rather than let the next request fail mysteriously, sign out deliberately
   * and send them to login with the reason stated.
   */
  const changePassword = useMutation({
    mutationFn: async () => {
      password.reset()
      return usersApi.changePassword(currentPassword, newPassword)
    },
    onSuccess: async () => {
      toast.success('Password changed. Sign in again with your new password.')
      await logout()
      navigate('/login', { replace: true })
    },
    onError: (error: unknown) => password.capture(error),
  })

  function onProfileSubmit(event: FormEvent) {
    event.preventDefault()
    saveProfile.mutate()
  }

  function onPasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setConfirmError(null)
    if (newPassword !== confirmPassword) {
      setConfirmError("The two new passwords don't match.")
      return
    }
    changePassword.mutate()
  }

  const profileDirty = name !== (user?.name ?? '') || bio !== (user?.bio ?? '') || avatar !== (user?.avatar ?? '')

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Account"
        subtitle="Your name, bio, and avatar appear on every post you publish."
      />

      <div className={styles.layout}>
        <div className={styles.column}>
          <Panel title="Profile">
            <form onSubmit={onProfileSubmit} className={styles.form}>
              <div className={styles.avatarRow}>
                <Avatar name={name || '?'} src={avatar} size={64} />
                <div className={styles.avatarActions}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                    {avatar ? 'Change avatar' : 'Choose avatar'}
                  </Button>
                  {avatar && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAvatar('')}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <TextField
                label="Name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  profile.clearField('name')
                }}
                error={profile.errors.fields.name}
                minLength={2}
                maxLength={80}
                counter={{ value: name.length, max: 80 }}
                required
              />

              <TextAreaField
                label="Bio"
                optional
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value)
                  profile.clearField('bio')
                }}
                error={profile.errors.fields.bio}
                maxLength={500}
                counter={{ value: bio.length, max: 500 }}
                hint="A sentence or two, shown on your author page."
                rows={4}
              />

              {profile.errors.banner && (
                <p className={styles.error} role="alert">
                  <Icon name="alert" size={16} />
                  {profile.errors.banner}
                </p>
              )}

              <div className={styles.actions}>
                <Button type="submit" variant="primary" loading={saveProfile.isPending} disabled={!profileDirty}>
                  Save profile
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="Password" subtitle="Changing it signs you out of every device, including this one.">
            <form onSubmit={onPasswordSubmit} className={styles.form}>
              <p className={styles.warning}>
                <Icon name="alert" size={16} className={styles.warningIcon} />
                <span>
                  When the change succeeds, all active sessions are revoked. You'll be signed out here and asked to
                  sign in again with the new password.
                </span>
              </p>

              <TextField
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  password.clearField('currentPassword')
                }}
                error={password.errors.fields.currentPassword}
                required
              />

              <TextField
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  password.clearField('newPassword')
                }}
                error={password.errors.fields.newPassword}
                minLength={MIN_PASSWORD}
                hint={`At least ${MIN_PASSWORD} characters.`}
                required
              />

              <TextField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setConfirmError(null)
                }}
                error={confirmError ?? undefined}
                required
              />

              {password.errors.banner && (
                <p className={styles.error} role="alert">
                  <Icon name="alert" size={16} />
                  {password.errors.banner}
                </p>
              )}

              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={changePassword.isPending}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  Change password
                </Button>
              </div>
            </form>
          </Panel>
        </div>

        <aside className={styles.column}>
          <Panel title="Account">
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt>Email</dt>
                <dd className={styles.metaMono}>{user?.email}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Role</dt>
                <dd>{user && <RoleBadge role={user.role} />}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt>Joined</dt>
                <dd className={styles.metaMono}>{formatDate(user?.createdAt)}</dd>
              </div>
            </dl>

            <p className={styles.note}>
              Your email and role can only be changed by an admin. Public sign-ups always start as authors.
            </p>
          </Panel>

          <Panel title="Session">
            <p className={styles.note}>Signing out revokes this device's session. Other devices stay signed in.</p>
            <Button
              variant="secondary"
              block
              onClick={async () => {
                await logout()
                navigate('/login', { replace: true })
              }}
              icon={<Icon name="logout" size={16} />}
            >
              Sign out
            </Button>
          </Panel>
        </aside>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={setAvatar} selectedUrl={avatar} />
    </>
  )
}
