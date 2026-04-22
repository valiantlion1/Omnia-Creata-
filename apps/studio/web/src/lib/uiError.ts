const TECHNICAL_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /loading chunk [\w-]+ failed/i,
  /chunkloaderror/i,
  /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError)\b/,
  /\b(?:traceback|stack trace|exception)\b/i,
  /\bat\s+(?:https?:\/\/|\/|[A-Z]:\\)/i,
  /https?:\/\/\S+/i,
  /\/assets\/\S+\.(?:js|css|map)/i,
  /\b(?:module script|imported module|source map|sourcemap)\b/i,
  /\b(?:cannot read properties of|undefined is not a function|unexpected token|null is not an object)\b/i,
  /\brequest failed with\s+\d{3}\b/i,
  /\b(?:failed to fetch|networkerror when attempting to fetch resource)\b/i,
  /<[a-z!/][^>]*>/i,
]

function errorText(value: unknown): string | null {
  if (value instanceof Error) {
    return typeof value.message === 'string' && value.message.trim()
      ? value.message
      : value.toString()
  }
  if (typeof value === 'string' && value.trim()) return value
  return null
}

function normalizeMessage(message: string) {
  return message.replace(/\s+/g, ' ').trim()
}

export function isTechnicalErrorMessage(value: unknown) {
  const message = errorText(value)
  if (!message) return false

  const normalized = normalizeMessage(message)
  if (!normalized) return false
  if (normalized.length > 180) return true
  if (normalized.startsWith('{') || normalized.startsWith('[')) return true

  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function toUserFacingErrorMessage(value: unknown, fallback: string) {
  const message = errorText(value)
  if (!message) return fallback

  const normalized = normalizeMessage(message)
  if (!normalized || isTechnicalErrorMessage(normalized)) {
    return fallback
  }

  return normalized
}
