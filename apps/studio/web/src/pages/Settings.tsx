import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronRight,
  CreditCard,
  LogOut,
  Palette,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Crown,
  Database,
  Users,
  BarChart3,
  Trash2,
  Globe,
  HardDriveDownload,
  Key,
  MonitorSmartphone,
  AlertTriangle
} from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { InlineBadge } from '@/components/VerificationBadge'
import { studioApi, type HealthProvider, type HealthResponse, type Visibility } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'
import { useStudioUiPrefs, THEME_OPTIONS } from '@/lib/studioUi'

/* ─── UI Primitives ──────────────────────────────────────────────────────── */

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-out focus:outline-none ${
        checked ? 'bg-[rgb(var(--primary-light))] shadow-[0_0_16px_rgb(var(--primary)/0.6)]' : 'bg-white/10 hover:bg-white/[0.15]'
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] ring-0 transition-transform duration-300 cubic-bezier(0.34,1.56,0.64,1) ${
          checked ? 'translate-x-[20px] scale-105' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingsRow({ icon: Icon, title, description, action, danger }: { icon?: any, title: string, description?: string, action?: ReactNode, danger?: boolean }) {
  return (
    <div className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-5 transition-all duration-500 hover:bg-white/[0.02]`}>
      <div className="flex items-start sm:items-center gap-4">
        {Icon && (
          <div className={`relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${danger ? 'bg-red-500/10 text-red-400 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white/[0.03] text-zinc-400 group-hover:bg-white/[0.06] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'}`}>
            <Icon className="h-5 w-5 relative z-10" />
            <div className={`absolute inset-0 rounded-[14px] opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${danger ? 'ring-1 ring-red-500/30' : 'ring-1 ring-white/10'}`} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`text-[14px] sm:text-[15px] font-bold tracking-wide ${danger ? 'text-red-400' : 'text-zinc-100 transition-colors duration-300 group-hover:text-white'}`}>{title}</div>
          {description && <div className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 max-w-xl transition-colors duration-300 group-hover:text-zinc-400">{description}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-2 sm:pt-0 w-full sm:w-auto opacity-90 transition-opacity duration-300 group-hover:opacity-100">{action}</div>}
    </div>
  )
}

function SettingsCard({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] ring-1 ring-white/[0.06] bg-[#0c0d12]/60 backdrop-blur-3xl shadow-[0_32px_80px_-12px_rgba(0,0,0,0.8)] before:absolute before:inset-0 before:rounded-[24px] before:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] before:pointer-events-none ${compact ? '' : 'divide-y divide-white/[0.04]'}`}>
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  usePageMeta('Settings', 'Customize your Omnia Creata Studio preferences and account.')
  const { auth, isAuthenticated, isLoading, signOut } = useStudioAuth()
  const { prefs, setTipsEnabled, setTheme, resetTips } = useStudioUiPrefs()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security' | 'gm'>('general')
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'warning'; title: string; body: string } | null>(null)
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null)
  const activeDefaultVisibility = pendingVisibility ?? auth?.identity.default_visibility ?? 'public'
  const isGMMode = Boolean(auth?.identity.owner_mode)
  const hasInternalAccess = Boolean((auth?.identity.owner_mode || auth?.identity.root_admin) && auth?.plan.can_generate)

  useQuery({
    queryKey: ['settings-bootstrap'],
    queryFn: () => studioApi.getSettingsBootstrap(),
    enabled: isAuthenticated,
  })

  const healthQuery = useQuery({
    queryKey: ['health', isGMMode ? 'detail' : 'public'],
    queryFn: () => (isGMMode ? studioApi.getHealthDetail() : studioApi.getHealth()),
    enabled: isAuthenticated,
  })

  const discoverabilityMutation = useMutation({
    mutationFn: (nextVisibility: Visibility) => studioApi.updateMyProfile({ default_visibility: nextVisibility }),
    onSuccess: async (_, nextVisibility) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
      setNotice({
        tone: 'success',
        title: 'Default visibility updated',
        body:
          nextVisibility === 'public'
            ? 'New creations will default to public visibility.'
            : 'New creations will default to private visibility.',
      })
    },
    onError: (error) => {
      setPendingVisibility(null)
      setNotice({
        tone: 'warning',
        title: 'Could not update visibility',
        body: error instanceof Error ? error.message : 'Try again in a moment.',
      })
    },
  })

  const health = healthQuery.data as HealthResponse | undefined
  const providerHealth = useMemo<HealthProvider[]>(() => health?.providers ?? [], [health?.providers])
  useEffect(() => {
    setPendingVisibility(null)
  }, [auth?.identity.default_visibility])

  // GM Mode — completely invisible to regular users
  const isGM = Boolean(auth?.identity.owner_mode)

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--primary-light)/0.2)]" />
            <div className="relative h-3 w-3 rounded-full bg-[rgb(var(--primary-light))]" style={{ boxShadow: '0 0 12px rgb(var(--primary-light)/0.6)' }} />
          </div>
          <p className="text-sm text-zinc-500">Loading your settings…</p>
        </div>
      </div>
    )
  }

  const handleExport = async () => {
    try {
      const data = await studioApi.exportProfile()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `omnia-creata-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (e) {
      alert('Export failed.')
    }
  }

  const handleHealthRefresh = async () => {
    const result = await healthQuery.refetch()
    if (result.error) {
      setNotice({
        tone: 'warning',
        title: 'Diagnostics refresh failed',
        body: result.error instanceof Error ? result.error.message : 'Studio could not refresh diagnostics right now.',
      })
      return
    }
    if (result.data) {
      setNotice({
        tone: result.data.status === 'healthy' ? 'success' : 'info',
        title: isGM ? 'Owner diagnostics refreshed' : 'System health refreshed',
        body:
          result.data.status === 'healthy'
            ? 'Studio services reported a healthy state on the latest check.'
            : `Studio reported status: ${result.data.status}.`,
      })
    }
  }

  const noticeToneClasses =
    notice?.tone === 'success'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : notice?.tone === 'warning'
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-100'
        : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'

  return (
    <AppPage className="flex flex-col items-center py-10 px-4 md:px-8">
      {/* Header */}
      <header className="w-full max-w-[1080px] mb-8">
        <h1 className="text-[2rem] font-bold tracking-tight text-white drop-shadow-sm">Settings</h1>
      </header>

      {/* Main Layout Grid */}
      <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12 w-full max-w-[1080px]">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 shrink-0 flex flex-row overflow-x-auto md:flex-col md:overflow-visible gap-1 pb-4 md:pb-0 scrollbar-hide">
          {[
            { id: 'general', icon: User, label: 'General Account' },
            { id: 'appearance', icon: Palette, label: 'Appearance & UI' },
            { id: 'security', icon: Shield, label: 'Privacy & Security' },
            ...(isGM ? [{ id: 'gm', icon: Crown, label: 'Control Center' }] : [])
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`group relative flex whitespace-nowrap md:whitespace-normal items-center gap-3 rounded-[16px] px-5 py-3.5 text-[14px] font-bold tracking-wide transition-all duration-400 ${
                    isActive 
                      ? 'bg-gradient-to-r from-[rgb(var(--primary-light)/0.1)] to-transparent text-white' 
                      : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-2/3 w-[3px] -translate-y-1/2 rounded-r-full bg-[rgb(var(--primary-light))] shadow-[0_0_12px_rgb(var(--primary-light))]" />
                  )}
                  <tab.icon className={`relative z-10 h-5 w-5 transition-transform duration-400 ${isActive ? 'text-[rgb(var(--primary-light))] drop-shadow-[0_0_8px_rgba(var(--primary-light),0.5)] scale-110' : 'opacity-80 group-hover:scale-105'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
            )
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0">
          {notice ? (
            <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${noticeToneClasses}`}>
              <div className="font-semibold">{notice.title}</div>
              <p className="mt-1 text-current/80">{notice.body}</p>
            </div>
          ) : null}

          {/* ════ GENERAL TAB ════ */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              {/* Hero Account Card */}
              <div className="group relative overflow-hidden rounded-[28px] bg-[#0c0d12] ring-1 ring-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,1)] p-8 md:p-10 isolation-auto">
                <div className="absolute inset-0 opacity-[0.25] mix-blend-screen bg-gradient-to-br from-[rgb(var(--primary))/0.5] via-transparent to-[rgb(var(--accent))/0.5] transition-opacity duration-1000 group-hover:opacity-[0.35]" />
                <div className="absolute -top-[50%] -right-[20%] w-[100%] h-[150%] bg-[radial-gradient(ellipse_at_center,rgba(var(--primary-light),0.15)_0%,transparent_50%)] animate-pulse-slow pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[rgb(var(--primary-light)/0.5)] to-transparent opacity-50" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-3xl font-black text-white shadow-[0_0_40px_rgba(var(--primary),0.3)] ring-1 ring-white/20 isolate">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_58%)] opacity-30 mix-blend-overlay" />
                      <span className="relative z-10 drop-shadow-md">{(auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()}</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{auth?.identity.display_name ?? 'Guest Workflow'}</span>
                          <InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} />
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-zinc-400">{auth?.identity.email || 'You are exploring securely'}</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusPill tone={auth?.guest ? 'neutral' : 'brand'}>{auth?.plan.label ?? 'Free Access'}</StatusPill>
                          <span className="text-[12px] font-semibold tracking-wide text-zinc-500">
                            {hasInternalAccess ? 'OWNER ACCESS' : `${auth?.credits.remaining ?? 0} CREDITS`}
                          </span>
                        </div>
                    </div>
                  </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 w-full md:w-auto">
                      <Link to="/account" className="relative overflow-hidden flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[14px] font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)]">
                        Edit Profile
                      </Link>
                      {!auth?.guest && (
                        <button onClick={signOut} className="flex items-center justify-center gap-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] px-6 py-3.5 text-[14px] font-bold text-zinc-300 transition-all duration-300 hover:bg-white/[0.12] hover:text-white hover:border-white/[0.2] hover:shadow-lg">
                          <LogOut className="h-[16px] w-[16px]" /> Sign Out
                        </button>
                      )}
                    </div>
                </div>
              </div>

              {/* Ecosystem Settings */}
              <div className="space-y-3">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Workspace Details</h3>
                <SettingsCard>
                  <SettingsRow 
                    icon={CreditCard}
                    title="Plan & Billing"
                    description="Review your current plan, credits, and checkout availability."
                    action={
                      <Link to="/subscription" className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.12] hover:border-white/[0.2] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        View Plans <ChevronRight className="h-4 w-4 opacity-50 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
                      </Link>
                    }
                  />
                </SettingsCard>
              </div>
            </div>
          )}

          {/* ════ APPEARANCE TAB ════ */}
          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              {/* Theme Picker */}
              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Studio Theme Aesthetics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {THEME_OPTIONS.map(theme => {
                    const isActive = prefs.theme === theme.id;
                    return (
                      <button 
                        key={theme.id} 
                        onClick={() => setTheme(theme.id)} 
                        className={`relative flex flex-col items-center gap-4 rounded-[22px] p-5 transition-all duration-300 ${isActive ? 'bg-white/[0.05] ring-1 ring-white/10 shadow-xl' : 'bg-white/[0.01] hover:bg-white/[0.03] ring-1 ring-white/[0.02]'} `}
                      >
                        <div className={`h-[52px] w-[52px] rounded-[16px] transition-transform duration-500 ${isActive ? 'scale-110 shadow-[0_0_30px_rgba(255,255,255,0.15)]' : 'group-hover:scale-105'}`} style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`}}>
                          {isActive && <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300"><Check className="h-6 w-6 text-white drop-shadow-md" /></div>}
                        </div>
                        <span className={`text-[13px] font-bold tracking-wide ${isActive ? 'text-white' : 'text-zinc-500'}`}>{theme.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Workflow Experience</h3>
                <SettingsCard>
                  <SettingsRow 
                    icon={Sparkles}
                    title="Smart Interface Hints"
                    description="Remember this browser's guidance preference while Studio's first-run onboarding keeps settling into the controlled launch shell."
                    action={
                      <div className="flex justify-start sm:justify-end w-full">
                        <Switch
                          checked={prefs.tipsEnabled}
                          onChange={() => {
                            setTipsEnabled(!prefs.tipsEnabled)
                            setNotice({
                              tone: 'info',
                              title: 'Hint preference saved',
                              body: 'Studio will remember your guidance preference on this browser.',
                            })
                          }}
                        />
                      </div>
                    }
                  />
                  <SettingsRow 
                    icon={RefreshCw}
                    title="Restore Dismissed Guidance"
                    description="Reset the local walkthrough state for this browser."
                    action={
                      <button
                        onClick={() => {
                          resetTips()
                          setNotice({
                            tone: 'success',
                            title: 'Guidance reset',
                            body: 'Dismissed walkthrough hints were reset for this browser.',
                          })
                        }}
                        className="group flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        Reset Guides
                      </button>
                    }
                  />
                </SettingsCard>
              </div>
            </div>
          )}

          {/* ════ SECURITY TAB ════ */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Visibility & Data Rights</h3>
                <SettingsCard>
                  <SettingsRow 
                    icon={Globe}
                    title="Global Discoverability"
                    description="Set whether new creations and projects are public out of the box."
                    action={
                      <div className="flex items-center gap-1.5 rounded-[12px] bg-black/40 p-1 ring-1 ring-white/10 w-max">
                        <button
                          onClick={() => {
                            setPendingVisibility('public')
                            discoverabilityMutation.mutate('public')
                          }}
                          disabled={discoverabilityMutation.isPending || activeDefaultVisibility === 'public'}
                          className={`rounded-[10px] px-5 py-2 text-[12px] font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${activeDefaultVisibility === 'public' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                          {discoverabilityMutation.isPending && pendingVisibility === 'public' ? 'Saving...' : 'Public'}
                        </button>
                        <button
                          onClick={() => {
                            setPendingVisibility('private')
                            discoverabilityMutation.mutate('private')
                          }}
                          disabled={discoverabilityMutation.isPending || activeDefaultVisibility === 'private'}
                          className={`rounded-[10px] px-5 py-2 text-[12px] font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${activeDefaultVisibility === 'private' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                          {discoverabilityMutation.isPending && pendingVisibility === 'private' ? 'Saving...' : 'Private'}
                        </button>
                      </div>
                    }
                  />
                  <SettingsRow 
                    icon={HardDriveDownload}
                    title="Download Archive"
                    description="Export a full backup of your images, projects, and account history."
                    action={
                      <button onClick={handleExport} className="group flex w-full sm:w-auto items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.1] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.12] hover:border-white/[0.2] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        Export Archive
                      </button>
                    }
                  />
                </SettingsCard>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-zinc-500">Access Control</h3>
                <SettingsCard>
                  <SettingsRow 
                    icon={Key}
                    title="Credentials"
                    description="Password changes stay with your active sign-in provider."
                    action={<StatusPill tone="neutral">Managed outside Studio</StatusPill>}
                  />
                  <SettingsRow 
                    icon={MonitorSmartphone}
                    title="Active Sessions"
                    description="Device session management is not exposed in the Studio shell yet."
                    action={<StatusPill tone="neutral">Unavailable</StatusPill>}
                  />
                </SettingsCard>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-red-500/60">Danger Zone</h3>
                <SettingsCard compact>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 md:p-8 bg-red-950/20">
                    <div className="min-w-0">
                      <h4 className="text-[16px] font-bold text-red-400">Delete workspace</h4>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-red-400/80 max-w-sm">
                        For now, deletion requests go through support so billing, exports, and active workspace state can be handled cleanly.
                      </p>
                    </div>
                    <a
                      href="mailto:support@omniacreata.com?subject=Studio%20workspace%20deletion%20request"
                      className="group shrink-0 flex items-center justify-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3.5 text-[14px] font-bold text-red-400 transition-all duration-300 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:scale-105"
                    >
                      <AlertTriangle className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" /> Contact Support
                    </a>
                  </div>
                </SettingsCard>
              </div>
            </div>
          )}

          {/* ════ GM TAB ════ */}
          {isGM && activeTab === 'gm' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-amber-500/60">Platform Diagnostics</h3>
                <SettingsCard>
                  <SettingsRow 
                    icon={ShieldCheck}
                    title="Platform Oversight"
                    description="Content safety is active across your account."
                    action={<StatusPill tone="success" className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">Active Clear</StatusPill>}
                  />
                  <SettingsRow 
                    icon={Database}
                    title="System Health"
                    description="Check that all generation services are running normally."
                    action={
                      <button onClick={handleHealthRefresh} className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.12] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <RefreshCw className={`h-4 w-4 transition-transform duration-500 ${healthQuery.isFetching ? 'animate-spin' : 'group-hover:rotate-180'}`} /> Run Check
                      </button>
                    }
                  />
                  {providerHealth.length > 0 && (
                    <div className="px-5 pb-6">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {providerHealth.filter((p) => p.name !== 'comfyui-local').map((provider) => {
                          const isHealthy = provider.status === 'healthy'
                          const isDegraded = provider.status === 'degraded' || provider.status === 'not_configured'
                          const isDisabled = provider.status === 'disabled'
                          return (
                            <div key={provider.name} className="group relative flex items-center gap-4 rounded-[16px] border border-white/[0.04] bg-black/40 px-5 py-4 transition-all duration-400 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:-translate-y-0.5">
                              <div className="absolute inset-0 overflow-hidden rounded-[16px] opacity-0 transition-opacity duration-500 group-hover:opacity-100 mix-blend-overlay pointer-events-none">
                                <div className="absolute -inset-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.2)_0%,transparent_50%)]" />
                              </div>
                              <div className={`relative flex h-3 w-3 shrink-0 items-center justify-center rounded-full shadow-lg ${isHealthy ? 'bg-emerald-400 shadow-emerald-400/40' : isDegraded ? 'bg-amber-400 shadow-amber-400/40' : isDisabled ? 'bg-zinc-600' : 'bg-red-400 shadow-red-400/40'}`}>
                                {isHealthy && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" />}
                                {isDegraded && <div className="absolute inset-0 rounded-full bg-amber-400 animate-pulse opacity-80" />}
                                {(!isHealthy && !isDegraded && !isDisabled) && <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-80 duration-700" />}
                              </div>
                              <div className="min-w-0 flex-1 relative z-10">
                                <div className="text-[13px] font-bold capitalize text-white tracking-wide transition-colors duration-300 group-hover:text-[rgb(var(--primary-light))]">{provider.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                                <div className="truncate text-[11px] font-medium text-zinc-500 mt-1 transition-colors duration-300 group-hover:text-zinc-400 uppercase tracking-widest">{provider.detail ?? provider.status.replace(/_/g, ' ')}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </SettingsCard>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-amber-500/60">Community Controls</h3>
                <SettingsCard>
                  <SettingsRow
                    icon={Users}
                    title="User Management"
                    description="Workspace account administration stays in backoffice tooling."
                    action={<StatusPill tone="neutral">Backoffice only</StatusPill>}
                  />
                  <SettingsRow
                    icon={BarChart3}
                    title="Growth Analytics"
                    description="Growth and spend analytics are kept outside the Studio shell until public rollout."
                    action={<StatusPill tone="neutral">Not in shell</StatusPill>}
                  />
                  <SettingsRow
                    icon={Trash2}
                    title="Clear Sandbox Data"
                    description="Sandbox cleanup stays manual-only to avoid destructive accidental clicks."
                    action={<StatusPill tone="neutral">Manual only</StatusPill>}
                    danger
                  />
                </SettingsCard>
              </div>

            </div>
          )}

        </main>
      </div>
    </AppPage>
  )
}
