import { describe, expect, it } from 'vitest'

import { isTechnicalErrorMessage, toUserFacingErrorMessage } from '@/lib/uiError'

describe('uiError', () => {
  it('hides chunk and asset url messages', () => {
    expect(
      toUserFacingErrorMessage(
        'TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:5173/assets/MediaLibrary-old.js',
        'Please try again in a moment.',
      ),
    ).toBe('Please try again in a moment.')
  })

  it('keeps short product-safe messages', () => {
    expect(
      toUserFacingErrorMessage(
        'Studio service is offline right now. Try again in a moment.',
        'Please try again in a moment.',
      ),
    ).toBe('Studio service is offline right now. Try again in a moment.')
  })

  it('flags stack-like dumps as technical', () => {
    expect(
      isTechnicalErrorMessage(
        'ReferenceError: foo is not defined at http://127.0.0.1:5173/assets/index.js:12:3 at renderWithHooks',
      ),
    ).toBe(true)
  })
})
