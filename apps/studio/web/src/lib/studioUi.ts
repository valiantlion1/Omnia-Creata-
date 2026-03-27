import * as React from 'react'

type StudioUiPrefs = {
  tipsEnabled: boolean
  dismissedTipIds: string[]
}

const STORAGE_KEY = 'oc-studio-ui-prefs'

const DEFAULT_PREFS: StudioUiPrefs = {
  tipsEnabled: true,
  dismissedTipIds: [],
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

export function useStudioUiPrefs() {
  const [prefs, setPrefs] = React.useState<StudioUiPrefs>(() => readPrefs())

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
    dismissTip,
    resetTips,
  }
}
