import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  LogOut,
  Monitor,
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
} from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { InlineBadge } from '@/components/VerificationBadge'
import { studioApi, type HealthProvider, type HealthResponse } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { useStudioUiPrefs, THEME_OPTIONS } from '@/lib/studioUi'

/* ─── Card primitives ─── */
function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ icon: Icon, label, actions, className = '' }: { icon: typeof Shield; label: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05]">
          <Icon className="h-4 w-4 text-zinc-400" />
        </div>
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{label}</span>
      </div>
      {actions}
    </div>
  )
}

function SettingRow({
  icon: Icon,
  title,
  description,
  trailing,
  onClick,
}: {
  icon?: typeof Shield
  title: string
  description?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${onClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}
      onClick={onClick}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 text-zinc-500" /> : null}
      <div className="min-w-0 flex-1 text-left">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {description ? <div className="mt-0.5 text-[12px] text-zinc-500">{description}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </Wrapper>
  )
}

function LinkRow({ to, icon: Icon, title, description }: { to: string; icon: typeof Shield; title: string; description?: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/[0.04]">
      <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {description ? <div className="mt-0.5 text-[12px] text-zinc-500">{description}</div> : null}
      </div>
      <ChevronRight className="h-4 w-4 text-zinc-600" />
    </Link>
  )
}

function QuickAction({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.1]"
    >
      {children}
    </button>
  )
}

/* ─── page ─── */
export default function SettingsPage() {
  const { auth, isAuthenticated, isLoading, isAuthSyncing, signOut } = useStudioAuth()
  const { prefs, setTipsEnabled, setTheme, resetTips } = useStudioUiPrefs()

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
    return <div className="px-6 py-12 text-sm text-zinc-500">Loading settings...</div>
  }

  return (
    <AppPage className="max-w-[880px] gap-6 py-8">
      {/* Header */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Settings</div>
        <h1 className="mt-1 text-[1.85rem] font-semibold tracking-[-0.04em] text-white">Studio Settings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Personalize your workspace and manage your account.
        </p>
      </div>

      {/* ─── Account Card ─── */}
      <GlassCard>
        <CardHeader icon={User} label="Account" />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-xl font-bold text-white ring-1 ring-white/[0.08]">
              {(auth?.identity.display_name ?? 'G').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}</span>
                <InlineBadge plan={auth?.identity.plan} ownerMode={auth?.identity.owner_mode} />
              </div>
              <div className="mt-0.5 text-sm text-zinc-500">{auth?.identity.email || 'Guest browse mode'}</div>
              <div className="mt-1 flex items-center gap-2">
                <StatusPill tone={auth?.guest ? 'neutral' : 'brand'}>{auth?.plan.label ?? 'Guest'}</StatusPill>
                <span className="text-xs text-zinc-500">{auth?.credits.remaining ?? 0} credits remaining</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
            <Link
              to="/account"
              className="rounded-full bg-white/[0.06] px-4 py-2 text-[12px] font-medium text-white transition hover:bg-white/[0.12]"
            >
              Edit Profile
            </Link>
            {!auth?.guest ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2 text-[12px] font-medium text-red-400 transition hover:bg-red-500/20"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            ) : null}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-3 divide-y divide-white/[0.04]">
          <LinkRow to="/subscription" icon={CreditCard} title="Manage plan" description="View plans, billing, and credit top-ups" />
          <LinkRow to="/account" icon={User} title="Public profile" description="Edit your display name, bio, and profile visibility" />
        </div>
      </GlassCard>

      {/* ─── Preferences ─── */}
      <GlassCard>
        <CardHeader icon={Palette} label="Preferences" />
        <div className="divide-y divide-white/[0.04]">
          {/* Theme Picker */}
          <div className="px-3 py-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05]">
                <Palette className="h-4 w-4 text-zinc-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-zinc-100">Theme</div>
                <div className="text-[12px] text-zinc-500">Choose your Studio color palette</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {THEME_OPTIONS.map((theme) => {
                const isActive = prefs.theme === theme.id
                return (
                  <button
                    key={theme.id}
                    onClick={() => setTheme(theme.id)}
                    title={theme.label}
                    className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3 transition ${
                      isActive
                        ? 'bg-white/[0.08] ring-1 ring-white/[0.15]'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`h-8 w-8 rounded-full transition-transform ${
                          isActive ? 'scale-110 ring-2 ring-white/30 ring-offset-2 ring-offset-[#0b0b0d]' : 'group-hover:scale-105'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`,
                          boxShadow: isActive ? `0 0 16px ${theme.colors[0]}40` : 'none',
                        }}
                      />
                      {isActive ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                        </div>
                      ) : null}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}>
                      {theme.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <SettingRow
            icon={Sparkles}
            title="Interface hints"
            description="Small tips in Explore, Compose, Chat, and Library"
            trailing={
              <QuickAction onClick={() => setTipsEnabled(!prefs.tipsEnabled)}>
                {prefs.tipsEnabled ? 'On' : 'Off'}
              </QuickAction>
            }
          />
          <SettingRow
            icon={RefreshCw}
            title="Reset dismissed tips"
            description="Bring back any hints you've closed"
            trailing={<QuickAction onClick={resetTips}>Reset</QuickAction>}
          />
          {canLoadPrivate && settingsQuery.data?.models?.length ? (
            <SettingRow
              icon={Zap}
              title="Available models"
              description={`${settingsQuery.data.models.length} models accessible on your plan`}
              trailing={
                <div className="flex flex-wrap justify-end gap-1.5">
                  {settingsQuery.data.models
                    .filter((m: { runtime: string }) => m.runtime !== 'local')
                    .slice(0, 4)
                    .map((model: { id: string; label: string; credit_cost: number }) => (
                      <span key={model.id} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-400">
                        {model.label}
                      </span>
                    ))}
                </div>
              }
            />
          ) : (
            <SettingRow
              icon={Zap}
              title="Available models"
              description="Sign in to see which models are accessible to you"
            />
          )}
        </div>
      </GlassCard>

      {/* ─── Security & Privacy — visible to ALL users ─── */}
      <GlassCard>
        <CardHeader icon={Shield} label="Security & Privacy" />
        <div className="divide-y divide-white/[0.04]">
          <SettingRow
            icon={Eye}
            title="Profile visibility"
            description="Control whether your profile is discoverable by other users"
            trailing={
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-zinc-400">
                {auth?.identity.default_visibility === 'public' ? 'Public' : 'Private'}
              </span>
            }
          />
          <SettingRow
            icon={Database}
            title="Export Account Data"
            description="Download a copy of all your generations, chats, and profile metadata (GDPR)"
            trailing={
              <button
                onClick={async () => {
                  try {
                    const data = await studioApi.exportProfile()
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `omia-creata-export-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                  } catch (e) {
                    alert('Export failed.')
                  }
                }}
                className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.1]"
              >
                Export
              </button>
            }
          />
          <SettingRow
            icon={Trash2}
            title="Delete Account"
            description="Permanently erase your account, all assets, and active subscriptions. This cannot be undone."
            trailing={
              <button
                onClick={async () => {
                  if (confirm('Are you absolutely sure you want to delete your account? All data will be wiped.')) {
                    await studioApi.deleteProfile()
                    await signOut()
                  }
                }}
                className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 transition hover:bg-red-500/20"
              >
                Delete Account
              </button>
            }
          />
          <SettingRow
            icon={Shield}
            title="Password"
            description="Change your account password"
            trailing={<QuickAction>Change</QuickAction>}
          />
          <SettingRow
            icon={Monitor}
            title="Active sessions"
            description="View and manage devices where you're signed in"
          />
        </div>
      </GlassCard>

      {/* ════════════════════════════════════════════════════════
         GM Panel — ONLY visible when owner_mode is true.
         Regular users will NEVER see this section.
         No "admin", "owner", "GM" labels — just a subtle crown icon.
         ════════════════════════════════════════════════════════ */}
      {isGM ? (
        <GlassCard className="border-amber-500/10 ring-1 ring-amber-500/5">
          <CardHeader
            icon={Crown}
            label="Control Center"
            className="[&_svg]:text-amber-400/70"
          />
          <div className="divide-y divide-white/[0.04]">
            <SettingRow
              icon={ShieldCheck}
              title="Platform oversight"
              description="Full access to all generation pipelines and moderation tools"
              trailing={
                <StatusPill tone="success">Active</StatusPill>
              }
            />
            <SettingRow
              icon={Users}
              title="User management"
              description="View registered accounts, plans, and usage patterns"
            />
            <SettingRow
              icon={BarChart3}
              title="Analytics"
              description="Generation volume, credit consumption, and growth metrics"
            />
            <SettingRow
              icon={Database}
              title="System diagnostics"
              description="Provider health, queue depth, and error rates"
              trailing={
                <QuickAction onClick={() => healthQuery.refetch()}>
                  <RefreshCw className={`inline h-3 w-3 ${healthQuery.isFetching ? 'animate-spin' : ''}`} /> Check
                </QuickAction>
              }
            />
            {providerHealth.length ? (
              <div className="px-3 py-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {providerHealth
                    .filter((p) => p.name !== 'comfyui-local')
                    .map((provider) => {
                      const isHealthy = provider.status === 'healthy'
                      const isDegraded = provider.status === 'degraded' || provider.status === 'not_configured'
                      const isDisabled = provider.status === 'disabled'
                      return (
                        <div
                          key={provider.name}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
                        >
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isHealthy ? 'bg-emerald-400 shadow-lg shadow-emerald-400/20' : isDegraded ? 'bg-amber-400' : isDisabled ? 'bg-zinc-600' : 'bg-red-400'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium capitalize text-zinc-200">{provider.name}</div>
                            <div className="truncate text-[11px] text-zinc-600">{provider.detail ?? provider.status}</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : null}
            <SettingRow
              icon={Trash2}
              title="Purge test data"
              description="Clear all demo accounts, test generations, and orphaned assets"
            />
          </div>
        </GlassCard>
      ) : null}
    </AppPage>
  )
}
