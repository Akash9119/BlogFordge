import { useAuth } from '@/context/auth-context'
import { isStaff } from '@/lib/permissions'
import { PageHeader } from '@/components/workshop/PageHeader'
import { MediaBrowser } from '@/components/workshop/MediaBrowser'

export function MediaLibraryPage() {
  const { user } = useAuth()

  return (
    <>
      <PageHeader
        eyebrow="Workshop"
        title="Media"
        subtitle={
          isStaff(user)
            ? 'Every image uploaded to BlogForge. Drop files here, or pick one straight from the post editor.'
            : 'Images you have uploaded. Drop files here, or pick one straight from the post editor.'
        }
      />
      <MediaBrowser />
    </>
  )
}
