import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const TEST_ROOT = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(TEST_ROOT, '../../..')

const BANNED_PHRASES: Record<string, string[]> = {
  'index.html': ['Create stunning AI-generated images in seconds'],
  'src/components/CommandPalette.tsx': ['Search commands, navigate apps... (Type to search)'],
  'src/pages/Chat.tsx': ['premium direction', 'premium composition'],
  'src/pages/Billing.tsx': ['Secure checkout is opening in limited waves.'],
  'src/pages/legal/Cookies.tsx': [
    'browser developer tools on any Omnia Creata Studio page',
    'Names prefixed with a placeholder',
  ],
  'src/lib/studioSeo.ts': ['Discover breathtaking AI-generated art'],
}

describe('surface copy hygiene', () => {
  it('keeps stale AI-demo and developer-facing phrases out of targeted Studio surfaces', () => {
    for (const [relativePath, phrases] of Object.entries(BANNED_PHRASES)) {
      const contents = readFileSync(resolve(WEB_ROOT, relativePath), 'utf8')
      for (const phrase of phrases) {
        expect(contents).not.toContain(phrase)
      }
    }
  })
})
