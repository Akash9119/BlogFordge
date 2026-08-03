import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { AuthShell, Banner } from './AuthShell'
import styles from './Auth.module.css'

/*
 * Reserved shells. The Phase-1 API has no password-reset endpoints, so these
 * screens are laid out and wired to nothing — same treatment as AI Reports.
 * When `POST /auth/forgot-password` and `POST /auth/reset-password` land,
 * replace the disabled state and the notice; the layout is already right.
 */

const NOT_WIRED = 'Password reset is not switched on yet. Ask an admin to set a new password for you.'

export function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      lede="Enter your email and we'll send a link to set a new one."
    >
      <form className={styles.form} onSubmit={(event) => event.preventDefault()} noValidate>
        <Banner tone="info">{NOT_WIRED}</Banner>

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          disabled
          placeholder="you@example.com"
        />

        <Button type="submit" variant="primary" size="lg" block disabled>
          Send reset link
        </Button>

        <div className={styles.footerRow}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Set a new password"
      lede="Choose a new password for your account. You'll be signed out everywhere else."
    >
      <form className={styles.form} onSubmit={(event) => event.preventDefault()} noValidate>
        <Banner tone="info">{NOT_WIRED}</Banner>

        <TextField
          label="Reset token"
          name="token"
          mono
          disabled
          value={token ?? ''}
          readOnly
          hint="Taken from the link in your email."
        />

        <TextField label="New password" type="password" name="password" autoComplete="new-password" disabled />
        <TextField label="Confirm new password" type="password" name="confirm" autoComplete="new-password" disabled />

        <Button type="submit" variant="primary" size="lg" block disabled>
          Set new password
        </Button>

        <div className={styles.footerRow}>
          <Link to="/login" className={styles.link}>
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
