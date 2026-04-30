import { useEffect, useState } from 'react'

import { useStudioCookiePreferences } from '@/lib/studioCookiePreferences'

export function CookieConsentBanner({ analyticsAvailable }: { analyticsAvailable: boolean }) {
  const { hasDecided, openPreferences, setAnalyticsConsent } = useStudioCookiePreferences()

  if (!analyticsAvailable || hasDecided) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0c0c10]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Cookie choices</p>
            <p className="max-w-2xl text-sm text-zinc-300">
              Essential cookies keep Studio secure. Optional analytics stay off unless you accept them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPreferences}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
            >
              Manage
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsConsent(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
            >
              Reject optional
            </button>
            <button
              type="button"
              onClick={() => setAnalyticsConsent(true)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Accept optional
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
    setAnalyticsConsent,
  } = useStudioCookiePreferences()
  const [analyticsDraft, setAnalyticsDraft] = useState(false)

  useEffect(() => {
    if (!isManagerOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePreferences()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closePreferences, isManagerOpen])

  useEffect(() => {
    if (!isManagerOpen) return
    setAnalyticsDraft(analyticsAvailable ? analyticsAllowed : false)
  }, [analyticsAllowed, analyticsAvailable, isManagerOpen])

  if (!isManagerOpen) return null

  const saveChoices = () => setAnalyticsConsent(analyticsAvailable ? analyticsDraft : false)

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm"
      onClick={closePreferences}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cookie preferences"
        className="max-h-[calc(100vh-3rem)] w-full max-w-[520px] overflow-hidden rounded-[18px] border border-white/10 bg-[#11100d] shadow-[0_28px_90px_rgba(0,0,0,0.58)] ring-1 ring-[#b9964b]/15"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9964b]">Privacy choices</div>
            <h2 className="mt-2 text-xl font-semibold text-white">Cookie preferences</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              {analyticsAvailable
                ? 'Choose whether Studio can use optional analytics in this browser.'
                : 'Only necessary cookies are active in this browser.'}
            </p>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b9964b]/70"
          >
            Close
          </button>
        </div>

        <div className="space-y-0 px-5">
          <section className="border-b border-white/[0.08] py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Necessary cookies</div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Required for sign-in, security, and core Studio features.
                </p>
              </div>
              <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-[#b9964b]/25 bg-[#b9964b]/10 px-3 py-1 text-xs font-medium text-[#e0c77a]">
                Always active
              </span>
            </div>
          </section>

          <section className="py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Optional analytics</div>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Helps us improve reliability and product flow.
                </p>
              </div>
              {analyticsAvailable ? (
                <button
                  type="button"
                  role="switch"
                  aria-checked={analyticsDraft}
                  aria-label="Optional analytics"
                  onClick={() => setAnalyticsDraft((current) => !current)}
                  className={`mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b9964b]/70 ${
                    analyticsDraft
                      ? 'border-[#d4af5b]/50 bg-[#d4af5b]'
                      : 'border-white/15 bg-white/[0.08]'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      analyticsDraft ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              ) : (
                <span className="mt-0.5 inline-flex shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-zinc-300">
                  Not in use
                </span>
              )}
            </div>
            {!analyticsAvailable ? (
              <p className="mt-3 text-xs leading-5 text-[#e0c77a]">
                Optional analytics are unavailable, so only necessary cookies are active.
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.08] bg-black/20 px-5 py-4">
          <a href="/legal/cookies" className="text-xs font-medium text-zinc-400 transition hover:text-white">
            Cookie Policy
          </a>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {analyticsAvailable ? (
              <button
                type="button"
                onClick={() => setAnalyticsConsent(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b9964b]/70"
              >
                Reject optional
              </button>
            ) : null}
            <button
              type="button"
              onClick={saveChoices}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b9964b]/70"
            >
              Save choices
            </button>
            {analyticsAvailable ? (
              <button
                type="button"
                onClick={() => setAnalyticsConsent(true)}
                className="rounded-full bg-[#d4af5b] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#e0c77a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b9964b]/70"
              >
                Accept optional
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
