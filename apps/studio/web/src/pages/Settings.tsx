import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  Zap,
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
import { studioApi, type HealthProvider, type HealthResponse } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { useStudioUiPrefs, THEME_OPTIONS } from '@/lib/studioUi'

/* ─── UI Primitives ──────────────────────────────────────────────────────── */

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
        checked ? 'bg-[rgb(var(--primary))] shadow-[0_0_12px_rgba(var(--primary),0.4)]' : 'bg-white/10'
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
          checked ? 'translate-x-[20px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function SettingsRow({ icon: Icon, title, description, action, danger }: { icon?: any, title: string, description?: string, action?: ReactNode, danger?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 p-5">
      <div className="flex items-start sm:items-center gap-4">
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${danger ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.04] text-zinc-400'}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className={`text-[14px] sm:text-[15px] font-semibold tracking-tight ${danger ? 'text-red-400' : 'text-zinc-100'}`}>{title}</div>
          {description && <div className="mt-1 text-[13px] leading-relaxed text-zinc-500 max-w-xl">{description}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-2 sm:pt-0 w-full sm:w-auto">{action}</div>}
    </div>
  )
}

function SettingsCard({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[20px] ring-1 ring-white/[0.05] bg-white/[0.01] backdrop-blur-xl shadow-xl shadow-black/20 ${compact ? '' : 'divide-y divide-white/[0.04]'}`}>
      {children}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { auth, isAuthenticated, isLoading, isAuthSyncing, signOut } = useStudioAuth()
  const { prefs, setTipsEnabled, setTheme, resetTips } = useStudioUiPrefs()
  
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security' | 'gm'>('general')

  const settingsQuery = useQuery({
    queryKey: ['settings-bootstrap'],
    queryFn: () => studioApi.getSettingsBootstrap(),
    enabled: isAuthenticated,
  })

  const healthQuery = useQuery({
    queryKey: ['health', 'public'],
    queryFn: () => studioApi.getHealth(),
  })

  const health = healthQuery.data as HealthResponse | undefined
  const providerHealth = useMemo<HealthProvider[]>(() => health?.providers ?? [], [health?.providers])
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  // GM Mode — completely invisible to regular users
  const isGM = Boolean(auth?.identity.owner_mode)

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-500">Loading ecosystem...</div>
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

  const handleDelete = async () => {
    if (confirm('Are you absolutely sure you want to delete your account? All data will be wiped.')) {
      await studioApi.deleteProfile()
      await signOut()
    }
  }

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
                className={`flex whitespace-nowrap md:whitespace-normal items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  isActive 
                    ? 'bg-white/[0.08] text-white shadow-sm ring-1 ring-white/10' 
                    : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300'
                }`}
              >
                <tab.icon className={`h-[18px] w-[18px] ${isActive ? 'text-[rgb(var(--primary-light))] drop-shadow-md' : 'opacity-80'}`} />
                {tab.label}
              </button>
            )
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 w-full min-w-0">

          {/* ════ GENERAL TAB ════ */}
          {activeTab === 'general' && (
            <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              {/* Hero Account Card */}
              <div className="relative overflow-hidden rounded-[24px] bg-[#111216] ring-1 ring-white/[0.08] shadow-[0_24px_50px_rgba(0,0,0,0.5)] p-6 md:p-8">
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay [background-image:radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.4)_0,transparent_60%)] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-2xl font-black text-white shadow-lg shadow-[rgb(var(--primary))/20] ring-1 ring-white/20">
                      {(auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">{auth?.identity.display_name ?? 'Guest Workflow'}</span>
                          <InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} />
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-zinc-400">{auth?.identity.email || 'You are exploring securely'}</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusPill tone={auth?.guest ? 'neutral' : 'brand'}>{auth?.plan.label ?? 'Free Access'}</StatusPill>
                          <span className="text-[12px] font-semibold tracking-wide text-zinc-500">{auth?.credits.remaining ?? 0} CREDITS</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 mt-2 md:mt-0">
                    <Link to="/account" className="flex items-center justify-center rounded-xl bg-white text-black px-6 py-2.5 text-[13px] font-bold shadow-md transition hover:bg-zinc-200">
                      Edit Profile
                    </Link>
                    {!auth?.guest && (
                      <button onClick={signOut} className="flex items-center justify-center gap-2 rounded-xl bg-transparent px-6 py-2.5 text-[13px] font-semibold text-zinc-400 hover:text-white hover:bg-white/[0.04] transition">
                        <LogOut className="h-[14px] w-[14px]" /> Sign Out
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
                    description="View active plan details, manage your payment methods, and purchase more credits."
                    action={
                      <Link to="/subscription" className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.1]">
                        Manage Plan <ChevronRight className="h-4 w-4 opacity-50" />
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
                    description="Show subtle, intelligent tooltips seamlessly within tools like Create and Media Library."
                    action={<div className="flex justify-start sm:justify-end w-full"><Switch checked={prefs.tipsEnabled} onChange={() => setTipsEnabled(!prefs.tipsEnabled)} /></div>}
                  />
                  <SettingsRow 
                    icon={RefreshCw}
                    title="Restore Dismissed Guidance"
                    description="Lost track? Reactivate all the onboarding guides and walkthroughs you've dismissed."
                    action={
                      <button onClick={resetTips} className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/10 bg-transparent px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/5">
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
                    description="Set whether new creations and collections are public out of the box."
                    action={
                      <div className="flex items-center gap-1.5 rounded-[12px] bg-black/40 p-1 ring-1 ring-white/10 w-max">
                        <button disabled className={`rounded-[10px] px-5 py-2 text-[12px] font-bold transition-all duration-300 ${auth?.identity.default_visibility === 'public' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Public</button>
                        <button disabled className={`rounded-[10px] px-5 py-2 text-[12px] font-bold transition-all duration-300 ${auth?.identity.default_visibility === 'private' ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Private</button>
                      </div>
                    }
                  />
                  <SettingsRow 
                    icon={HardDriveDownload}
                    title="Download Archive"
                    description="Extract a compiled JSON package of your complete history, assets, and metadata limits."
                    action={
                      <button onClick={handleExport} className="flex w-full sm:w-auto items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.1]">
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
                    description="Update the password used to access this workspace."
                    action={<button className="flex w-full sm:w-auto items-center justify-center rounded-xl bg-white/[0.05] border border-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.1]">Update</button>}
                  />
                  <SettingsRow 
                    icon={MonitorSmartphone}
                    title="Active Sessions"
                    description="Remotely disconnect unrecognized web or app instances."
                    action={<button className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/[0.05] bg-transparent px-5 py-2.5 text-[13px] font-semibold text-zinc-300 transition hover:bg-white/[0.05]">Manage Devices</button>}
                  />
                </SettingsCard>
              </div>

              <div className="space-y-4">
                <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-red-500/60">Danger Zone</h3>
                <SettingsCard compact>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 md:p-8 bg-red-950/20">
                    <div className="min-w-0">
                      <h4 className="text-[16px] font-bold text-red-400">Permanently Delete Workspace</h4>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-red-400/80 max-w-sm">Wiping your account is a terminal action. You will instantly lose your active subscription and your visual history can never be recovered.</p>
                    </div>
                    <button onClick={handleDelete} className="shrink-0 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-[13px] font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 shadow-lg shadow-red-500/10">
                      <AlertTriangle className="h-4 w-4" /> Erase Account
                    </button>
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
                    description="Active clearance for all moderation backends."
                    action={<StatusPill tone="success" className="bg-emerald-500/10 text-emerald-400 ring-emerald-500/20">Active Clear</StatusPill>}
                  />
                  <SettingsRow 
                    icon={Database}
                    title="Provider Telemetry"
                    description="Evaluate real-time queue depths and downstream engine status."
                    action={
                      <button onClick={() => healthQuery.refetch()} className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/[0.1]">
                        <RefreshCw className={`h-3.5 w-3.5 ${healthQuery.isFetching ? 'animate-spin' : ''}`} /> Run Check
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
                            <div key={provider.name} className="flex items-center gap-3.5 rounded-[14px] border border-white/[0.04] bg-white/[0.02] px-4 py-3.5 transition hover:bg-white/[0.04]">
                              <div className={`relative h-2.5 w-2.5 rounded-full ${isHealthy ? 'bg-emerald-400' : isDegraded ? 'bg-amber-400' : isDisabled ? 'bg-zinc-600' : 'bg-red-400'}`}>
                                {isHealthy && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[13px] font-bold capitalize text-zinc-200">{provider.name}</div>
                                <div className="truncate text-[11px] font-medium text-zinc-500 mt-0.5">{provider.detail ?? provider.status.replace('_', ' ')}</div>
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
                  <SettingsRow icon={Users} title="User Management" description="Query registered accounts and intervene securely." />
                  <SettingsRow icon={BarChart3} title="Growth Analytics" description="Review macro statistics of volume and spend patterns." />
                  <SettingsRow icon={Trash2} title="Purge Databases" description="Destroy test environments silently." danger />
                </SettingsCard>
              </div>

            </div>
          )}

        </main>
      </div>
    </AppPage>
  )
}
