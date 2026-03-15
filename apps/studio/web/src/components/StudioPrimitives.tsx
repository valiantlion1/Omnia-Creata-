import type { ReactNode } from 'react'
import clsx from 'clsx'

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
  return (
    <div className="flex flex-col gap-5 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 md:flex-row md:items-end md:justify-between md:p-8">
      <div className="max-w-3xl">
        <div className="mb-3 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
          {eyebrow}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  )
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.18)]', className)}>
      {children}
    </div>
  )
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
    <Panel className="min-h-[150px]">
      <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">{label}</div>
      <div className="mt-6 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
    </Panel>
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
    <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] text-xl text-white">+</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
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
    brand: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100',
  }

  return <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium', toneMap[tone])}>{children}</span>
}
