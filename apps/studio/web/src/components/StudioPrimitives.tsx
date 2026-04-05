import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { APP_BUILD_LABEL, APP_VERSION_LABEL } from '@/lib/appVersion'

export function AppPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={clsx('mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 md:px-5 xl:px-6', className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: {
  eyebrow: string
  title: string
  description?: string
  actions?: ReactNode
  aside?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end', className)}>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{eyebrow}</div>
        <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] md:text-4xl" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">{description}</p> : null}
        {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      {aside ? <div className="xl:justify-self-end">{aside}</div> : null}
    </div>
  )
}

export function Surface({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted' | 'raised'
}) {
  const toneMap = {
    default: 'border-white/[0.08] bg-[#141519]',
    muted: 'border-white/[0.06] bg-[#111216]',
    raised: 'border-white/[0.1] bg-[#17181d] shadow-[0_32px_90px_rgba(0,0,0,0.26)]',
  }

  return (
    <section
      className={clsx(
        'rounded-[26px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] md:p-6 transition-all duration-300 hover:border-[rgb(var() / )] hover:shadow-[0_24px_70px_rgba(0,0,0,0.25),0_0_0_1px_rgb(var() / )]',
        toneMap[tone],
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SurfaceHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-600">{eyebrow}</div> : null}
        <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-white md:text-2xl">{title}</h2>
        {description ? <p className="mt-2.5 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function ButtonChip({
  children,
  active = false,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs transition',
        active ? 'bg-white text-black' : 'bg-white/[0.04] text-zinc-300 ring-1 ring-white/8',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <Surface className={className}>{children}</Surface>
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <Surface tone="muted" className="min-h-[148px]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{label}</div>
      <div className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
    </Surface>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <section className="border-y border-dashed border-white/[0.06] py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-base text-white ring-1 ring-white/8">+</div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'
  className?: string
}) {
  const toneMap = {
    neutral: 'border-white/10 bg-white/[0.05] text-zinc-300',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    warning: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    danger: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    brand: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
  }

  return <span className={clsx('inline-flex rounded-full border px-2 py-1 text-[10px] font-medium', toneMap[tone], className)}>{children}</span>
}

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={clsx('border-t border-white/[0.04] pt-5 text-xs text-zinc-500', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>© OmniaCreata 2026</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-600">{APP_VERSION_LABEL}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-600">build {APP_BUILD_LABEL}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link to="/help#terms" className="transition hover:text-white">
            Terms
          </Link>
          <Link to="/help#privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link to="/help#usage-policy" className="transition hover:text-white">
            Usage Policy
          </Link>
          <Link to="/help#faq" className="transition hover:text-white">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  )
}

export function EditTextDialog({
  open,
  title,
  description,
  label,
  initialValue,
  placeholder,
  actionLabel = 'Save',
  busy = false,
  multiline = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  label: string
  initialValue: string
  placeholder?: string
  actionLabel?: string
  busy?: boolean
  multiline?: boolean
  onCancel: () => void
  onConfirm: (value: string) => void
}) {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (open) setValue(initialValue)
  }, [initialValue, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#101115] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{title}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{description}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            &times;
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-[11px] uppercase tracking-[0.2em] text-zinc-600">{label}</label>
          {multiline ? (
            <textarea
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              rows={5}
              className="mt-2 w-full resize-none rounded-[18px] bg-white/[0.03] px-4 py-3 text-sm leading-7 text-white outline-none ring-1 ring-white/8 transition focus:ring-white/20"
            />
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              className="mt-2 w-full rounded-[18px] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none ring-1 ring-white/8 transition focus:ring-white/20"
            />
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={busy || !value.trim() || value.trim() === initialValue.trim()}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Saving...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
