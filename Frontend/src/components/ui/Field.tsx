import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Icon } from './Icon'
import styles from './Field.module.css'

interface FieldShellProps {
  label: string
  /** Rendered under the control, in --danger-strong. Fed by the API's errors[]. */
  error?: string
  hint?: string
  optional?: boolean
  /** Character counter, e.g. {value: 42, max: 200} — shown in mono. */
  counter?: { value: number; max: number }
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode
  className?: string
}

/** Label above, control, then hint/error below — one layout for every input. */
export function Field({ label, error, hint, optional, counter, children, className }: FieldShellProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {optional && <span className={styles.optional}> · optional</span>}
        </label>
        {counter && (
          <span className={`${styles.counter} ${counter.value > counter.max ? styles.counterOver : ''}`}>
            {counter.value}/{counter.max}
          </span>
        )}
      </div>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint && !error && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.error} id={errorId}>
          <span className={styles.errorDot} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

type ControlOwnProps = { mono?: boolean }

interface TextFieldProps
  extends ControlOwnProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>,
    Pick<FieldShellProps, 'label' | 'error' | 'hint' | 'optional' | 'counter' | 'className'> {}

export function TextField({ label, error, hint, optional, counter, className, mono, ...rest }: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} counter={counter} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={[styles.control, mono ? styles.mono : '', invalid ? styles.invalid : ''].filter(Boolean).join(' ')}
        />
      )}
    </Field>
  )
}

interface TextAreaFieldProps
  extends ControlOwnProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>,
    Pick<FieldShellProps, 'label' | 'error' | 'hint' | 'optional' | 'counter' | 'className'> {}

export function TextAreaField({ label, error, hint, optional, counter, className, mono, ...rest }: TextAreaFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} counter={counter} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={[styles.control, styles.textarea, mono ? styles.mono : '', invalid ? styles.invalid : '']
            .filter(Boolean)
            .join(' ')}
        />
      )}
    </Field>
  )
}

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>,
    Pick<FieldShellProps, 'label' | 'error' | 'hint' | 'optional' | 'className'> {
  options: Array<{ value: string; label: string }>
}

export function SelectField({ label, error, hint, optional, className, options, ...rest }: SelectFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          {...rest}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={[styles.control, styles.select, invalid ? styles.invalid : ''].filter(Boolean).join(' ')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

/** Bare select for toolbars, where a visible label would be noise. */
export function BareSelect({
  options,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select {...rest} className={`${styles.control} ${styles.select}`}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Search box with a leading glyph — the toolbar `q` filter. */
export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={[styles.searchWrap, className].filter(Boolean).join(' ')}>
      <Icon name="search" size={16} className={styles.searchIcon} />
      <input {...rest} type="search" className={styles.control} />
    </div>
  )
}
