import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

import {
  getStudioSeoPayload,
  getStudioSeoStaticPaths,
  normalizeStudioSiteUrl,
  renderStudioRobots,
  renderStudioSitemap,
} from '../src/lib/studioSeo'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceOrInsertTag(html: string, pattern: RegExp, replacement: string) {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement)
  }

  return html.replace('</head>', `  ${replacement}\n</head>`)
}

function applyStudioSeoHtml(html: string, pathname: string, siteUrl: string) {
  const seo = getStudioSeoPayload(pathname, { siteUrl })
  let nextHtml = html

  nextHtml = replaceOrInsertTag(nextHtml, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.documentTitle)}</title>`)
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(seo.ogTitle)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(seo.ogDescription)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+property=["']og:type["'][^>]*>/i,
    '<meta property="og:type" content="website" />',
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(seo.ogUrl)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+property=["']og:site_name["'][^>]*>/i,
    `<meta property="og:site_name" content="${escapeHtml(seo.siteName)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+(?:name|property)=["']og:image["'][^>]*>/i,
    `<meta property="og:image" content="${escapeHtml(seo.ogImageUrl)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']twitter:card["'][^>]*>/i,
    '<meta name="twitter:card" content="summary_large_image" />',
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(seo.ogTitle)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(seo.ogDescription)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']twitter:image["'][^>]*>/i,
    `<meta name="twitter:image" content="${escapeHtml(seo.ogImageUrl)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<meta\s+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${escapeHtml(seo.robots)}" />`,
  )
  nextHtml = replaceOrInsertTag(
    nextHtml,
    /<link\s+rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeHtml(seo.canonicalUrl)}" />`,
  )

  if (seo.structuredDataJson) {
    nextHtml = replaceOrInsertTag(
      nextHtml,
      /<script\s+type=["']application\/ld\+json["']\s+data-studio-seo=["']structured-data["'][^>]*>[\s\S]*?<\/script>/i,
      `<script type="application/ld+json" data-studio-seo="structured-data">${seo.structuredDataJson}</script>`,
    )
  } else {
    nextHtml = nextHtml.replace(
      /\s*<script\s+type=["']application\/ld\+json["']\s+data-studio-seo=["']structured-data["'][^>]*>[\s\S]*?<\/script>/i,
      '',
    )
  }

  return nextHtml
}

export function studioSeoPlugin(options: { siteUrl?: string } = {}): Plugin {
  const siteUrl = normalizeStudioSiteUrl(options.siteUrl)
  let rootDir = ''
  let buildOutDir = 'dist'

  return {
    name: 'studio-seo-plugin',
    apply: 'build',
    configResolved(config) {
      rootDir = config.root
      buildOutDir = config.build.outDir
    },
    transformIndexHtml(html) {
      return applyStudioSeoHtml(html, '/', siteUrl)
    },
    async closeBundle() {
      const distRoot = path.join(rootDir, buildOutDir)
      const distIndexPath = path.join(distRoot, 'index.html')
      const baseHtml = await readFile(distIndexPath, 'utf8')

      for (const routePath of getStudioSeoStaticPaths()) {
        if (routePath === '/') continue

        const outputPath = path.join(distRoot, ...routePath.split('/').filter(Boolean), 'index.html')
        await mkdir(path.dirname(outputPath), { recursive: true })
        await writeFile(outputPath, applyStudioSeoHtml(baseHtml, routePath, siteUrl), 'utf8')
      }

      await writeFile(path.join(distRoot, 'robots.txt'), renderStudioRobots(siteUrl), 'utf8')
      await writeFile(path.join(distRoot, 'sitemap.xml'), renderStudioSitemap(siteUrl), 'utf8')
    },
  }
}
