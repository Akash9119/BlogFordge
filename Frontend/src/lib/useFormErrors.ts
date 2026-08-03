import { useCallback, useState } from 'react'
import { ApiError } from './api'

interface FormErrors {
  /** Top-level `message` — drives the banner. */
  banner: string | null
  /** `errors[]` mapped by field — drives inline messages under each input. */
  fields: Record<string, string>
}

const EMPTY: FormErrors = { banner: null, fields: {} }

/**
 * Splits an API failure the way §11 prescribes: field errors go under their
 * inputs, the top-level message goes to a banner. Anything that isn't an
 * ApiError is a bug, not a user-facing message — it re-throws.
 */
export function useFormErrors() {
  const [errors, setErrors] = useState<FormErrors>(EMPTY)

  const capture = useCallback((error: unknown) => {
    if (!(error instanceof ApiError)) throw error

    const fields = error.fieldErrors
    setErrors({
      // When every problem is already pinned to a field, the banner is noise.
      banner: Object.keys(fields).length > 0 ? null : error.message,
      fields,
    })
  }, [])

  const reset = useCallback(() => setErrors(EMPTY), [])

  /** Clear one field's error as the user starts fixing it. */
  const clearField = useCallback((field: string) => {
    setErrors((current) => {
      if (!current.fields[field]) return current
      const fields = { ...current.fields }
      delete fields[field]
      return { ...current, fields }
    })
  }, [])

  return { errors, capture, reset, clearField }
}
