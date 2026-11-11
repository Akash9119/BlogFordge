import { useEffect } from 'react'

/** Names the browser tab: "Tags — BlogForge". Pass undefined while loading. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} — BlogForge` : 'BlogForge'
    return () => {
      document.title = 'BlogForge'
    }
  }, [title])
}
