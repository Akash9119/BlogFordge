import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { useFormErrors } from '@/lib/useFormErrors'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { AuthShell, Banner } from './AuthShell'
import styles from './Auth.module.css'

export function LoginPage() {
  const { login, endedReason, clearEndedReason } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { errors, capture, reset, clearField } = useFormErrors()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Where they were headed before the guard sent them here.
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/workshop'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    clearEndedReason()
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (error) {
      capture(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell eyebrow="Sign in" title="Back to the forge" lede="Sign in to write, publish, and measure your work.">
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {endedReason && <Banner tone="info">{endedReason}</Banner>}
        {errors.banner && <Banner>{errors.banner}</Banner>}

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          error={errors.fields.email}
          onChange={(event) => {
            setEmail(event.target.value)
            clearField('email')
          }}
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          error={errors.fields.password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearField('password')
          }}
        />

        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          Sign in
        </Button>

        <div className={styles.footerRow}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
          <span className={styles.subtle}>
            No account?{' '}
            <Link to="/register" className={styles.link}>
              Create one
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  )
}
