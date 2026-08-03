import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'

export function NotFoundPage() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-9) var(--space-5)' }}>
      <EmptyState
        icon="file"
        title="Nothing at this address."
        body="The page you're after has moved, or the link is wrong."
        action={
          <LinkButton to="/" variant="primary">
            Back to latest
          </LinkButton>
        }
      />
    </div>
  )
}
