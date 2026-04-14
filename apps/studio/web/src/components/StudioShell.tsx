import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  ChevronDown,
  Compass,
  CreditCard,
  Folder,
  History,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Menu,
  PanelLeft,
  PenSquare,
  LogOut,
  Settings,
  Sparkles,
  SwatchBook,
  Trash2,
  UserCircle2,
  X,
} from 'lucide-react'

import { LegalFooter } from '@/components/StudioPrimitives'
import { InlineBadge } from '@/components/VerificationBadge'
import { APP_VERSION_LABEL } from '@/lib/appVersion'
import { studioApi } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  aliases?: string[]
  exactAliases?: string[]
  expandOnMainClick?: boolean
}

type NavChild = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  kind?: 'action' | 'history'
  id?: string
}

const primaryNav: NavItem[] = [
  { to: '/explore', label: 'Explore', icon: Compass, aliases: ['/community'] },
  { to: '/create', label: 'Create', icon: Sparkles },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
]

const libraryNav: NavItem[] = [
  { to: '/library/images', label: 'My images', icon: ImageIcon, aliases: ['/media', '/history'], exactAliases: ['/library'] },
  { to: '/library/projects', label: 'Projects', icon: Folder, aliases: ['/library/collections', '/projects'] },
  { to: '/library/likes', label: 'Favorites', icon: Heart },
  { to: '/library/trash', label: 'Trash', icon: Trash2 },
]

const elementsNav: NavItem[] = [{ to: '/elements/styles', label: 'Styles', icon: SwatchBook, aliases: ['/elements'] }]

const utilityNav: NavItem[] = [
  { to: '/help', label: 'Help', icon: BookOpen, aliases: ['/docs', '/faq', '/terms', '/privacy', '/usage-policy', '/learn'] },
  { to: '/subscription', label: 'Subscription', icon: CreditCard, aliases: ['/billing', '/plan'] },
  { to: '/settings', label: 'Settings', icon: Settings, aliases: ['/profile'], expandOnMainClick: true },
]

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return true
  if (item.exactAliases?.some((alias) => pathname === alias)) return true
  return item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)) ?? false
}

function Section({
  title,
  items,
  pathname,
  search = '',
  collapsed = false,
  getChildren,
  renderExpandedPanel,
  expandedItems,
  onToggleItem,
  onNavigate,
}: {
  title?: string
  items: NavItem[]
  pathname: string
  search?: string
  collapsed?: boolean
  getChildren?: (item: NavItem) => NavChild[]
  renderExpandedPanel?: (item: NavItem) => ReactNode
  expandedItems?: Record<string, boolean>
  onToggleItem?: (item: NavItem) => void
  onNavigate?: () => void
}) {
  const currentRoute = `${pathname}${search}`

  return (
    <div className="mb-4">
      {title && !collapsed ? (
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{title}</div>
      ) : title ? (
        <div className="mx-auto mb-2 h-px w-5 bg-white/[0.06]" />
      ) : null}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item)
          const childItems = collapsed ? [] : getChildren?.(item) ?? []
          const expandedPanel = collapsed ? null : renderExpandedPanel?.(item) ?? null
          const expandable = Boolean(childItems.length || expandedPanel)
          const isExpanded = Boolean(expandedItems?.[item.to])
          const actionChildren = childItems.filter((child) => child.kind !== 'history')
          const historyChildren = childItems.filter((child) => child.kind === 'history')
          const rowClasses = `relative flex min-w-0 items-center rounded-xl px-3 py-2.5 text-[13px] transition ${
            active ? 'bg-white/[0.06] text-white font-semibold' : 'text-zinc-400 hover:bg-white/[0.03] hover:text-white font-medium'
          }`
          const activeBar = active ? (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)]" />
          ) : null
          return (
            <div key={item.to}>
              <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                {item.expandOnMainClick && expandable && !collapsed ? (
                  <button
                    onClick={() => onToggleItem?.(item)}
                    title={item.label}
                    className={`${rowClasses} flex-1 gap-2.5 text-left`}
                    aria-expanded={isExpanded}
                  >
                    {activeBar}
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{item.label}</span>
                  </button>
                ) : (
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`${rowClasses} ${collapsed ? 'justify-center' : 'flex-1 gap-2.5'}`}
                  >
                    {!collapsed && activeBar}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate font-medium">{item.label}</span> : null}
                  </Link>
                )}

                {!collapsed && expandable ? (
                  item.expandOnMainClick ? (
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={`Open ${item.label}`}
                      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => onToggleItem?.(item)}
                      title={isExpanded ? `Hide ${item.label} options` : `Show ${item.label} options`}
                      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                    </button>
                  )
                ) : null}
              </div>

              {isExpanded && expandable ? (
                <div className="mt-1 space-y-1 pl-4">
                  {expandedPanel}

                  {actionChildren.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = currentRoute === child.to
                    return (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] transition ${
                          childActive ? 'bg-white/[0.07] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    )
                  })}

                  {historyChildren.length ? <div className="px-3 pt-1 text-[9px] uppercase tracking-[0.22em] text-zinc-700">History</div> : null}

                  {historyChildren.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = currentRoute === child.to
                    return (
                      <div key={child.to} className="group relative flex items-center">
                        <Link
                          to={child.to}
                          onClick={onNavigate}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[12px] transition ${
                            childActive ? 'bg-white/[0.07] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate font-medium pr-6">{child.label}</span>
                        </Link>
                        {child.id && (
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (window.confirm('Delete this chat?')) {
                                studioApi.deleteConversation(child.id!).then(() => {
                                  window.location.reload()
                                })
                              }
                            }}
                            className="absolute right-2 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:bg-white/10 hover:text-rose-400 rounded-lg transition"
                            title="Delete Chat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StudioShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { auth, isAuthenticated, isAuthSyncing, isLoading, signOut } = useStudioAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const isGuestShell = !canLoadPrivate

  useEffect(() => {
    const saved = window.localStorage.getItem('oc-studio-rail-collapsed')
    if (saved === 'true') setDesktopCollapsed(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('oc-studio-rail-collapsed', desktopCollapsed ? 'true' : 'false')
  }, [desktopCollapsed])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    if (location.pathname.startsWith('/chat')) next['/chat'] = true
    if (location.pathname.startsWith('/settings')) next['/settings'] = true
    if (!Object.keys(next).length) return
    setExpandedItems((current) => ({ ...next, ...current }))
  }, [location.pathname])



  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => studioApi.listConversations(),
    enabled: canLoadPrivate,
    staleTime: 30_000,
  })

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => studioApi.getMyProfile(),
    enabled: canLoadPrivate,
    staleTime: 30_000,
  })

  const chatChildren = useMemo<NavChild[]>(() => {
    const items: NavChild[] = [{ to: '/chat?new=1', label: 'New chat', icon: PenSquare, kind: 'action' }]
    const history = conversationsQuery.data?.conversations ?? []

    return items.concat(
      history.slice(0, 5).map((conversation) => ({
        to: `/chat?conversation=${conversation.id}`,
        label: conversation.title,
        id: conversation.id,
        icon: History,
        kind: 'history',
      })),
    )
  }, [conversationsQuery.data])

  const usageSummary = profileQuery.data?.profile.usage_summary || (auth ? {
    allowance: auth.plan.monthly_credits,
    credits_remaining: auth.credits.remaining,
    plan_label: auth.plan.label,
    progress_percent: auth.plan.monthly_credits > 0 ? ((auth.plan.monthly_credits - auth.credits.monthly_remaining) / auth.plan.monthly_credits) * 100 : 0
  } : undefined)
  const hasInternalAccess = Boolean((auth?.identity.owner_mode || auth?.identity.root_admin) && auth?.plan.can_generate)
  const usagePercent = usageSummary ? Math.max(0, 100 - usageSummary.progress_percent) : 0

  const getItemChildren = (item: NavItem) => {
    if (item.to === '/chat') return chatChildren
    return []
  }

  const renderExpandedPanel = (item: NavItem) => {
    if (item.to !== '/settings' || desktopCollapsed) return null

    if (!canLoadPrivate) {
      return (
        <div className="rounded-[20px] border border-white/[0.06] bg-black/20 p-3 ring-1 ring-white/[0.04]">
          <div className="text-sm font-semibold text-white">Public access</div>
          <div className="mt-1 text-xs leading-6 text-zinc-500">Explore and Help stay open. Compose, Chat, Library, and account actions unlock after sign in.</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/login?next=%2Fexplore"
              onClick={() => setMobileOpen(false)}
              className="rounded-2xl bg-white/[0.04] px-3 py-2 text-center text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              onClick={() => setMobileOpen(false)}
              className="rounded-2xl bg-white px-3 py-2 text-center text-[12px] font-semibold text-black transition hover:opacity-90"
            >
              Create account
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-black/20 p-3 ring-1 ring-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center truncate text-sm font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}<InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} /></div>
            <div className="mt-1 text-xs text-zinc-500">{auth?.guest ? 'Guest mode' : auth?.plan.label ?? 'Free'}</div>
          </div>
          <div className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 ring-1 ring-white/[0.06]">
            {hasInternalAccess ? 'Owner access' : `${auth?.credits.remaining ?? 0} credits`}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/account"
            onClick={() => setMobileOpen(false)}
            className="rounded-2xl bg-white/[0.04] px-3 py-2 text-center text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
          >
            Account
          </Link>
          <Link
            to="/subscription"
            onClick={() => setMobileOpen(false)}
            className="rounded-2xl bg-white/[0.04] px-3 py-2 text-center text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
          >
            Billing
          </Link>
        </div>
        <Link
          to="/help#faq"
          onClick={() => setMobileOpen(false)}
          className="mt-2 block rounded-2xl bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          FAQ and policy
        </Link>
      </div>
    )
  }

  const handleToggleItem = (item: NavItem) => {
    const expandable = Boolean(getItemChildren(item).length || renderExpandedPanel(item))
    if (!expandable) return
    setExpandedItems((current) => ({ ...current, [item.to]: !current[item.to] }))
    setMobileOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    setMobileOpen(false)
    navigate('/landing')
  }

  const rail = (collapsed: boolean) => (
    <>
      <div className={`flex h-[78px] items-center border-b border-white/[0.015] ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
        <Link to="/landing" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`} title="Open Omnia Creata landing page">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
          </div>
          {!collapsed ? (
            <div className="min-w-0 overflow-hidden">
              <div className="whitespace-nowrap text-sm font-semibold tracking-tight text-white/95">Omnia Creata</div>
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Studio</div>
            </div>
          ) : null}
        </Link>
      </div>

      <div className={`flex-1 overflow-y-auto px-3 py-4 ${collapsed ? 'pt-5' : ''}`}>
        <Section
          items={primaryNav}
          pathname={location.pathname}
          search={location.search}
          collapsed={collapsed}
          getChildren={getItemChildren}
          renderExpandedPanel={renderExpandedPanel}
          expandedItems={expandedItems}
          onToggleItem={handleToggleItem}
          onNavigate={() => setMobileOpen(false)}
        />
        <Section title="Library" items={libraryNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        <Section title="Elements" items={elementsNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        <Section items={utilityNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="relative border-t border-white/[0.015] p-2.5">
        {/* Usage bar — always visible for logged-in users */}
        {!isGuestShell && !collapsed && usageSummary && !hasInternalAccess ? (
          <div className="mb-3 space-y-1.5 px-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))' }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>{usageSummary.credits_remaining ?? auth?.credits.remaining ?? 0} credits left</span>
              <span>{usageSummary.allowance} monthly</span>
            </div>
          </div>
        ) : null}
        {/* User row */}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
          <Link
            to={isGuestShell ? '/signup' : '/account'}
            className={`min-w-0 flex-1 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04] ${collapsed ? 'flex h-10 w-10 items-center justify-center bg-white/[0.05] rounded-full' : 'flex items-center gap-2.5'}`}
            title={isGuestShell ? 'Create an account' : 'Open profile'}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[rgb(var(--primary-light)/0.2)] to-[rgb(var(--accent)/0.2)] text-sm font-bold text-white ring-1 ring-white/[0.12] shadow-sm">
              {auth?.identity?.avatar_url ? (
                <img src={auth.identity.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()
              )}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="flex items-center truncate text-[13px] font-semibold text-white/95">{auth?.identity.display_name ?? 'Guest'}<InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} /></div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {isGuestShell
                    ? 'Public explore'
                    : `${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'}`}
                </div>
              </div>
            ) : null}
          </Link>

          {/* Log out — directly visible, no ... menu needed */}
          {!isGuestShell ? (
            <button
              onClick={handleSignOut}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-rose-500/[0.1] hover:text-rose-400"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
              title="Log in"
            >
              <LogOut className="h-4 w-4 rotate-180" />
            </Link>
          )}
        </div>
        
        {/* Version */}
        {!collapsed && (
          <div className="mt-4 px-1 text-[10px] text-center font-medium text-zinc-600/50">
            {APP_VERSION_LABEL}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#0b0b0d] text-white">
      <div className="fx-layer">
        <div className="fx-glow fx-glow-1" />
        <div className="fx-glow fx-glow-2" />
        <div className="fx-glow fx-glow-3" />
        <div className="noise-overlay" />
      </div>
      <aside
        className={`group/sidebar relative z-10 hidden shrink-0 overflow-visible transition-[width] duration-[400ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] lg:flex lg:flex-col ${
          desktopCollapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
        style={{
          background: 'linear-gradient(180deg, rgba(14,14,22,0.92) 0%, rgba(10,10,16,0.96) 100%)',
          backdropFilter: 'blur(24px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03), 4px 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {rail(desktopCollapsed)}
        {/* Edge toggle button — floats on sidebar border, visible on hover */}
        <button
          onClick={() => setDesktopCollapsed((value) => !value)}
          className={`absolute top-[30px] z-30 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-[#18191d] text-zinc-400 shadow-lg transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-white/[0.15] hover:bg-[#24252a] hover:text-white ${
            desktopCollapsed
              ? 'right-[-14px] opacity-0 group-hover/sidebar:opacity-100'
              : 'right-[-14px] opacity-0 group-hover/sidebar:opacity-100'
          }`}
          title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className={`h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${desktopCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-white/[0.02] bg-[#0d0e11]/92 px-4 py-3 backdrop-blur-xl md:px-5 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-300 ring-1 ring-white/8 transition hover:bg-white/[0.07] lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgb(var(--primary-light)/0.06),transparent_24%),#0b0b0d]">
            <div className="flex min-h-full flex-col">
              <div className="flex-1">{children}</div>
              <LegalFooter className="mx-auto w-full max-w-[1520px] px-4 pb-6 md:px-5 xl:px-6" />
            </div>
          </main>
        </div>

        <nav className="sticky bottom-0 z-20 grid h-16 grid-cols-5 border-t border-white/[0.04] bg-[#0d0e11]/95 backdrop-blur-xl lg:hidden">
          {[primaryNav[0], primaryNav[1], primaryNav[2], libraryNav[0], { to: '/account', label: 'Profile', icon: UserCircle2 }].map((item) => {
            const Icon = item.icon
            const active = isActive(location.pathname, item)
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${active ? 'text-white' : 'text-zinc-500'}`}>
                <Icon className="h-4.5 w-4.5" />
                {item.label}
                {active ? <div className="h-[3px] w-[3px] rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]" /> : <div className="h-[3px]" />}
              </Link>
            )
          })}
        </nav>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 flex w-[272px] flex-col bg-[#101114] shadow-[0_28px_80px_rgba(0,0,0,0.55),inset_-1px_0_0_rgba(255,255,255,0.02)]">
            <div className="flex items-center justify-between border-b border-white/[0.02] px-5 py-4">
              <Link to="/landing" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl">
                  <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Omnia Creata</div>
                  <div className="text-xs text-zinc-500">Studio</div>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/8">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3.5">
              <Section
                items={primaryNav}
                pathname={location.pathname}
                search={location.search}
                getChildren={getItemChildren}
                renderExpandedPanel={renderExpandedPanel}
                expandedItems={expandedItems}
                onToggleItem={handleToggleItem}
                onNavigate={() => setMobileOpen(false)}
              />
              <Section title="Library" items={libraryNav} pathname={location.pathname} search={location.search} onNavigate={() => setMobileOpen(false)} />
              <Section title="Elements" items={elementsNav} pathname={location.pathname} search={location.search} onNavigate={() => setMobileOpen(false)} />
              <Section title="Utility" items={utilityNav} pathname={location.pathname} search={location.search} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-white/[0.02] px-4 py-3">
              {/* Usage bar — mobile */}
              {!isGuestShell && usageSummary && !hasInternalAccess ? (
                <div className="mb-3 space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-600">
                    <span>{usageSummary.credits_remaining ?? auth?.credits.remaining ?? 0} credits left</span>
                    <span>{usageSummary.allowance} monthly</span>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Link
                  to={isGuestShell ? '/signup' : '/account'}
                  onClick={() => setMobileOpen(false)}
                  className="flex flex-1 items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-white/[0.04]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-sm font-bold text-white ring-1 ring-white/[0.1]">
                    {auth?.identity?.avatar_url ? (
                      <img src={auth.identity.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center truncate text-[13px] font-medium text-white">{auth?.identity.display_name ?? 'Guest'}<InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} /></div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      {isGuestShell ? 'Public explore' : `${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'}`}
                    </div>
                  </div>
                </Link>
                {!isGuestShell ? (
                  <button
                    onClick={handleSignOut}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-rose-500/[0.1] hover:text-rose-400"
                    title="Log out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                    title="Log in"
                  >
                    <LogOut className="h-4 w-4 rotate-180" />
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
