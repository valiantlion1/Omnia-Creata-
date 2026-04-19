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
import { studioApi, type ActiveSessionsPayload, type HealthProvider, type HealthResponse, type Visibility } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { getCookiePreferenceSummary, useStudioCookiePreferences } from '@/lib/studioCookiePreferences'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
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

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One symbol', test: (value: string) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(value) },
] as const

function normalizeAuthProviders(primaryProvider?: string | null, providers?: string[] | null) {
  const normalized: string[] = []

  for (const candidate of [primaryProvider, ...(providers ?? [])]) {
    if (typeof candidate !== 'string') continue
    const nextValue = candidate.trim().toLowerCase()
    if (nextValue && !normalized.includes(nextValue)) {
      normalized.push(nextValue)
    }
  }

  return normalized
}

function getAuthProviderLabel(provider?: string | null) {
  switch ((provider ?? '').trim().toLowerCase()) {
    case 'email':
      return 'Email password'
    case 'google':
      return 'Google'
    case 'apple':
      return 'Apple'
    case 'facebook':
      return 'Facebook'
    case 'twitter':
      return 'Twitter'
    default:
      return 'Studio account'
  }
}

function getAuthProviderManagementUrl(provider?: string | null) {
  switch ((provider ?? '').trim().toLowerCase()) {
    case 'google':
      return 'https://myaccount.google.com/security'
    case 'apple':
      return 'https://appleid.apple.com/account/manage'
    case 'facebook':
      return 'https://www.facebook.com/settings?tab=security'
    case 'twitter':
      return 'https://x.com/settings/password'
    default:
      return null
  }
}

function formatSessionTimestamp(value?: string | null) {
  if (!value) return 'Unavailable'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatSessionRelativeTime(value?: string | null) {
  if (!value) return 'Unavailable'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unavailable'
  const deltaMs = Date.now() - parsed.getTime()
  const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000))
  if (deltaMinutes < 1) return 'Just now'
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`
  const deltaHours = Math.round(deltaMinutes / 60)
  if (deltaHours < 24) return `${deltaHours}h ago`
  const deltaDays = Math.round(deltaHours / 24)
  return `${deltaDays}d ago`
}

function getActiveSessionsDescription(payload?: ActiveSessionsPayload | null) {
  if (!payload || payload.session_count === 0) {
    return 'Review the devices that accessed your Studio account recently.'
  }
  if (payload.other_session_count > 0) {
    return `See this device and ${payload.other_session_count} other Studio access point${payload.other_session_count === 1 ? '' : 's'}.`
  }
  return 'This is the only Studio device we have seen recently.'
}

function getActiveSessionsBadgeLabel(payload?: ActiveSessionsPayload | null) {
  if (!payload || payload.session_count === 0) return 'No devices yet'
  return `${payload.session_count} active`
}

function SessionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-black/20 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</div>
      <div className="mt-2 text-sm text-white">{value}</div>
    </div>
  )
}

function ActiveSessionsDialog({
  open,
  sessionsPayload,
  endingOtherSessions,
  onClose,
  onRefresh,
  onEndOtherSessions,
  onSignOutCurrent,
}: {
  open: boolean
  sessionsPayload?: ActiveSessionsPayload | null
  endingOtherSessions: boolean
  onClose: () => void
  onRefresh: () => Promise<unknown>
  onEndOtherSessions: () => Promise<void>
  onSignOutCurrent: () => Promise<void>
}) {
  if (!open) return null

  const sessions = sessionsPayload?.sessions ?? []
  const otherSessions = sessions.filter((session) => !session.current)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-[#0c0d12]/95 shadow-[0_40px_140px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]">
        <div className="border-b border-white/[0.06] px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Security</p>
              <h2 className="mt-2 text-[1.6rem] font-bold tracking-tight text-white">Active sessions</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                Review where Studio was opened recently. If something looks wrong, keep this device and sign the rest out.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Close active sessions dialog"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 sm:px-7">
          <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Studio device overview</h3>
                <p className="mt-1 text-sm leading-7 text-zinc-400">
                  Essential session storage helps keep this device signed in and lets us show recent Studio access for security review.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone="neutral">{getActiveSessionsBadgeLabel(sessionsPayload)}</StatusPill>
                {otherSessions.length > 0 ? (
                  <StatusPill tone="brand">{otherSessions.length} other device{otherSessions.length === 1 ? '' : 's'}</StatusPill>
                ) : null}
              </div>
            </div>
          </section>

          {sessions.length === 0 ? (
            <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-sm leading-7 text-zinc-300">
                Studio has not recorded a recent device snapshot for this account yet. Refresh after the current session settles and this device should appear here.
              </p>
            </section>
          ) : (
            <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
              {sessions.map((session) => (
                <section key={session.id} className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">{session.device_label}</h3>
                      <p className="mt-1 text-sm leading-7 text-zinc-400">
                        {session.surface_label} · {session.browser_label} · {session.os_label}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {session.current ? <StatusPill tone="brand">This device</StatusPill> : <StatusPill tone="neutral">Recent access</StatusPill>}
                      {session.auth_provider ? <StatusPill tone="neutral">{getAuthProviderLabel(session.auth_provider)}</StatusPill> : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <SessionMeta label="Last active" value={`${formatSessionRelativeTime(session.last_seen_at)} · ${formatSessionTimestamp(session.last_seen_at)}`} />
                    <SessionMeta label="First seen" value={formatSessionTimestamp(session.first_seen_at)} />
                    <SessionMeta label="Network" value={session.network_label ?? session.host_label ?? 'Studio access'} />
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            Refresh list
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void onSignOutCurrent()}
              className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Sign out this device
            </button>
            <button
              type="button"
              onClick={() => void onEndOtherSessions()}
              disabled={!sessionsPayload?.can_sign_out_others || endingOtherSessions}
              className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {endingOtherSessions ? 'Signing out other devices...' : 'Sign out other devices'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileEditorDialog({
  open,
  identity,
  profileSaving,
  onClose,
  onSaveProfile,
}: {
  open: boolean
  identity: {
    email?: string
    username?: string | null
    display_name?: string
    bio?: string | null
    default_visibility?: Visibility
  } | null | undefined
  profileSaving: boolean
  onClose: () => void
  onSaveProfile: (payload: { display_name: string; bio: string; default_visibility: Visibility }) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState(identity?.display_name ?? '')
  const [bio, setBio] = useState(identity?.bio ?? '')
  const [defaultVisibility, setDefaultVisibility] = useState<Visibility>(identity?.default_visibility ?? 'public')
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDisplayName(identity?.display_name ?? '')
    setBio(identity?.bio ?? '')
    setDefaultVisibility(identity?.default_visibility ?? 'public')
    setProfileError(null)
  }, [identity?.bio, identity?.default_visibility, identity?.display_name, open])

  if (!open || !identity) return null

  const normalizedDisplayName = displayName.trim()
  const normalizedBio = bio.trim()
  const originalDisplayName = (identity.display_name ?? '').trim()
  const originalBio = (identity.bio ?? '').trim()
  const originalVisibility = identity.default_visibility ?? 'public'
  const canSaveProfile =
    normalizedDisplayName.length > 0 &&
    (normalizedDisplayName !== originalDisplayName ||
      normalizedBio !== originalBio ||
      defaultVisibility !== originalVisibility)

  const handleSaveProfile = async () => {
    setProfileError(null)
    try {
      await onSaveProfile({
        display_name: normalizedDisplayName,
        bio: normalizedBio,
        default_visibility: defaultVisibility,
      })
      onClose()
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Profile changes could not be saved right now.')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-[#0c0d12]/95 shadow-[0_40px_140px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]">
        <div className="border-b border-white/[0.06] px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">General account</p>
              <h2 className="mt-2 text-[1.6rem] font-bold tracking-tight text-white">Edit profile</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-zinc-400">
                Update the parts people actually see around Studio without leaving Settings. Your public handle stays fixed.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={profileSaving || !canSaveProfile}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {profileSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 sm:px-7 lg:grid-cols-[260px_minmax(0,1fr)]">
          <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-[24px] bg-gradient-to-br from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-3xl font-black text-white shadow-[0_0_40px_rgba(var(--primary),0.3)]">
              {(normalizedDisplayName || identity.username || 'S').slice(0, 1).toUpperCase()}
            </div>
            <div className="mt-4 text-xl font-bold tracking-tight text-white">{normalizedDisplayName || 'Studio creator'}</div>
            <div className="mt-1 text-sm font-medium text-zinc-400">@{identity.username ?? 'creator'}</div>
            {identity.email ? <div className="mt-3 text-sm text-zinc-500">{identity.email}</div> : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill tone={defaultVisibility === 'public' ? 'brand' : 'neutral'}>
                {defaultVisibility === 'public' ? 'Public by default' : 'Private by default'}
              </StatusPill>
              <StatusPill tone="neutral">Handle locked</StatusPill>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Display name and bio change how you appear around Studio. Public links and mentions keep using the same stable @{identity.username ?? 'creator'} handle.
            </p>
          </section>

          <div className="space-y-4">
            <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-white">Public identity</h3>
                  <p className="mt-1 text-sm leading-7 text-zinc-400">Choose the visible name and short profile copy people see around Studio.</p>
                </div>
                <StatusPill tone="neutral">@{identity.username ?? 'creator'}</StatusPill>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="How Studio should show your name"
                    className="mt-2 w-full rounded-[18px] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition focus:ring-white/20"
                  />
                </label>

                <div className="rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Public handle</div>
                  <div className="mt-2 text-sm font-semibold text-white">@{identity.username ?? 'creator'}</div>
                  <p className="mt-2 text-xs leading-6 text-zinc-500">Handles stay stable so links, mentions, and published ownership do not drift.</p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Bio</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value.slice(0, 220))}
                  rows={4}
                  placeholder="Tell people what kind of work, style, or creative focus they should expect from you."
                  className="mt-2 w-full resize-none rounded-[18px] bg-black/30 px-4 py-3 text-sm leading-7 text-white outline-none ring-1 ring-white/10 transition focus:ring-white/20"
                />
              </label>
              <p className="mt-2 text-xs leading-6 text-zinc-500">{bio.length}/220 characters</p>
            </section>

            <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-white">Profile defaults</h3>
                  <p className="mt-1 text-sm leading-7 text-zinc-400">Choose whether new creations should start public or stay private until you share them.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-black/20 p-1 ring-1 ring-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setDefaultVisibility('public')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      defaultVisibility === 'public' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefaultVisibility('private')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      defaultVisibility === 'private' ? 'bg-white text-black' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    Private
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className={`rounded-[18px] border px-4 py-3 ${defaultVisibility === 'public' ? 'border-violet-300/20 bg-violet-300/10 text-violet-100' : 'border-white/[0.06] bg-black/20 text-zinc-300'}`}>
                  <div className="text-sm font-semibold">Public first</div>
                  <p className="mt-1 text-xs leading-6 text-current/80">New work can appear on your public profile once you publish it.</p>
                </div>
                <div className={`rounded-[18px] border px-4 py-3 ${defaultVisibility === 'private' ? 'border-violet-300/20 bg-violet-300/10 text-violet-100' : 'border-white/[0.06] bg-black/20 text-zinc-300'}`}>
                  <div className="text-sm font-semibold">Private first</div>
                  <p className="mt-1 text-xs leading-6 text-current/80">New work stays personal until you intentionally share or publish it.</p>
                </div>
              </div>
            </section>

            {profileError ? <p className="text-sm text-rose-200">{profileError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function CredentialsDialog({
  open,
  identity,
  passwordSaving,
  onClose,
  onSavePassword,
}: {
  open: boolean
  identity: {
    email?: string
    username?: string | null
    display_name?: string
    auth_provider?: string | null
    auth_providers?: string[]
    credentials_managed_by_provider?: boolean
  } | null | undefined
  passwordSaving: boolean
  onClose: () => void
  onSavePassword: (value: string) => Promise<void>
}) {
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setNextPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }, [open])

  if (!open || !identity) return null

  const linkedProviders = normalizeAuthProviders(identity.auth_provider, identity.auth_providers)
  const primaryProvider = linkedProviders[0] ?? null
  const providerLabel = getAuthProviderLabel(primaryProvider)
  const providerManagementUrl = getAuthProviderManagementUrl(primaryProvider)
  const showManagedProviderCopy = Boolean(identity.credentials_managed_by_provider || (primaryProvider && primaryProvider !== 'email'))
  const passwordChecks = PASSWORD_REQUIREMENTS.map((rule) => ({ ...rule, passed: rule.test(nextPassword) }))
  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== nextPassword
  const canSavePassword =
    nextPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !passwordMismatch &&
    passwordChecks.every((rule) => rule.passed)

  const handlePasswordSave = async () => {
    setPasswordError(null)
    try {
      await onSavePassword(nextPassword)
      setNextPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password could not be updated right now.')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-[#0c0d12]/95 shadow-[0_40px_140px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]">
        <div className="border-b border-white/[0.06] px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Account security</p>
              <h2 className="mt-2 text-[1.6rem] font-bold tracking-tight text-white">Sign-in & password</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-zinc-400">
                Profile editing lives in General Account. Use this surface to review the provider connected to Studio and update the password when Studio manages it.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Close sign-in dialog"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 sm:px-7">
          <section className="rounded-[22px] border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Sign-in method</h3>
                <p className="mt-1 text-sm leading-7 text-zinc-400">Studio keeps login rules tied to the provider that owns your credentials.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={showManagedProviderCopy ? 'neutral' : 'brand'}>{providerLabel}</StatusPill>
                {linkedProviders.slice(1).map((providerName) => (
                  <StatusPill key={providerName} tone="neutral">{getAuthProviderLabel(providerName)}</StatusPill>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Account email</div>
              <div className="mt-2 text-sm text-white">{identity.email ?? 'Not available'}</div>
            </div>

            {showManagedProviderCopy ? (
              <div className="mt-4 rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-4">
                <p className="text-sm leading-7 text-zinc-300">
                  This account signs in with {providerLabel}. Password and recovery settings stay with that provider instead of living inside Studio.
                </p>
                {providerManagementUrl ? (
                  <a
                    href={providerManagementUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                  >
                    Open {providerLabel} security
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">New password</span>
                    <input
                      type="password"
                      value={nextPassword}
                      onChange={(event) => setNextPassword(event.target.value)}
                      placeholder="Set a stronger password"
                      className="mt-2 w-full rounded-[18px] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition focus:ring-white/20"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Confirm password</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repeat the new password"
                      className="mt-2 w-full rounded-[18px] bg-black/30 px-4 py-3 text-sm text-white outline-none ring-1 ring-white/10 transition focus:ring-white/20"
                    />
                  </label>
                </div>

                <div className="rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Password rules</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {passwordChecks.map((rule) => (
                      <StatusPill key={rule.label} tone={rule.passed ? 'success' : 'neutral'}>
                        {rule.label}
                      </StatusPill>
                    ))}
                  </div>
                  {passwordMismatch ? <p className="mt-3 text-sm text-rose-200">Password confirmation does not match.</p> : null}
                  {passwordError ? <p className="mt-3 text-sm text-rose-200">{passwordError}</p> : null}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasswordSave}
                    disabled={passwordSaving || !canSavePassword}
                    className="rounded-xl border border-white/[0.12] bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {passwordSaving ? 'Updating...' : 'Update password'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  usePageMeta('Settings', 'Customize your Omnia Creata Studio preferences and account.')
  const { auth, isAuthenticated, isLoading, signOut } = useStudioAuth()
  const { openPreferences, preferences: cookiePreferences } = useStudioCookiePreferences()
  const { prefs, setTipsEnabled, setTheme, resetTips } = useStudioUiPrefs()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'security' | 'gm'>('general')
  const [notice, setNotice] = useState<{ tone: 'info' | 'success' | 'warning'; title: string; body: string } | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false)
  const [activeSessionsDialogOpen, setActiveSessionsDialogOpen] = useState(false)
  const [pendingVisibility, setPendingVisibility] = useState<Visibility | null>(null)
  const activeDefaultVisibility = pendingVisibility ?? auth?.identity.default_visibility ?? 'public'
  const isGMMode = Boolean(auth?.identity.owner_mode)
  const hasInternalAccess = Boolean((auth?.identity.owner_mode || auth?.identity.root_admin) && auth?.plan.can_generate)
  const settingsTabs: Array<{ id: 'general' | 'appearance' | 'security' | 'gm'; icon: any; label: string; mobileLabel: string }> = [
    { id: 'general', icon: User, label: 'General Account', mobileLabel: 'General' },
    { id: 'appearance', icon: Palette, label: 'Appearance & UI', mobileLabel: 'Look' },
    { id: 'security', icon: Shield, label: 'Privacy & Security', mobileLabel: 'Privacy' },
  ]
  if (isGMMode) {
    settingsTabs.push({ id: 'gm', icon: Crown, label: 'Control Center', mobileLabel: 'Studio' })
  }

  const settingsBootstrapQuery = useQuery({
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

  const profileMutation = useMutation({
    mutationFn: (payload: { display_name?: string; bio?: string; default_visibility?: Visibility }) =>
      studioApi.updateMyProfile(payload),
  })

  const endOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseBrowser.auth.signOut({ scope: 'others' })
      if (error) throw error
      return await studioApi.endOtherSettingsSessions()
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
      ])
      setNotice({
        tone: 'success',
        title: 'Other devices signed out',
        body: 'Studio kept this device active and asked the rest to sign in again.',
      })
    },
    onError: (error) => {
      setNotice({
        tone: 'warning',
        title: 'Could not sign out other devices',
        body: error instanceof Error ? error.message : 'Try again in a moment.',
      })
    },
  })

  const [passwordSaving, setPasswordSaving] = useState(false)

  const health = healthQuery.data as HealthResponse | undefined
  const activeSessions = settingsBootstrapQuery.data?.active_sessions
  const providerHealth = useMemo<HealthProvider[]>(() => health?.providers ?? [], [health?.providers])
  const cookiePreferenceSummary = getCookiePreferenceSummary(cookiePreferences)
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

  const linkedAuthProviders = normalizeAuthProviders(auth?.identity.auth_provider, auth?.identity.auth_providers)
  const primaryAuthProvider = linkedAuthProviders[0] ?? null
  const primaryAuthProviderLabel = getAuthProviderLabel(primaryAuthProvider)
  const credentialsDescription =
    primaryAuthProvider === 'email'
      ? 'Review the sign-in method for this account and update the password used for Studio email sign-in.'
      : primaryAuthProvider
        ? `Review the provider linked to this account. Password and recovery changes stay with ${primaryAuthProviderLabel}.`
        : 'Review the active sign-in provider and any password controls available for this account.'
  const activeSessionsDescription = getActiveSessionsDescription(activeSessions)
  const activeSessionsBadgeLabel = getActiveSessionsBadgeLabel(activeSessions)

  const handleProfileSave = async (payload: { display_name: string; bio: string; default_visibility: Visibility }) => {
    await profileMutation.mutateAsync(payload)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
      queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
    ])
    setPendingVisibility(payload.default_visibility)
    setNotice({
      tone: 'success',
      title: 'Profile updated',
      body: 'Your updated display name, bio, and profile defaults now flow through Studio while your public handle stays unchanged.',
    })
  }

  const handlePasswordSave = async (value: string) => {
    setPasswordSaving(true)
    try {
      const { error } = await supabaseBrowser.auth.updateUser({ password: value })
      if (error) throw error
      setNotice({
        tone: 'success',
        title: 'Password updated',
        body: 'Future email/password sign-ins will use the new password.',
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleEndOtherSessions = async () => {
    await endOtherSessionsMutation.mutateAsync()
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
        <aside className="scrollbar-hide flex w-full shrink-0 snap-x snap-mandatory flex-row gap-2 overflow-x-auto pb-4 md:w-56 md:flex-col md:overflow-visible md:pb-0">
          {settingsTabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`group relative flex shrink-0 snap-start items-center gap-3 whitespace-nowrap rounded-[16px] px-4 py-3 text-[13px] font-bold tracking-wide transition-all duration-400 md:px-5 md:py-3.5 md:text-[14px] md:whitespace-normal ${
                    isActive 
                      ? 'bg-gradient-to-r from-[rgb(var(--primary-light)/0.1)] to-transparent text-white' 
                      : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-2/3 w-[3px] -translate-y-1/2 rounded-r-full bg-[rgb(var(--primary-light))] shadow-[0_0_12px_rgb(var(--primary-light))]" />
                  )}
                  <tab.icon className={`relative z-10 h-5 w-5 transition-transform duration-400 ${isActive ? 'text-[rgb(var(--primary-light))] drop-shadow-[0_0_8px_rgba(var(--primary-light),0.5)] scale-110' : 'opacity-80 group-hover:scale-105'}`} />
                  <span className="relative z-10 md:hidden">{tab.mobileLabel}</span>
                  <span className="relative z-10 hidden md:inline">{tab.label}</span>
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
                      <button
                        type="button"
                        onClick={() => setProfileDialogOpen(true)}
                        className="relative overflow-hidden flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-[14px] font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)]"
                      >
                        Edit Profile
                      </button>
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
                    description="Remember this browser's guidance preference for tips and walkthrough cues."
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
                  <SettingsRow 
                    icon={Shield}
                    title="Cookie preferences"
                    description="Revisit analytics consent for this browser. Essential storage stays on; optional PostHog analytics only runs when you allow it."
                    action={
                      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                        <StatusPill tone={cookiePreferences?.analytics ? 'brand' : 'neutral'}>{cookiePreferenceSummary}</StatusPill>
                        <button
                          type="button"
                          onClick={openPreferences}
                          className="group flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                          Manage cookies
                        </button>
                      </div>
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
                    description={credentialsDescription}
                    action={
                      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                        <StatusPill tone={primaryAuthProvider === 'email' ? 'brand' : 'neutral'}>{primaryAuthProviderLabel}</StatusPill>
                        <button
                          type="button"
                          onClick={() => setCredentialsDialogOpen(true)}
                          className="group flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                          Manage sign-in
                        </button>
                      </div>
                    }
                  />
                  <SettingsRow 
                    icon={MonitorSmartphone}
                    title="Active Sessions"
                    description={activeSessionsDescription}
                    action={
                      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:justify-end">
                        <StatusPill tone={activeSessions?.can_sign_out_others ? 'brand' : 'neutral'}>{activeSessionsBadgeLabel}</StatusPill>
                        <button
                          type="button"
                          onClick={() => setActiveSessionsDialogOpen(true)}
                          className="group flex w-full sm:w-auto items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                          Manage sessions
                        </button>
                      </div>
                    }
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
      <ProfileEditorDialog
        open={profileDialogOpen}
        identity={auth?.identity}
        profileSaving={profileMutation.isPending}
        onClose={() => setProfileDialogOpen(false)}
        onSaveProfile={handleProfileSave}
      />
      <CredentialsDialog
        open={credentialsDialogOpen}
        identity={auth?.identity}
        passwordSaving={passwordSaving}
        onClose={() => setCredentialsDialogOpen(false)}
        onSavePassword={handlePasswordSave}
      />
      <ActiveSessionsDialog
        open={activeSessionsDialogOpen}
        sessionsPayload={activeSessions}
        endingOtherSessions={endOtherSessionsMutation.isPending}
        onClose={() => setActiveSessionsDialogOpen(false)}
        onRefresh={() => settingsBootstrapQuery.refetch()}
        onEndOtherSessions={handleEndOtherSessions}
        onSignOutCurrent={signOut}
      />
    </AppPage>
  )
}
