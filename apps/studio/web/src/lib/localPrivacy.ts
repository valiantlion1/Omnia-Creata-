const PRIVATE_STORAGE_KEYS = new Set([
  'omnia-prompt-history',
  'oc-chat-visual-messages-v1',
  'oc-chat-project-map-v1',
])

const PRIVATE_STORAGE_PREFIXES = [
  'omnia-prompt-history:',
  'omnia-create-active-session:',
]

export type LocalPrivateStateClearResult = {
  removed: number
  failed: boolean
}

export function isStudioLocalPrivateStorageKey(key: string) {
  return PRIVATE_STORAGE_KEYS.has(key) || PRIVATE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
}

export function clearStudioLocalPrivateState(storage?: Storage): LocalPrivateStateClearResult {
  const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined)
  if (!target) return { removed: 0, failed: true }

  try {
    const keys = Array.from({ length: target.length }, (_, index) => target.key(index)).filter(
      (key): key is string => Boolean(key),
    )
    let removed = 0

    for (const key of keys) {
      if (!isStudioLocalPrivateStorageKey(key)) continue
      target.removeItem(key)
      removed += 1
    }

    return { removed, failed: false }
  } catch {
    return { removed: 0, failed: true }
  }
}
