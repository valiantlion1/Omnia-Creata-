import type { ReactNode } from 'react'
import clsx from 'clsx'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function InlineError({
  title,
  message,
  onRetry,
  retryLabel = 'Try again',
  retryDisabled = false,
  tone = 'danger',
  className,
  action,
}: {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  retryDisabled?: boolean
  tone?: 'danger' | 'warning'
  className?: string
  action?: ReactNode
}) {
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100'
      : 'border-rose-400/25 bg-rose-500/[0.08] text-rose-100'
  const iconClasses = tone === 'warning' ? 'text-amber-300' : 'text-rose-300'

  return (
    <div
      role="alert"
      className={clsx(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6',
        toneClasses,
        className,
      )}
    >
      <AlertTriangle className={clsx('mt-0.5 h-4 w-4 shrink-0', iconClasses)} />
      <div className="min-w-0 flex-1">
        {title ? <div className="text-sm font-semibold">{title}</div> : null}
        <p className={clsx('text-sm leading-6 opacity-90', title ? 'mt-1' : '')}>{message}</p>
        {onRetry || action ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                disabled={retryDisabled}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                {retryLabel}
              </button>
            ) : null}
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}
