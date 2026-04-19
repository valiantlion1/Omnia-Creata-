export const STUDIO_SITE_NAME = 'Omnia Creata Studio'
export const STUDIO_SITE_URL = 'https://studio.omniacreata.com'
export const STUDIO_DEFAULT_OG_IMAGE_PATH = '/omnia-logo.png'

type StudioSeoEntry = {
  path: string
  aliases?: string[]
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
  structuredData?: 'website'
}

type StudioSeoOverride = Partial<Pick<StudioSeoEntry, 'title' | 'description' | 'ogTitle' | 'ogDescription'>>

type ResolvedStudioSeoEntry = {
  entry: StudioSeoEntry
  requestedPath: string
  canonicalPath: string
  isCanonical: boolean
}

export type StudioSeoPayload = {
  requestedPath: string
  canonicalPath: string
  canonicalUrl: string
  documentTitle: string
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  ogUrl: string
  ogImageUrl: string
  robots: string
  siteName: string
  isCanonical: boolean
  structuredDataJson: string | null
}

const STUDIO_SEO_ENTRIES: readonly StudioSeoEntry[] = [
  {
    path: '/',
    aliases: ['/landing', '/home'],
    title: STUDIO_SITE_NAME,
    description: 'A creative studio for turning ideas into images. Make, iterate, and own the work.',
    structuredData: 'website',
  },
  {
    path: '/explore',
    aliases: ['/social'],
    title: 'Explore',
    description: 'What the community is making on Omnia Creata Studio.',
  },
  {
    path: '/community',
    title: 'Community',
    description: 'Browse public creator work, prompts, and references shared through Omnia Creata Studio.',
  },
  {
    path: '/subscription',
    aliases: ['/billing', '/plan'],
    title: 'Plans & Billing',
    description: 'Review Studio plans, credits, and checkout availability.',
  },
  {
    path: '/help',
    aliases: ['/docs', '/faq', '/learn'],
    title: 'Help',
    description: 'Getting started, prompt craft, workflows, billing, safety, and legal pages for Omnia Creata Studio.',
  },
  {
    path: '/legal/terms',
    aliases: ['/terms'],
    title: 'Terms of Service',
    description: 'You can use Studio to generate images. You own what you make, and paid plans permit commercial use subject to these Terms and applicable third-party rights.',
  },
  {
    path: '/legal/privacy',
    aliases: ['/privacy'],
    title: 'Privacy Policy',
    description: 'How Omnia Creata Studio collects, uses, protects, and shares personal data, and the choices you have over prompts, generated outputs, and account data.',
  },
  {
    path: '/legal/refunds',
    aliases: ['/refunds', '/refund-policy'],
    title: 'Refund Policy',
    description: 'How Omnia Creata Studio handles failed runs, billing mistakes, cancellations, and legally required consumer refunds.',
  },
  {
    path: '/legal/acceptable-use',
    aliases: ['/usage-policy'],
    title: 'Acceptable Use Policy',
    description: 'Clear rules, clear consequences, and consistent enforcement for what you can and cannot do with Omnia Creata Studio.',
  },
  {
    path: '/legal/cookies',
    aliases: ['/cookies'],
    title: 'Cookie Policy',
    description: 'What Omnia Creata Studio stores in your browser, why it is stored, and how to change your consent choices.',
  },
] as const

function hasAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function normalizePathname(pathname: string) {
  let value = pathname.trim()
  if (!value) return '/'

  if (hasAbsoluteUrl(value)) {
    value = new URL(value).pathname
  }

  const queryIndex = value.indexOf('?')
  if (queryIndex >= 0) value = value.slice(0, queryIndex)

  const hashIndex = value.indexOf('#')
  if (hashIndex >= 0) value = value.slice(0, hashIndex)

  if (!value.startsWith('/')) value = `/${value}`
  value = value.replace(/\/{2,}/g, '/')

  if (value.length > 1 && value.endsWith('/')) {
    value = value.replace(/\/+$/, '')
  }

  return value || '/'
}

function buildAbsoluteStudioUrl(pathname: string, siteUrl: string) {
  return new URL(normalizePathname(pathname), `${siteUrl}/`).toString()
}

function buildStructuredDataJson(pathname: string, description: string, siteUrl: string) {
  const normalizedPath = normalizePathname(pathname)
  const payload =
    normalizedPath === '/'
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: STUDIO_SITE_NAME,
          url: buildAbsoluteStudioUrl('/', siteUrl),
          description,
          inLanguage: 'en',
        }
      : null

  return payload ? JSON.stringify(payload) : null
}

function resolveStudioSeoEntry(pathname: string): ResolvedStudioSeoEntry | null {
  const requestedPath = normalizePathname(pathname)

  for (const entry of STUDIO_SEO_ENTRIES) {
    if (entry.path === requestedPath) {
      return {
        entry,
        requestedPath,
        canonicalPath: entry.path,
        isCanonical: true,
      }
    }

    if (entry.aliases?.includes(requestedPath)) {
      return {
        entry,
        requestedPath,
        canonicalPath: entry.path,
        isCanonical: false,
      }
    }
  }

  return null
}

export function normalizeStudioSiteUrl(siteUrl?: string) {
  const fallback = new URL(STUDIO_SITE_URL)
  const rawValue = siteUrl?.trim()

  if (!rawValue) {
    return fallback.toString().replace(/\/$/, '')
  }

  try {
    const url = new URL(rawValue)
    url.pathname = ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback.toString().replace(/\/$/, '')
  }
}

export function formatStudioDocumentTitle(title: string) {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) return STUDIO_SITE_NAME

  if (normalizedTitle.toLowerCase().includes(STUDIO_SITE_NAME.toLowerCase())) {
    return normalizedTitle
  }

  return `${normalizedTitle} - ${STUDIO_SITE_NAME}`
}

export function getStudioSeoPayload(pathname: string, options: { siteUrl?: string; override?: StudioSeoOverride } = {}): StudioSeoPayload {
  const resolved = resolveStudioSeoEntry(pathname)
  const normalizedSiteUrl = normalizeStudioSiteUrl(options.siteUrl)
  const requestedPath = resolved?.requestedPath ?? normalizePathname(pathname)
  const canonicalPath = resolved?.canonicalPath ?? requestedPath
  const title = options.override?.title?.trim() || resolved?.entry.title || STUDIO_SITE_NAME
  const description =
    options.override?.description?.trim() ||
    resolved?.entry.description ||
    'A creative studio for turning ideas into images.'
  const ogTitle = options.override?.ogTitle?.trim() || resolved?.entry.ogTitle || title
  const ogDescription = options.override?.ogDescription?.trim() || resolved?.entry.ogDescription || description
  const canonicalUrl = buildAbsoluteStudioUrl(canonicalPath, normalizedSiteUrl)
  const isCanonical = resolved?.isCanonical ?? true

  return {
    requestedPath,
    canonicalPath,
    canonicalUrl,
    documentTitle: formatStudioDocumentTitle(title),
    title,
    description,
    ogTitle,
    ogDescription,
    ogUrl: canonicalUrl,
    ogImageUrl: buildAbsoluteStudioUrl(STUDIO_DEFAULT_OG_IMAGE_PATH, normalizedSiteUrl),
    robots: isCanonical ? 'index,follow' : 'noindex,follow',
    siteName: STUDIO_SITE_NAME,
    isCanonical,
    structuredDataJson:
      resolved?.entry.structuredData === 'website'
        ? buildStructuredDataJson(canonicalPath, description, normalizedSiteUrl)
        : null,
  }
}

export function getStudioSeoStaticPaths() {
  return STUDIO_SEO_ENTRIES.flatMap((entry) => [entry.path, ...(entry.aliases ?? [])])
}

export function renderStudioSitemap(siteUrl?: string) {
  const normalizedSiteUrl = normalizeStudioSiteUrl(siteUrl)
  const urls = STUDIO_SEO_ENTRIES.map((entry) => {
    const canonicalUrl = buildAbsoluteStudioUrl(entry.path, normalizedSiteUrl)
    return `  <url>\n    <loc>${canonicalUrl}</loc>\n  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

export function renderStudioRobots(siteUrl?: string) {
  const normalizedSiteUrl = normalizeStudioSiteUrl(siteUrl)
  return `User-agent: *\nAllow: /\n\nSitemap: ${buildAbsoluteStudioUrl('/sitemap.xml', normalizedSiteUrl)}\n`
}
