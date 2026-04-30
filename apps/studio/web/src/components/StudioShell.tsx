import type { ComponentType, CSSProperties, ReactNode } from 'react'
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
import { studioApi } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { IS_CHAT_ENABLED } from '@/lib/featureFlags'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  aliases?: string[]
  exactAliases?: string[]
  expandOnMainClick?: boolean
  openInNewTab?: boolean
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
  ...(IS_CHAT_ENABLED ? [{ to: '/chat', label: 'Chat', icon: MessageSquare }] : []),
]

const libraryNav: NavItem[] = [
  { to: '/library/images', label: 'My images', icon: ImageIcon, aliases: ['/media', '/history'], exactAliases: ['/library'] },
  { to: '/library/projects', label: 'Projects', icon: Folder, aliases: ['/library/collections', '/projects'] },
  { to: '/library/likes', label: 'Favorites', icon: Heart },
  { to: '/library/trash', label: 'Removed', icon: Trash2 },
]

const elementsNav: NavItem[] = [
  { to: '/elements/styles', label: 'Styles', icon: SwatchBook, aliases: ['/elements'] },
]

const utilityNav: NavItem[] = [
  { to: '/help', label: 'Help', icon: BookOpen, openInNewTab: true, aliases: ['/docs', '/faq', '/terms', '/privacy', '/refunds', '/refund-policy', '/usage-policy', '/cookies', '/learn', '/legal/terms', '/legal/privacy', '/legal/refunds', '/legal/acceptable-use', '/legal/cookies'] },
  { to: '/subscription', label: 'Subscription', icon: CreditCard, aliases: ['/billing', '/plan'] },
  { to: '/settings', label: 'Settings', icon: Settings, aliases: ['/profile'] },
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
  expandedItems,
  onToggleItem,
  onNavigate,
  getOpenTarget,
}: {
  title?: string
  items: NavItem[]
  pathname: string
  search?: string
  collapsed?: boolean
  getChildren?: (item: NavItem) => NavChild[]
  expandedItems?: Record<string, boolean>
  onToggleItem?: (item: NavItem) => void
  onNavigate?: () => void
  getOpenTarget?: (item: NavItem) => string
}) {
  const currentRoute = `${pathname}${search}`

  return (
    <div className="mb-4">
      {title && !collapsed ? (
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#8c7f68]">{title}</div>
      ) : title ? (
        <div className="mx-auto mb-2 h-px w-5 bg-[#d7ae68]/15" />
      ) : null}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item)
          const childItems = collapsed ? [] : getChildren?.(item) ?? []
          const expandable = Boolean(childItems.length)
          const isExpanded = Boolean(expandedItems?.[item.to])
          const actionChildren = childItems.filter((child) => child.kind !== 'history')
          const historyChildren = childItems.filter((child) => child.kind === 'history')
          const rowClasses = `group/nav relative flex min-w-0 items-center rounded-[14px] px-3 py-2.5 text-[13px] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] ${
            active
              ? 'bg-[linear-gradient(135deg,rgba(229,173,86,0.19),rgba(229,173,86,0.055))] text-[#fff2d2] font-semibold ring-1 ring-[#d7ae68]/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
              : 'text-[#a39a8b] hover:bg-[rgba(215,174,104,0.07)] hover:text-[#f4e7cf] font-medium'
          }`
          const activeBar = active ? (
            <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-[#e5ad56]" />
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
                ) : item.openInNewTab ? (
                  <a
                    href={getOpenTarget?.(item) ?? item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`${rowClasses} ${collapsed ? 'justify-center' : 'flex-1 gap-2.5'}`}
                  >
                    {!collapsed && activeBar}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate font-medium">{item.label}</span> : null}
                  </a>
                ) : (
                  <Link
                    to={getOpenTarget?.(item) ?? item.to}
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
                      to={getOpenTarget?.(item) ?? item.to}
                      onClick={onNavigate}
                      title={`Open ${item.label}`}
                      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-100"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => onToggleItem?.(item)}
                      title={isExpanded ? `Hide ${item.label} options` : `Show ${item.label} options`}
                      className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-white/[0.03] hover:text-zinc-100"
                      aria-expanded={isExpanded}
                    >
                      <ChevronDown className={`h-4 w-4 transition ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                    </button>
                  )
                ) : null}
              </div>

              {isExpanded && expandable ? (
                <div className="mt-1.5 space-y-1 pl-[28px] animate-fade-up" style={{ animationDuration: '0.4s' }}>
                  {actionChildren.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = currentRoute === child.to
                    return (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] transition ${
                      childActive ? 'bg-[#e5ad56]/10 text-[#fff2d2] shadow-[inset_1.5px_0_0_rgba(229,173,86,0.55)]' : 'text-[#8c8376] hover:bg-[rgba(215,174,104,0.06)] hover:text-[#f4e7cf]'
                        }`}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{child.label}</span>
                      </Link>
                    )
                  })}

                  {historyChildren.length ? <div className="px-3 pt-1 text-[9px] uppercase tracking-[0.22em] text-[#776b5a]">History</div> : null}

                  {historyChildren.map((child) => {
                    const ChildIcon = child.icon
                    const childActive = currentRoute === child.to
                    return (
                      <div key={child.to} className="group relative flex items-center">
                        <Link
                          to={child.to}
                          onClick={onNavigate}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-2 text-[12px] transition ${
                          childActive ? 'bg-[#e5ad56]/10 text-[#fff2d2] shadow-[inset_1.5px_0_0_rgba(229,173,86,0.55)]' : 'text-[#8c8376] hover:bg-[rgba(215,174,104,0.06)] hover:text-[#f4e7cf]'
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
  const [showDesktopToggle, setShowDesktopToggle] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const isGuestShell = !canLoadPrivate
  const hideLegalFooter = location.pathname.startsWith('/create') || location.pathname.startsWith('/chat')

  useEffect(() => {
    const saved = window.localStorage.getItem('oc-studio-rail-collapsed')
    if (saved === 'true') setDesktopCollapsed(true)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('oc-studio-rail-collapsed', desktopCollapsed ? 'true' : 'false')
  }, [desktopCollapsed])

  useEffect(() => {
    let lastVisible = false

    const handleMouseMove = (event: MouseEvent) => {
      const revealBoundary = desktopCollapsed ? 120 : 320
      const nextVisible = event.clientX <= revealBoundary
      if (nextVisible !== lastVisible) {
        lastVisible = nextVisible
        setShowDesktopToggle(nextVisible)
      }
    }

    const handleMouseOut = () => {
      lastVisible = false
      setShowDesktopToggle(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseout', handleMouseOut)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseout', handleMouseOut)
    }
  }, [desktopCollapsed])

  useEffect(() => {
    const next: Record<string, boolean> = {}
    if (location.pathname.startsWith('/chat')) next['/chat'] = true
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
    reset_at: null,
    progress_percent: auth.plan.monthly_credits > 0 ? ((auth.plan.monthly_credits - auth.credits.monthly_remaining) / auth.plan.monthly_credits) * 100 : 0
  } : undefined)
  const hasInternalAccess = Boolean((auth?.identity.owner_mode || auth?.identity.root_admin) && auth?.plan.can_generate)
  const usagePercent = usageSummary ? Math.max(0, 100 - usageSummary.progress_percent) : 0
  const usageResetLabel = (() => {
    if (!usageSummary?.reset_at) return 'Resets with billing'
    const resetTime = new Date(usageSummary.reset_at).getTime()
    if (Number.isNaN(resetTime)) return 'Resets with billing'
    const days = Math.max(0, Math.ceil((resetTime - Date.now()) / 86_400_000))
    if (days === 0) return 'Resets today'
    if (days === 1) return 'Resets tomorrow'
    return `Resets in ${days} days`
  })()
  const mobileBottomNav: NavItem[] = [
    primaryNav[0],
    primaryNav[1],
    ...(IS_CHAT_ENABLED && primaryNav[2] ? [primaryNav[2]] : []),
    libraryNav[0],
    isGuestShell
      ? { to: '/signup', label: 'Join', icon: UserCircle2 }
      : { to: '/account', label: 'Profile', icon: UserCircle2 },
  ]

  const getItemChildren = (item: NavItem) => {
    if (item.to === '/chat') return chatChildren
    return []
  }

  const handleToggleItem = (item: NavItem) => {
    const expandable = Boolean(getItemChildren(item).length)
    if (!expandable) return
    setExpandedItems((current) => ({ ...current, [item.to]: !current[item.to] }))
    setMobileOpen(false)
  }

  const getOpenTarget = (item: NavItem) => {
    if (item.to === '/settings' && isGuestShell) {
      return '/login?next=%2Fsettings'
    }

    return item.to
  }

  const handleSignOut = async () => {
    await signOut()
    setMobileOpen(false)
    navigate('/landing')
  }

  const rail = (collapsed: boolean) => (
    <>
      <div className={`flex h-[78px] items-center border-b border-[#d7ae68]/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <Link to="/landing" className={`group flex items-center transition-all ${collapsed ? 'justify-center' : 'gap-3.5'}`} title="Open Omnia Creata landing page">
          <div className="relative flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[14px] bg-[linear-gradient(180deg,rgba(231,179,90,0.16),rgba(10,9,7,0.78))] p-0.5 shadow-[0_16px_34px_rgba(0,0,0,0.32),0_0_24px_rgba(229,173,86,0.08)] ring-1 ring-[#d7ae68]/20 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
            <div className="absolute inset-0 rounded-[14px] bg-[radial-gradient(ellipse_at_top,rgba(255,221,157,0.16),transparent_56%)]" />
            <img src="/omnia-crest.png" alt="Omnia Creata" className="relative z-10 h-6 w-6 object-contain drop-shadow-md" />
          </div>
          {!collapsed ? (
            <div className="min-w-0 overflow-hidden">
              <div className="whitespace-nowrap text-sm font-semibold tracking-tight text-white/95">Omnia Creata</div>
              <div className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b4935d]">Studio</div>
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
          expandedItems={expandedItems}
          onToggleItem={handleToggleItem}
          onNavigate={() => setMobileOpen(false)}
          getOpenTarget={getOpenTarget}
        />
        <Section title="Library" items={libraryNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        <Section title="Elements" items={elementsNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        <Section
          items={utilityNav}
          pathname={location.pathname}
          search={location.search}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
          getOpenTarget={getOpenTarget}
        />
      </div>

      <div className="relative overflow-hidden border-t border-[#d7ae68]/10 p-3">
        {/* Usage bar — always visible for logged-in users */}
        {!isGuestShell && !collapsed && usageSummary && !hasInternalAccess ? (
          <Link
            to="/subscription"
            className="mb-3 block rounded-[14px] border border-[#d7ae68]/18 bg-[linear-gradient(180deg,rgba(229,173,86,0.08),rgba(12,10,7,0.72))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#f1bf67]/30 hover:bg-[#d7ae68]/[0.08]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9f927e]">Credits</div>
                <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">
                  {(usageSummary.credits_remaining ?? auth?.credits.remaining ?? 0).toLocaleString()}
                </div>
                <div className="mt-0.5 text-[11px] text-[#8c8376]">{usageResetLabel}</div>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7ae68]/22 bg-[#d7ae68]/10 text-[#f1bf67]">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#d7ae68]/10">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${usagePercent}%`, background: 'linear-gradient(90deg, #e5ad56, #f1c16d)', boxShadow: usagePercent > 5 ? '0 0 12px rgba(229,173,86,0.28)' : 'none' }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#776b5a]">
              <span>{usageSummary.allowance.toLocaleString()} monthly</span>
              <span>{Math.round(usageSummary.progress_percent)}% used</span>
            </div>
          </Link>
        ) : null}
        {/* User row */}
        {/* User row */}
        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
          <div className={`min-w-0 flex-1 ${collapsed ? 'flex items-center justify-center' : ''}`}>
            <Link
              to={isGuestShell ? '/signup' : '/account'}
              className={`group/user min-w-0 rounded-xl px-2 py-1.5 transition-all duration-300 hover:bg-white/[0.04] active:scale-[0.98] ${
                collapsed ? 'flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.02]' : 'flex items-center gap-2.5'
              }`}
              title={isGuestShell ? 'Create an account' : 'Open profile'}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[rgba(229,173,86,0.34)] to-[rgba(45,38,27,0.86)] text-sm font-bold text-white ring-1 ring-[#d7ae68]/25 shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition-all duration-500 group-hover/user:ring-[#f1bf67]/40">
                {auth?.identity?.avatar_url ? (
                  <img src={auth.identity.avatar_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover/user:scale-110" />
                ) : (
                  (auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()
                )}
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="flex items-center truncate text-[13px] font-semibold text-white/95">{auth?.identity.display_name ?? 'Guest'}<InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} /></div>
                  <div className="mt-0.5 text-[11px] text-[#8c8376]">
                    {isGuestShell
                      ? 'Public explore'
                      : `${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'}`}
                  </div>
                </div>
              ) : null}
            </Link>

          </div>

          {/* Log out — directly visible, no ... menu needed */}
          {!isGuestShell ? (
            <button
              onClick={handleSignOut}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-all duration-300 hover:bg-rose-500/[0.15] hover:text-rose-400 hover:scale-110"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-all duration-300 hover:bg-white/[0.08] hover:text-white hover:scale-110"
              title="Log in"
            >
              <LogOut className="h-4 w-4 rotate-180" />
            </Link>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div
      className="relative flex h-screen overflow-hidden bg-[#070706] text-white"
      style={{ '--studio-sidebar-width': desktopCollapsed ? '76px' : '260px' } as CSSProperties}
    >
      <div className="fx-layer">
        <div className="fx-glow fx-glow-1" />
        <div className="fx-glow fx-glow-2" />
        <div className="fx-glow fx-glow-3" />
        <div className="noise-overlay" />
      </div>
      <aside
        className={`group/sidebar relative z-20 hidden shrink-0 overflow-visible transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex lg:flex-col glass-sidebar ${
          desktopCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {rail(desktopCollapsed)}
        <div
          className={`pointer-events-none absolute inset-y-6 right-0 w-px bg-gradient-to-b from-transparent via-[#d7ae68]/18 to-transparent transition-opacity duration-300 ${
            showDesktopToggle ? 'opacity-100' : 'opacity-50'
          }`}
        />
        {/* Edge toggle button — floats on sidebar border, visible on hover */}
        <button
          onClick={() => setDesktopCollapsed((value) => !value)}
          className={`absolute top-[34px] z-40 flex h-9 w-9 items-center justify-center rounded-full border border-[#d7ae68]/24 bg-[#17130d]/94 text-[#d9c09a] shadow-[0_10px_28px_rgba(0,0,0,0.34)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-[#f1bf67]/38 hover:bg-[#21180d] hover:text-[#fff2d2] hover:scale-110 ${
            showDesktopToggle
              ? 'right-[-16px] translate-x-0 opacity-100'
              : 'right-[-18px] translate-x-1 opacity-45'
          }`}
          title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className={`h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${desktopCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 border-b border-[#d7ae68]/10 bg-[#0d0b08]/92 px-4 py-3 backdrop-blur-xl md:px-5 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d7ae68]/10 text-[#d9c09a] ring-1 ring-[#d7ae68]/12 transition hover:bg-[#d7ae68]/15 lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(229,173,86,0.1),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(39,79,62,0.13),transparent_34%),linear-gradient(180deg,#080706_0%,#0d0b08_42%,#060605_100%)]">
            <div className="flex min-h-full flex-col">
              <div className="flex-1">{children}</div>
              {hideLegalFooter ? null : <LegalFooter className="mx-auto w-full max-w-[1520px] px-4 pb-6 md:px-5 xl:px-6" />}
            </div>
          </main>
        </div>

        <nav className="sticky bottom-0 z-20 grid h-16 border-t border-[#d7ae68]/12 bg-[#0d0b08]/96 backdrop-blur-2xl lg:hidden" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 -4px 24px rgba(0,0,0,0.32)', gridTemplateColumns: `repeat(${mobileBottomNav.length}, minmax(0, 1fr))` }}>
          {mobileBottomNav.map((item) => {
            const Icon = item.icon
            const active = isActive(location.pathname, item)
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-all duration-300 active:scale-95 ${active ? 'text-[#fff2d2]' : 'text-[#8c8376]'}`}>
                <Icon className="h-4.5 w-4.5" />
                {item.label}
                {active ? <div className="h-[3px] w-6 rounded-full bg-[#e5ad56]" /> : <div className="h-[3px]" />}
              </Link>
            )
          })}
        </nav>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 flex w-[272px] flex-col bg-[#0d0b08] shadow-[0_28px_80px_rgba(0,0,0,0.44),inset_-1px_0_0_rgba(215,174,104,0.1)]">
            <div className="flex items-center justify-between border-b border-[#d7ae68]/10 px-5 py-4">
              <Link to="/landing" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl">
                  <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Omnia Creata</div>
                  <div className="text-xs text-[#b4935d]">Studio</div>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#d7ae68]/10 ring-1 ring-[#d7ae68]/14">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3.5">
              <Section
                items={primaryNav}
                pathname={location.pathname}
                search={location.search}
                getChildren={getItemChildren}
                expandedItems={expandedItems}
                onToggleItem={handleToggleItem}
                onNavigate={() => setMobileOpen(false)}
                getOpenTarget={getOpenTarget}
              />
              <Section title="Library" items={libraryNav} pathname={location.pathname} search={location.search} onNavigate={() => setMobileOpen(false)} />
              <Section title="Elements" items={elementsNav} pathname={location.pathname} search={location.search} onNavigate={() => setMobileOpen(false)} />
              <Section
                title="Utility"
                items={utilityNav}
                pathname={location.pathname}
                search={location.search}
                onNavigate={() => setMobileOpen(false)}
                getOpenTarget={getOpenTarget}
              />
            </div>
            <div className="border-t border-[#d7ae68]/10 px-4 py-3">
              {/* Usage bar — mobile */}
              {!isGuestShell && usageSummary && !hasInternalAccess ? (
                <div className="mb-3 space-y-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#d7ae68]/10">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${usagePercent}%`, background: 'linear-gradient(90deg, #e5ad56, #f1c16d)' }} />
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
