import { LinkButton } from '@/components/ui/Button'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

export function NotFoundPage() {
  useDocumentTitle('Not found')
  return (
    <div style={{ maxWidth: 'var(--reader-max)', margin: '0 auto', padding: 'var(--space-9) var(--gutter)' }}>
      <p className="mono-label" style={{ color: 'var(--ember-strong)' }}>
        Error 404
      </p>
      <h1
        className="display"
        style={{ fontSize: 'clamp(3rem, 9vw, 8rem)', lineHeight: 0.92, marginTop: 'var(--space-4)', maxWidth: '14ch' }}
      >
        <span className="line">
          <span>
            Nothing at this <span className="wonk">address.</span>
          </span>
        </span>
      </h1>
      <p
        style={{
          marginTop: 'var(--space-5)',
          maxWidth: '48ch',
          fontFamily: 'var(--font-reading)',
          fontSize: '1.25rem',
          color: 'var(--slate)',
        }}
      >
        The page you're after has moved, or the link is wrong.
      </p>
      <div style={{ marginTop: 'var(--space-6)' }}>
        <LinkButton to="/" variant="primary">
          Back to the index <span className="nudge">→</span>
        </LinkButton>
      </div>
    </div>
  )
}
