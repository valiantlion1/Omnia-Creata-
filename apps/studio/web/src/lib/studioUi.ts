import * as React from 'react'

export type StudioTheme = 'default' | 'cyberpunk' | 'sunset' | 'ocean' | 'emerald' | 'royal' | 'aurora' | 'dusk'

export const THEME_OPTIONS: Array<{ id: StudioTheme; label: string; colors: [string, string] }> = [
  { id: 'default', label: 'Midnight', colors: ['#7c3aed', '#6366f1'] },
  { id: 'ocean', label: 'Ocean', colors: ['#06b6d4', '#3b82f6'] },
  { id: 'aurora', label: 'Aurora', colors: ['#22d3ee', '#34d399'] },
  { id: 'cyberpunk', label: 'Cyberpunk', colors: ['#00ffff', '#ff0080'] },
  { id: 'sunset', label: 'Sunset', colors: ['#f97316', '#ef4444'] },
  { id: 'emerald', label: 'Emerald', colors: ['#10b981', '#22c55e'] },
  { id: 'royal', label: 'Royal', colors: ['#a855f7', '#ec4899'] },
  { id: 'dusk', label: 'Dusk', colors: ['#d9a72d', '#facc15'] },
]

type StudioUiPrefs = {
  tipsEnabled: boolean
  dismissedTipIds: string[]
  theme: StudioTheme
}

const STORAGE_KEY = 'oc-studio-ui-prefs'

const DEFAULT_PREFS: StudioUiPrefs = {
  tipsEnabled: true,
  dismissedTipIds: [],
  theme: 'default',
}

function readPrefs(): StudioUiPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_PREFS

  try {
    const parsed = JSON.parse(raw) as Partial<StudioUiPrefs>
    return {
      tipsEnabled: parsed.tipsEnabled ?? true,
      dismissedTipIds: Array.isArray(parsed.dismissedTipIds) ? parsed.dismissedTipIds : [],
      theme: parsed.theme ?? 'default',
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(value: StudioUiPrefs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent('oc-studio-ui-prefs'))
}

function applyThemeClass(theme: StudioTheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  // Remove all theme classes
  THEME_OPTIONS.forEach((t) => {
    if (t.id !== 'default') root.classList.remove(`theme-${t.id}`)
  })
  // Apply new theme
  if (theme !== 'default') {
    root.classList.add(`theme-${theme}`)
  }
}

export function useStudioUiPrefs() {
  const [prefs, setPrefs] = React.useState<StudioUiPrefs>(() => readPrefs())

  // Apply theme on mount and when it changes
  React.useEffect(() => {
    applyThemeClass(prefs.theme)
  }, [prefs.theme])

  React.useEffect(() => {
    const sync = () => setPrefs(readPrefs())
    window.addEventListener('oc-studio-ui-prefs', sync)
    return () => window.removeEventListener('oc-studio-ui-prefs', sync)
  }, [])

  const updatePrefs = React.useCallback((updater: (current: StudioUiPrefs) => StudioUiPrefs) => {
    const next = updater(readPrefs())
    setPrefs(next)
    writePrefs(next)
  }, [])

  const setTipsEnabled = React.useCallback((enabled: boolean) => {
    updatePrefs((current) => ({ ...current, tipsEnabled: enabled }))
  }, [updatePrefs])

  const setTheme = React.useCallback((theme: StudioTheme) => {
    updatePrefs((current) => ({ ...current, theme }))
  }, [updatePrefs])

  const dismissTip = React.useCallback((tipId: string) => {
    updatePrefs((current) => ({
      ...current,
      dismissedTipIds: current.dismissedTipIds.includes(tipId)
        ? current.dismissedTipIds
        : [...current.dismissedTipIds, tipId],
    }))
  }, [updatePrefs])

  const resetTips = React.useCallback(() => {
    updatePrefs((current) => ({ ...current, dismissedTipIds: [] }))
  }, [updatePrefs])

  return {
    prefs,
    setTipsEnabled,
    setTheme,
    dismissTip,
    resetTips,
  }
}
