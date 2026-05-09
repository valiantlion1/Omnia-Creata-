import * as React from 'react'

export const COOKIE_PREFERENCES_KEY = 'oc-studio-cookie-preferences-v1'
const COOKIE_PREFERENCES_EVENT = 'oc-studio-cookie-preferences'

export type CookiePreferences = {
  analytics: boolean
  decided_at: string
  version: 1
}

type NavigatorWithGlobalPrivacyControl = Navigator & {
  globalPrivacyControl?: boolean
}

type StudioCookiePreferencesContextValue = {
  preferences: CookiePreferences | null
  analyticsAllowed: boolean
  globalPrivacyControl: boolean
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

export function isGlobalPrivacyControlEnabled() {
  if (typeof navigator === 'undefined') return false
  return (navigator as NavigatorWithGlobalPrivacyControl).globalPrivacyControl === true
}

function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT))
}

export function getCookiePreferenceSummary(preferences: CookiePreferences | null, globalPrivacyControl = false) {
  if (globalPrivacyControl) return 'Essential only (Global Privacy Control)'
  if (!preferences) return 'Not decided yet'
  return preferences.analytics ? 'Analytics allowed' : 'Essential only'
}

export function StudioCookiePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<CookiePreferences | null>(() => readCookiePreferences())
  const [globalPrivacyControl, setGlobalPrivacyControl] = React.useState(() => isGlobalPrivacyControlEnabled())
  const [isManagerOpen, setIsManagerOpen] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const sync = () => {
      setPreferences(readCookiePreferences())
      setGlobalPrivacyControl(isGlobalPrivacyControlEnabled())
    }
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
    const globalSignalActive = isGlobalPrivacyControlEnabled()
    const nextPreferences: CookiePreferences = {
      analytics: globalSignalActive ? false : analytics,
      decided_at: new Date().toISOString(),
      version: 1,
    }
    writeCookiePreferences(nextPreferences)
    setPreferences(nextPreferences)
    setGlobalPrivacyControl(globalSignalActive)
    setIsManagerOpen(false)
  }, [])

  const value = React.useMemo<StudioCookiePreferencesContextValue>(
    () => ({
      preferences,
      analyticsAllowed: Boolean(preferences?.analytics) && !globalPrivacyControl,
      globalPrivacyControl,
      hasDecided: preferences !== null || globalPrivacyControl,
      isManagerOpen,
      openPreferences,
      closePreferences,
      setAnalyticsConsent,
    }),
    [closePreferences, globalPrivacyControl, isManagerOpen, openPreferences, preferences, setAnalyticsConsent],
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
