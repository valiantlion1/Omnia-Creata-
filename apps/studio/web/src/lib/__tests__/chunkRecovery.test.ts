import { describe, expect, it } from 'vitest'

import { chunkErrorMessage, isRecoverableChunkError } from '@/lib/chunkRecovery'

describe('chunkRecovery', () => {
  it('recognizes stale dynamic import failures', () => {
    expect(
      isRecoverableChunkError(
        new Error('TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:5173/assets/MediaLibrary-old.js'),
      ),
    ).toBe(true)
    expect(
      isRecoverableChunkError(
        new Error('ChunkLoadError: Loading chunk MediaLibrary failed.'),
      ),
    ).toBe(true)
  })

  it('ignores unrelated runtime errors', () => {
    expect(isRecoverableChunkError(new Error('Something unrelated happened'))).toBe(false)
  })

  it('normalizes unknown error values into readable strings', () => {
    expect(chunkErrorMessage('plain string')).toBe('plain string')
    expect(chunkErrorMessage({ foo: 'bar' })).toContain('object Object')
  })
})
