import { useEffect } from 'react'

import { getCookiePreferenceSummary, useStudioCookiePreferences } from '@/lib/studioCookiePreferences'

function formatDecisionTimestamp(value: string | null) {
  if (!value) return null
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return null
  return timestamp.toLocaleString()
}

export function CookieConsentBanner({ analyticsAvailable }: { analyticsAvailable: boolean }) {
  const { hasDecided, openPreferences, setAnalyticsConsent } = useStudioCookiePreferences()

  if (!analyticsAvailable || hasDecided) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0c0c10]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Studio analytics preference</p>
            <p className="max-w-2xl text-sm text-zinc-300">
              Essential storage keeps Studio signed in. Optional analytics only starts if you allow it, so we can measure aggregate product quality without forcing tracking by default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPreferences}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
            >
              Manage options
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsConsent(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsConsent(true)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Allow analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CookiePreferencesDialog({ analyticsAvailable }: { analyticsAvailable: boolean }) {
  const {
    analyticsAllowed,
    closePreferences,
    isManagerOpen,
    preferences,
    setAnalyticsConsent,
  } = useStudioCookiePreferences()

  useEffect(() => {
    if (!isManagerOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreferences()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePreferences, isManagerOpen])

  if (!isManagerOpen) return null

  const savedAt = formatDecisionTimestamp(preferences?.decided_at ?? null)
  const summary = getCookiePreferenceSummary(preferences)

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
      onClick={closePreferences}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="w-full max-w-2xl rounded-[28px] border border-white/[0.08] bg-[#0c0d12]/92 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.04] backdrop-blur-3xl md:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">Privacy</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Cookie preferences</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Essential storage stays on so Studio can keep your session secure. Optional analytics only runs when you allow it for this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Essential storage</div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Required for sign-in, security checks, and keeping the Studio shell working correctly.
                </p>
              </div>
              <span className="inline-flex w-max rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                Always on
              </span>
            </div>
          </section>

          <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Analytics and performance</div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Measures aggregate usage and product-quality signals with PostHog so we can improve Studio without turning tracking on by default.
                </p>
              </div>
              <span
                className={`inline-flex w-max rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  analyticsAvailable
                    ? analyticsAllowed
                      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/10 bg-white/[0.05] text-zinc-300'
                    : 'border-amber-400/20 bg-amber-400/10 text-amber-100'
                }`}
              >
                {!analyticsAvailable ? 'Unavailable here' : analyticsAllowed ? 'Allowed' : 'Off'}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAnalyticsConsent(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  !analyticsAllowed
                    ? 'bg-white text-black'
                    : 'border border-white/10 text-zinc-200 hover:border-white/20 hover:text-white'
                }`}
              >
                Essential only
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsConsent(true)}
                disabled={!analyticsAvailable}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  analyticsAllowed
                    ? 'bg-white text-black'
                    : 'border border-white/10 text-zinc-200 hover:border-white/20 hover:text-white'
                } disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:text-zinc-600`}
              >
                Allow analytics
              </button>
            </div>
            {!analyticsAvailable ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/80">
                Analytics are not configured in this environment, so Studio is running in essential-only mode.
              </p>
            ) : null}
          </section>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
          <span>Current choice: {summary}</span>
          {savedAt ? <span>Saved {savedAt}</span> : <span>No choice saved yet for this browser.</span>}
        </div>
      </div>
    </div>
  )
}
