import type { ReactNode } from 'react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'

export function AppPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={clsx('mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-4 py-6 md:px-5 xl:px-6', className)}>{children}</div>
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
        <h1 className="mt-2 max-w-4xl text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{title}</h1>
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
        'rounded-[26px] border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)] md:p-6',
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
    <Surface tone="muted" className="border-dashed text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-lg text-white ring-1 ring-white/8">+</div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Surface>
  )
}

export function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand'
}) {
  const toneMap = {
    neutral: 'border-white/10 bg-white/[0.05] text-zinc-300',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    warning: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
    danger: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    brand: 'border-violet-300/20 bg-violet-300/10 text-violet-100',
  }

  return <span className={clsx('inline-flex rounded-full border px-2 py-1 text-[10px] font-medium', toneMap[tone])}>{children}</span>
}

export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={clsx('border-t border-white/[0.04] pt-5 text-xs text-zinc-500', className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>OmniaCreata TM 2026</div>
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
