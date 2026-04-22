import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

import { APP_BUILD_LABEL } from '@/lib/appVersion'

const RECOVERY_PREFIX = `oc-studio-chunk-recovery:${APP_BUILD_LABEL}:`
const RECOVERABLE_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /loading chunk [\w-]+ failed/i,
  /dynamically imported module/i,
]

export function chunkErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  if (typeof error === 'string' && error.trim()) return error.trim()
  return String(error ?? '').trim()
}

export function isRecoverableChunkError(error: unknown) {
  const message = chunkErrorMessage(error)
  if (!message) return false
  return RECOVERABLE_PATTERNS.some((pattern) => pattern.test(message))
}

function recoveryKey(scope: string) {
  return `${RECOVERY_PREFIX}${scope}`
}

export function clearChunkRecovery(scope: string) {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(recoveryKey(scope))
}

export function reloadStudioWindow() {
  if (typeof window === 'undefined') return
  window.location.reload()
}

export function tryRecoverChunkError(error: unknown, scope: string) {
  if (typeof window === 'undefined' || !isRecoverableChunkError(error)) return false

  const key = recoveryKey(scope)
  if (window.sessionStorage.getItem(key) === '1') {
    return false
  }

  window.sessionStorage.setItem(key, '1')
  reloadStudioWindow()
  return true
}

export function lazyWithChunkRecovery<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  scope: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importer()
      clearChunkRecovery(scope)
      return module
    } catch (error) {
      if (tryRecoverChunkError(error, scope)) {
        return new Promise<never>(() => {})
      }
      throw error instanceof Error ? error : new Error(chunkErrorMessage(error) || 'Route failed to load.')
    }
  })
}
