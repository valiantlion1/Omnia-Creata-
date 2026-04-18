import * as React from 'react'

export const COOKIE_PREFERENCES_KEY = 'oc-studio-cookie-preferences-v1'
const COOKIE_PREFERENCES_EVENT = 'oc-studio-cookie-preferences'

export type CookiePreferences = {
  analytics: boolean
  decided_at: string
  version: 1
}

type StudioCookiePreferencesContextValue = {
  preferences: CookiePreferences | null
  analyticsAllowed: boolean
  hasDecided: boolean
  isManagerOpen: boolean
  openPreferences: () => void
  closePreferences: () => void
  setAnalyticsConsent: (analytics: boolean) => void
}

const StudioCookiePreferencesContext = React.createContext<StudioCookiePreferencesContextValue | null>(null)

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>
    if (typeof parsed.analytics !== 'boolean') return null
    return {
      analytics: parsed.analytics,
      decided_at: typeof parsed.decided_at === 'string' ? parsed.decided_at : new Date().toISOString(),
      version: 1,
    }
  } catch {
    return null
  }
}

function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT))
}

export function getCookiePreferenceSummary(preferences: CookiePreferences | null) {
  if (!preferences) return 'Not decided yet'
  return preferences.analytics ? 'Analytics allowed' : 'Essential only'
}

export function StudioCookiePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<CookiePreferences | null>(() => readCookiePreferences())
  const [isManagerOpen, setIsManagerOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const sync = () => setPreferences(readCookiePreferences())
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === COOKIE_PREFERENCES_KEY) {
        sync()
      }
    }

    window.addEventListener(COOKIE_PREFERENCES_EVENT, sync)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(COOKIE_PREFERENCES_EVENT, sync)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const openPreferences = React.useCallback(() => {
    setIsManagerOpen(true)
  }, [])

  const closePreferences = React.useCallback(() => {
    setIsManagerOpen(false)
  }, [])

  const setAnalyticsConsent = React.useCallback((analytics: boolean) => {
    const nextPreferences: CookiePreferences = {
      analytics,
      decided_at: new Date().toISOString(),
      version: 1,
    }
    writeCookiePreferences(nextPreferences)
    setPreferences(nextPreferences)
    setIsManagerOpen(false)
  }, [])

  const value = React.useMemo<StudioCookiePreferencesContextValue>(
    () => ({
      preferences,
      analyticsAllowed: Boolean(preferences?.analytics),
      hasDecided: preferences !== null,
      isManagerOpen,
      openPreferences,
      closePreferences,
      setAnalyticsConsent,
    }),
    [closePreferences, isManagerOpen, openPreferences, preferences, setAnalyticsConsent],
  )

  return <StudioCookiePreferencesContext.Provider value={value}>{children}</StudioCookiePreferencesContext.Provider>
}

export function useStudioCookiePreferences() {
  const context = React.useContext(StudioCookiePreferencesContext)
  if (!context) {
    throw new Error('useStudioCookiePreferences must be used inside StudioCookiePreferencesProvider')
  }
  return context
}
