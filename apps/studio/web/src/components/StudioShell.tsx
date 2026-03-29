import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  MoreHorizontal,
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
import { studioApi } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { useNavigate } from 'react-router-dom'

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
}

const primaryNav: NavItem[] = [
  { to: '/explore', label: 'Explore', icon: Compass, aliases: ['/community'] },
  { to: '/create', label: 'Compose', icon: Sparkles, aliases: ['/projects'] },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
]

const libraryNav: NavItem[] = [
  { to: '/library/images', label: 'My images', icon: ImageIcon, aliases: ['/media', '/history'], exactAliases: ['/library'] },
  { to: '/library/collections', label: 'Collections', icon: Folder },
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
    <div className={title ? 'mt-5' : ''}>
      {title && !collapsed ? <div className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.22em] text-zinc-600">{title}</div> : null}
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
          const rowClasses = `flex min-w-0 items-center rounded-xl px-3 py-2.5 text-[13px] transition ${
            active ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
          }`
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
                      <MoreHorizontal className="h-4 w-4" />
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
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] transition ${
                          childActive ? 'bg-white/[0.07] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-medium">{child.label}</span>
                      </Link>
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
  const [identityPaneOpen, setIdentityPaneOpen] = useState(false)
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

  useEffect(() => {
    setIdentityPaneOpen(false)
  }, [location.pathname, location.search])

  const conversationsQuery = useQuery({
    queryKey: ['conversations', 'sidebar'],
    queryFn: () => studioApi.listConversations(),
    enabled: canLoadPrivate,
  })

  const profileQuery = useQuery({
    queryKey: ['profile', 'sidebar-me'],
    queryFn: () => studioApi.getMyProfile(),
    enabled: canLoadPrivate,
  })

  const chatChildren = useMemo<NavChild[]>(() => {
    const items: NavChild[] = [{ to: '/chat?new=1', label: 'New chat', icon: PenSquare, kind: 'action' }]
    const history = conversationsQuery.data?.conversations ?? []

    return items.concat(
      history.slice(0, 5).map((conversation) => ({
        to: `/chat?conversation=${conversation.id}`,
        label: conversation.title,
        icon: History,
        kind: 'history',
      })),
    )
  }, [conversationsQuery.data])

  const usageSummary = profileQuery.data?.profile.usage_summary
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
              Start free
            </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-black/20 p-3 ring-1 ring-white/[0.04]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}</div>
            <div className="mt-1 text-xs text-zinc-500">{auth?.guest ? 'Guest mode' : auth?.plan.label ?? 'Free'}</div>
          </div>
          <div className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 ring-1 ring-white/[0.06]">
            {auth?.credits.remaining ?? 0} credits
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
    setIdentityPaneOpen(false)
    navigate('/landing')
  }

  const rail = (collapsed: boolean) => (
    <>
      <div className={`flex h-[78px] border-b border-white/[0.015] ${collapsed ? 'flex-col items-center justify-center gap-2 px-2' : 'items-center justify-between px-4'}`}>
        <Link to="/landing" className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`} title="Open Omnia Creata landing page">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
          </div>
          {!collapsed ? (
            <div>
              <div className="text-sm font-semibold tracking-tight text-white">Omnia Creata</div>
              <div className="text-xs text-zinc-500">Studio</div>
            </div>
          ) : null}
        </Link>
        <button
          onClick={() => setDesktopCollapsed((value) => !value)}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
          title={desktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className="h-4.5 w-4.5" />
        </button>
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
        <Section title="Utility" items={utilityNav} pathname={location.pathname} search={location.search} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="relative border-t border-white/[0.015] p-2.5">
        {identityPaneOpen ? (
          <div
            className={`absolute bottom-full z-20 mb-3 bg-[#111216] shadow-[0_28px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/[0.08] ${
              collapsed ? 'left-3 w-[220px] rounded-[20px] p-3' : 'left-2.5 right-2.5 rounded-[20px] p-3.5'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {isGuestShell
                    ? 'Public explore mode'
                    : `@${auth?.identity.username ?? 'guest'} / ${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'}`}
                </div>
              </div>
              {!isGuestShell ? (
                <div className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-zinc-200 ring-1 ring-white/[0.06]">
                  {usageSummary?.credits_remaining ?? auth?.credits.remaining ?? 0} credits
                </div>
              ) : null}
            </div>
            {!isGuestShell && usageSummary ? (
              <div className="mt-4 space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div className="h-full rounded-full bg-white" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                  <span>{usageSummary.allowance} monthly allowance</span>
                  <span>{new Date(usageSummary.reset_at).toLocaleDateString()}</span>
                </div>
              </div>
            ) : null}
            {isGuestShell ? (
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <Link to="/login?next=%2Fexplore" onClick={() => setIdentityPaneOpen(false)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-[12px] text-white transition hover:bg-white/[0.08]">
                  Log in
                </Link>
                <Link to="/signup" onClick={() => setIdentityPaneOpen(false)} className="rounded-full bg-white px-3 py-1.5 text-center text-[12px] font-semibold text-black transition hover:opacity-90">
                  Start free
                </Link>
                <Link to="/help" onClick={() => setIdentityPaneOpen(false)} className="col-span-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-[12px] text-white transition hover:bg-white/[0.08]">
                  Help
                </Link>
              </div>
            ) : (
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <Link to="/account" onClick={() => setIdentityPaneOpen(false)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-[12px] text-white transition hover:bg-white/[0.08]">
                  Profile
                </Link>
                <Link to="/subscription" onClick={() => setIdentityPaneOpen(false)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-[12px] text-white transition hover:bg-white/[0.08]">
                  Subscription
                </Link>
                <Link to="/settings" onClick={() => setIdentityPaneOpen(false)} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-center text-[12px] text-white transition hover:bg-white/[0.08]">
                  Settings
                </Link>
                <button onClick={handleSignOut} className="rounded-full px-3 py-1.5 text-[12px] text-rose-300 transition hover:bg-rose-500/[0.08] hover:text-rose-200">
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : null}

        <div className={`flex items-center ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
          <Link
            to={isGuestShell ? '/signup' : '/account'}
            className={`min-w-0 flex-1 rounded-full px-2 py-1.5 transition hover:bg-white/[0.04] ${collapsed ? 'flex h-10 w-10 items-center justify-center bg-white/[0.05]' : 'flex items-center gap-2.5'}`}
            title={isGuestShell ? 'Create an account' : 'Open profile'}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-sm font-semibold text-white">
              {(auth?.identity.display_name ?? 'Guest').slice(0, 1).toUpperCase()}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-white">{auth?.identity.display_name ?? 'Guest'}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  {isGuestShell
                    ? 'Public explore'
                    : `${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'} / ${usageSummary?.credits_remaining ?? auth?.credits.remaining ?? 0} credits`}
                </div>
              </div>
            ) : null}
          </Link>
          <button
            onClick={() => setIdentityPaneOpen((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
            title={identityPaneOpen ? 'Hide account panel' : 'Show account panel'}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#0b0b0d] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-14%] h-[26rem] w-[26rem] rounded-full bg-sky-300/[0.05] blur-[150px] animate-[oc-gradientShift_24s_ease-in-out_infinite]" />
        <div className="absolute right-[-6%] top-[8%] h-[24rem] w-[24rem] rounded-full bg-cyan-300/[0.04] blur-[150px] animate-[oc-gradientShiftB_28s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-18%] left-[22%] h-[26rem] w-[26rem] rounded-full bg-indigo-300/[0.04] blur-[180px] animate-[oc-float_22s_ease-in-out_infinite]" />
      </div>
      <aside
        className={`relative z-10 hidden shrink-0 overflow-visible bg-[#101114]/92 shadow-[inset_-1px_0_0_rgba(255,255,255,0.012)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
          desktopCollapsed ? 'w-[84px]' : 'w-[252px]'
        }`}
      >
        {rail(desktopCollapsed)}
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
          <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(88,92,120,0.1),transparent_24%),#0b0b0d]">
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
              <Link key={item.to} to={item.to} className={`flex flex-col items-center justify-center gap-1 text-[11px] ${active ? 'text-white' : 'text-zinc-500'}`}>
                <Icon className="h-4.5 w-4.5" />
                {item.label}
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
              {identityPaneOpen ? (
                <div className="mb-3 rounded-[22px] bg-white/[0.03] p-3 ring-1 ring-white/[0.06]">
                  <div className="text-sm font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {isGuestShell
                      ? 'Public explore mode'
                      : `@${auth?.identity.username ?? 'guest'} / ${usageSummary?.plan_label ?? auth?.plan.label ?? 'Free'}`}
                  </div>
                  {!isGuestShell && usageSummary ? (
                    <>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-white" style={{ width: `${usagePercent}%` }} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                        <span>{usageSummary.credits_remaining ?? auth?.credits.remaining ?? 0} credits</span>
                        {usageSummary.reset_at ? <span>{new Date(usageSummary.reset_at).toLocaleDateString()}</span> : null}
                      </div>
                    </>
                  ) : null}
                  {isGuestShell ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link to="/login?next=%2Fexplore" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/[0.05] px-3 py-2 text-center text-[12px] text-white">
                        Log in
                      </Link>
                      <Link to="/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-white px-3 py-2 text-center text-[12px] font-semibold text-black">
                        Start free
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link to="/account" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/[0.05] px-3 py-2 text-center text-[12px] text-white">
                        Profile
                      </Link>
                      <Link to="/subscription" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/[0.05] px-3 py-2 text-center text-[12px] text-white">
                        Subscription
                      </Link>
                      <Link to="/settings" onClick={() => setMobileOpen(false)} className="rounded-full bg-white/[0.05] px-3 py-2 text-center text-[12px] text-white">
                        Settings
                      </Link>
                      <button onClick={handleSignOut} className="rounded-full px-3 py-2 text-[12px] text-rose-300">
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
              <button
                onClick={() => setIdentityPaneOpen((value) => !value)}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
                Profile and usage
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
