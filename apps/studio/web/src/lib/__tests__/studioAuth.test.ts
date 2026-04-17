import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('buildOAuthRedirectUrl', () => {
  beforeEach(() => {
    window.history.replaceState({}, document.title, '/login')
    vi.resetModules()
  })

  it('preserves the intended next path in the OAuth callback URL', async () => {
    const { buildOAuthRedirectUrl } = await import('@/lib/studioAuth')

    const expectedBase = `${window.location.origin}/login`
    expect(buildOAuthRedirectUrl('/create?draft=1')).toBe(
      `${expectedBase}?oauth=1&next=%2Fcreate%3Fdraft%3D1`,
    )
  })

  it('falls back to the default redirect when nextPath is unsafe', async () => {
    const { buildOAuthRedirectUrl } = await import('@/lib/studioAuth')

    const expectedBase = `${window.location.origin}/login`
    expect(buildOAuthRedirectUrl('https://evil.example/prompt' as never)).toBe(
      `${expectedBase}?oauth=1&next=%2Fexplore`,
    )
  })
})
