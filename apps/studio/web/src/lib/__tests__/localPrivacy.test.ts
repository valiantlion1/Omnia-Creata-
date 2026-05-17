import { describe, expect, it } from 'vitest'

import { clearStudioLocalPrivateState, isStudioLocalPrivateStorageKey } from '@/lib/localPrivacy'

describe('localPrivacy', () => {
  it('recognizes only browser-local Studio prompt and chat continuity keys', () => {
    expect(isStudioLocalPrivateStorageKey('omnia-prompt-history')).toBe(true)
    expect(isStudioLocalPrivateStorageKey('omnia-prompt-history:user-1')).toBe(true)
    expect(isStudioLocalPrivateStorageKey('omnia-create-active-session:user-1')).toBe(true)
    expect(isStudioLocalPrivateStorageKey('oc-chat-visual-messages-v1')).toBe(true)
    expect(isStudioLocalPrivateStorageKey('oc-chat-project-map-v1')).toBe(true)

    expect(isStudioLocalPrivateStorageKey('oc-studio-cookie-preferences-v1')).toBe(false)
    expect(isStudioLocalPrivateStorageKey('oc-studio-rail-collapsed')).toBe(false)
  })

  it('clears private local Studio continuity without removing preferences', () => {
    window.localStorage.setItem('omnia-prompt-history:user-1', '["portrait"]')
    window.localStorage.setItem('omnia-create-active-session:user-1', 'run-1')
    window.localStorage.setItem('oc-chat-visual-messages-v1', '[]')
    window.localStorage.setItem('oc-chat-project-map-v1', '{}')
    window.localStorage.setItem('oc-studio-cookie-preferences-v1', '{"analytics":false}')
    window.localStorage.setItem('oc-studio-rail-collapsed', 'true')

    expect(clearStudioLocalPrivateState()).toEqual({ removed: 4, failed: false })

    expect(window.localStorage.getItem('omnia-prompt-history:user-1')).toBeNull()
    expect(window.localStorage.getItem('omnia-create-active-session:user-1')).toBeNull()
    expect(window.localStorage.getItem('oc-chat-visual-messages-v1')).toBeNull()
    expect(window.localStorage.getItem('oc-chat-project-map-v1')).toBeNull()
    expect(window.localStorage.getItem('oc-studio-cookie-preferences-v1')).toBe('{"analytics":false}')
    expect(window.localStorage.getItem('oc-studio-rail-collapsed')).toBe('true')
  })
})
