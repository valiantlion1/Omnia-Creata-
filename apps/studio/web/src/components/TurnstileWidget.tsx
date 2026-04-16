import { useEffect, useRef } from 'react'

type TurnstileTheme = 'auto' | 'dark' | 'light'

type TurnstileWidgetProps = {
  siteKey: string
  action: 'signup' | 'login'
  theme?: TurnstileTheme
  resetKey?: number
  onTokenChange: (token: string | null) => void
}

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action?: string
      theme?: TurnstileTheme
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
  remove?: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScriptPromise: Promise<void> | null = null

function loadTurnstileScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  if (window.turnstile) {
    return Promise.resolve()
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-oc-turnstile="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.dataset.ocTurnstile = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load.'))
    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

export function TurnstileWidget({
  siteKey,
  action,
  theme = 'dark',
  resetKey = 0,
  onTokenChange,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!siteKey) {
      onTokenChange(null)
      return
    }

    let cancelled = false
    let widgetId: string | null = null

    onTokenChange(null)

    void loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action,
          theme,
          callback: (token) => {
            if (!cancelled) {
              onTokenChange(token)
            }
          },
          'expired-callback': () => {
            if (!cancelled) {
              onTokenChange(null)
            }
          },
          'error-callback': () => {
            if (!cancelled) {
              onTokenChange(null)
            }
          },
        })
      })
      .catch(() => {
        if (!cancelled) {
          onTokenChange(null)
        }
      })

    return () => {
      cancelled = true
      onTokenChange(null)
      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId)
      } else if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [action, onTokenChange, resetKey, siteKey, theme])

  return (
    <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">Verification</div>
      <p className="mb-4 text-sm leading-6 text-zinc-400">
        Complete the quick check to protect Studio from automated sign-in abuse.
      </p>
      <div ref={containerRef} />
    </div>
  )
}
