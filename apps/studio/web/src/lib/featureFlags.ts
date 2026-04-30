function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false
  return fallback
}

// Chat is a first-class Studio surface by default. Set VITE_STUDIO_CHAT_ENABLED=0
// only for a deliberate image-only launch drill or emergency surface rollback.
export const IS_CHAT_ENABLED = readBooleanEnv(import.meta.env.VITE_STUDIO_CHAT_ENABLED, true)
