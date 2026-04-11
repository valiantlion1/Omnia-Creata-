import { useEffect } from 'react'

/**
 * Lightweight hook to set document title and meta description.
 * Avoids adding react-helmet dependency.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const suffix = ' — Omnia Creata Studio'
    document.title = title + suffix

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = description
    }

    return () => {
      document.title = 'Omnia Creata Studio'
    }
  }, [title, description])
}
