import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function InlineActionMenu({
  children,
  placement = 'bottom',
}: {
  children: ReactNode
  placement?: 'bottom' | 'top'
}) {
  const placementClass = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'

  return (
    <div
      className={`absolute right-0 ${placementClass} z-[120] w-[min(224px,calc(100vw-2rem))] max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain rounded-[16px] bg-[#111216]/98 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/8 backdrop-blur-xl`}
      style={{ boxShadow: 'var(--border-glow), 0 24px 80px rgba(0,0,0,0.48)' }}
    >
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function MenuDivider() {
  return <div className="my-1 border-t border-white/[0.06]" />
}

export function MenuAction({
  children,
  tone = 'default',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      {...props}
      className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-[12.5px] leading-tight transition ${tone === 'danger' ? 'text-rose-300 hover:bg-rose-500/[0.08] hover:text-rose-200' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'} ${props.className ?? ''}`}
    >
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

export function EmptyInline({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <section
      className={`flex flex-col gap-4 py-8 ${compact ? 'min-h-[12vh] items-start justify-start text-left' : 'min-h-[22vh] items-center justify-center text-center'}`}
    >
      <div className={`group relative flex flex-col ${compact ? 'items-start text-left max-w-xl' : 'items-center text-center max-w-lg mx-auto py-10 px-8 rounded-[32px] bg-[#0c0d12]/50 ring-1 ring-white/[0.04] backdrop-blur-sm transition-all duration-500 hover:ring-white/[0.08] hover:bg-[#101116]/80'}`}>
        <div className={`relative flex items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1c1d24]/90 to-[#0c0d12]/80 text-zinc-400 ring-1 ring-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:text-white group-hover:ring-white/[0.18] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] ${compact ? 'h-14 w-14 mb-4' : 'h-16 w-16 mb-5'}`}>
          <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="relative z-10 drop-shadow-md">{icon}</div>
        </div>
        <div className="text-[16px] font-semibold tracking-tight text-white/95 transition-colors duration-300 group-hover:text-white">
          {title}
        </div>
        <div className="mt-2 text-[13px] leading-relaxed text-zinc-500 transition-colors duration-300 group-hover:text-zinc-400">
          {description}
        </div>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </section>
  )
}
