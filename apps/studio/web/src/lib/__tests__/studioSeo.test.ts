import { describe, expect, it } from 'vitest'

import {
  STUDIO_SITE_NAME,
  formatStudioDocumentTitle,
  getStudioSeoPayload,
  renderStudioRobots,
  renderStudioSitemap,
} from '@/lib/studioSeo'

describe('studioSeo', () => {
  it('does not duplicate the site name in document titles', () => {
    expect(formatStudioDocumentTitle('Help')).toBe('Help - Omnia Creata Studio')
    expect(formatStudioDocumentTitle('Help - Omnia Creata Studio')).toBe('Help - Omnia Creata Studio')
    expect(formatStudioDocumentTitle(STUDIO_SITE_NAME)).toBe(STUDIO_SITE_NAME)
  })

  it('canonicalizes alias routes and marks them noindex', () => {
    const seo = getStudioSeoPayload('/privacy')

    expect(seo.canonicalPath).toBe('/legal/privacy')
    expect(seo.canonicalUrl).toBe('https://studio.omniacreata.com/legal/privacy')
    expect(seo.robots).toBe('noindex,follow')
    expect(seo.isCanonical).toBe(false)
  })

  it('renders a sitemap with canonical routes only', () => {
    const sitemap = renderStudioSitemap()

    expect(sitemap).toContain('<loc>https://studio.omniacreata.com/legal/privacy</loc>')
    expect(sitemap).toContain('<loc>https://studio.omniacreata.com/help</loc>')
    expect(sitemap).not.toContain('<loc>https://studio.omniacreata.com/privacy</loc>')
    expect(sitemap).not.toContain('<loc>https://studio.omniacreata.com/billing</loc>')
  })

  it('can render hidden-beta noindex metadata and robots output', () => {
    const seo = getStudioSeoPayload('/landing', { allowIndexing: false })
    const robots = renderStudioRobots(undefined, { allowIndexing: false })
    const sitemap = renderStudioSitemap(undefined, { allowIndexing: false })

    expect(seo.robots).toBe('noindex,nofollow,noarchive')
    expect(robots).toBe('User-agent: *\nDisallow: /\n')
    expect(sitemap).not.toContain('<loc>')
  })
})
