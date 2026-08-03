import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { useFormErrors } from '@/lib/useFormErrors'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { AuthShell, Banner } from './AuthShell'
import styles from './Auth.module.css'

const MIN_PASSWORD = 8

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const { errors, capture, reset, clearField } = useFormErrors()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    reset()
    setSubmitting(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/workshop/posts', { replace: true })
    } catch (error) {
      capture(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start writing"
      lede="Your account is created as an author — you can write and manage your own drafts straight away."
      aside={
        <aside className={styles.aside}>
          <p className={styles.asideTitle}>What an author can do</p>
          <p>
            Write posts, edit and delete your own drafts, and upload media. Publishing and comment moderation are
            handled by editors — an admin can promote you later.
          </p>
        </aside>
      }
    >
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {errors.banner && <Banner>{errors.banner}</Banner>}

        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          error={errors.fields.name}
          onChange={(event) => {
            setName(event.target.value)
            clearField('name')
          }}
        />

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
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={errors.fields.password}
          onChange={(event) => {
            setPassword(event.target.value)
            clearField('password')
          }}
        />

        <Button type="submit" variant="primary" size="lg" block loading={submitting}>
          Create account
        </Button>

        <div className={styles.footerRow}>
          <span className={styles.subtle}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              Sign in
            </Link>
          </span>
        </div>
      </form>
    </AuthShell>
  )
}
