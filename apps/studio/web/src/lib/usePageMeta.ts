import { useEffect } from 'react'

import { getStudioSeoPayload } from '@/lib/studioSeo'

/**
 * Lightweight hook to keep public document metadata aligned without a head manager dependency.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const payload = getStudioSeoPayload(window.location.pathname, {
      override: {
        title,
        description,
        ogTitle: title,
        ogDescription: description,
      },
    })

    applySeoPayload(payload)

    return () => {
      applySeoPayload(getStudioSeoPayload('/'))
    }
  }, [title, description])
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let meta = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!meta) {
    meta = document.createElement('meta')
    document.head.appendChild(meta)
  }

  for (const [key, value] of Object.entries(attributes)) {
    meta.setAttribute(key, value)
  }
}

function upsertLink(selector: string, attributes: Record<string, string>) {
  let link = document.head.querySelector(selector) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    document.head.appendChild(link)
  }

  for (const [key, value] of Object.entries(attributes)) {
    link.setAttribute(key, value)
  }
}

function applySeoPayload(payload: ReturnType<typeof getStudioSeoPayload>) {
  document.title = payload.documentTitle

  upsertMeta('meta[name="description"]', { name: 'description', content: payload.description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: payload.ogTitle })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: payload.ogDescription })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: payload.ogUrl })
  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: payload.siteName })
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: payload.ogImageUrl })
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: payload.ogTitle })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: payload.ogDescription })
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: payload.ogImageUrl })
  upsertMeta('meta[name="robots"]', { name: 'robots', content: payload.robots })
  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: payload.canonicalUrl })
}
