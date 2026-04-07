const AUTH_TRACE_KEY = 'oc-studio-auth-trace'
const MAX_TRACE_ENTRIES = 60

type AuthTracePayload = Record<string, unknown>

function readAuthTraceEntries() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.sessionStorage.getItem(AUTH_TRACE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function logAuthTrace(event: string, details: AuthTracePayload = {}) {
  const entry = {
    event,
    at: new Date().toISOString(),
    details,
  }

  if (typeof window !== 'undefined') {
    const entries = readAuthTraceEntries()
    entries.push(entry)
    window.sessionStorage.setItem(AUTH_TRACE_KEY, JSON.stringify(entries.slice(-MAX_TRACE_ENTRIES)))
  }

  console.info('[StudioAuth]', event, details)
}

