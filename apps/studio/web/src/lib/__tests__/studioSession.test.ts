import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('studioSession post-auth redirect persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    window.sessionStorage.clear()
    vi.resetModules()
  })

  it('survives a module reload through sessionStorage and clears after consume', async () => {
    const sessionModule = await import('@/lib/studioSession')
    sessionModule.setStudioPostAuthRedirect('/create?draft=1')

    vi.resetModules()

    const reloadedSessionModule = await import('@/lib/studioSession')
    expect(reloadedSessionModule.getStudioPostAuthRedirect()).toBe('/create?draft=1')
    expect(reloadedSessionModule.consumeStudioPostAuthRedirect()).toBe('/create?draft=1')
    expect(reloadedSessionModule.getStudioPostAuthRedirect()).toBeNull()
  })

  it('sanitizes invalid stored redirect paths back to the default route', async () => {
    window.sessionStorage.setItem('oc-studio-post-auth-redirect', 'https://evil.example/steal')

    const sessionModule = await import('@/lib/studioSession')
    expect(sessionModule.getStudioPostAuthRedirect()).toBe('/explore')
  })
})
