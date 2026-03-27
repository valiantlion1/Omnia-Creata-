import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { AppPage, StatusPill, Surface } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type HealthProvider, type HealthResponse, type LocalRuntimeSummary } from '@/lib/studioApi'
import { useStudioUiPrefs } from '@/lib/studioUi'

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Surface tone="muted" className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        {description ? <div className="mt-1 text-sm text-zinc-400">{description}</div> : null}
      </div>
      <div className="divide-y divide-white/[0.06] rounded-[20px] border border-white/[0.06] bg-black/20">{children}</div>
    </Surface>
  )
}

function SettingsRow({
  label,
  value,
  detail,
  actions,
}: {
  label: string
  value?: ReactNode
  detail?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-white">{label}</div>
        {detail ? <div className="mt-1 text-sm leading-6 text-zinc-400">{detail}</div> : null}
      </div>
      {value ? <div className="shrink-0 text-sm text-zinc-200">{value}</div> : null}
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

const docsLinks = [
  { id: 'faq', label: 'FAQ' },
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'policy', label: 'Usage policy' },
]

export default function SettingsPage() {
  const { auth, isAuthenticated, isLoading, isAuthSyncing, signInLocalOwner, signOut } = useStudioAuth()
  const { prefs, setTipsEnabled, resetTips } = useStudioUiPrefs()
  const [ownerKey, setOwnerKey] = useState('')
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [isActivatingOwnerMode, setIsActivatingOwnerMode] = useState(false)

  const settingsQuery = useQuery({
    queryKey: ['settings-bootstrap'],
    queryFn: () => studioApi.getSettingsBootstrap(),
    enabled: isAuthenticated,
  })

  const healthQuery = useQuery({
    queryKey: ['health', 'detail'],
    queryFn: () => studioApi.getHealthDetail(),
  })

  const health = healthQuery.data as HealthResponse | undefined
  const providerHealth = useMemo<HealthProvider[]>(() => health?.providers ?? [], [health?.providers])
  const localRuntime = (settingsQuery.data?.local_runtime ?? health?.local_runtime) as LocalRuntimeSummary | undefined
  const isOwnerMode = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading settings...</div>
  }

  async function handleActivateOwnerMode() {
    try {
      setIsActivatingOwnerMode(true)
      setOwnerError(null)
      await signInLocalOwner(ownerKey)
      setOwnerKey('')
    } catch (error) {
      setOwnerError(error instanceof Error ? error.message : 'Unable to activate local owner mode.')
    } finally {
      setIsActivatingOwnerMode(false)
    }
  }

  return (
    <AppPage className="max-w-[1480px]">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Settings</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[2rem]">Settings</h1>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-5">
          <SettingsSection title="Account" description="Identity, access, and current Studio state.">
            <SettingsRow label="Name" value={auth?.identity.display_name ?? 'Guest'} />
            <SettingsRow label="Email" value={auth?.identity.email || 'Guest browse mode'} />
            <SettingsRow label="Subscription" value={auth?.plan.label ?? 'Guest'} />
            <SettingsRow
              label="Credits"
              value={<span className="font-medium text-white">{auth?.credits.remaining ?? 0}</span>}
              detail={auth?.guest ? 'Credits unlock after sign-in.' : 'Available credits in your current balance.'}
            />
            <SettingsRow
              label="Mode"
              value={
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusPill tone="neutral">{auth?.guest ? 'Guest' : 'Signed in'}</StatusPill>
                  {auth?.identity.local_access ? <StatusPill tone="success">Local</StatusPill> : <StatusPill tone="neutral">Cloud</StatusPill>}
                </div>
              }
            />
            {!auth?.guest ? (
              <SettingsRow
                label="Session"
                value={<StatusPill tone={isAuthSyncing ? 'warning' : 'success'}>{isAuthSyncing ? 'Syncing' : 'Active'}</StatusPill>}
                detail="Use My Account for identity details. Sign out lives here so the rest of the app stays content-first."
                actions={
                  <button
                    onClick={signOut}
                    className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]"
                  >
                    Sign out
                  </button>
                }
              />
            ) : null}
          </SettingsSection>

          <SettingsSection title="Guidance" description="Control in-app tips and help surfaces.">
            <SettingsRow
              label="Tips"
              value={<StatusPill tone={prefs.tipsEnabled ? 'brand' : 'neutral'}>{prefs.tipsEnabled ? 'On' : 'Off'}</StatusPill>}
              detail="Small contextual hints in Explore, Create, Chat, and Library."
              actions={
                <button
                  onClick={() => setTipsEnabled(!prefs.tipsEnabled)}
                  className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  {prefs.tipsEnabled ? 'Turn off' : 'Turn on'}
                </button>
              }
            />
            <SettingsRow
              label="Dismissed tips"
              detail="Bring back the hints you closed earlier."
              actions={
                <button
                  onClick={resetTips}
                  className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]"
                >
                  Reset tips
                </button>
              }
            />
            <SettingsRow
              label="Learn"
              detail="Open the short usage guide without leaving the app."
              actions={
                <Link to="/learn" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
                  Open Learn
                </Link>
              }
            />
          </SettingsSection>

          <SettingsSection title="Documentation" description="Public-facing help, legal, and policy pages.">
            {docsLinks.map((item) => (
              <SettingsRow
                key={item.id}
                label={item.label}
                detail={`Open ${item.label.toLowerCase()} content.`}
                actions={
                  <Link to={`/docs#${item.id}`} className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
                    Open
                  </Link>
                }
              />
            ))}
          </SettingsSection>
        </div>

        <div className="space-y-5">
          <SettingsSection title="Local runtime" description="Turn your machine into a private Studio compute lane.">
            <SettingsRow
              label="Status"
              value={
                localRuntime ? (
                  <StatusPill
                    tone={
                      localRuntime.status === 'healthy'
                        ? 'success'
                        : localRuntime.status === 'disabled'
                          ? 'neutral'
                          : localRuntime.status === 'not_configured' || localRuntime.status === 'degraded'
                            ? 'warning'
                            : 'danger'
                    }
                  >
                    {localRuntime.status}
                  </StatusPill>
                ) : (
                  'Loading'
                )
              }
              detail={localRuntime?.detail ?? 'Runtime status is still loading.'}
            />
            <SettingsRow label="ComfyUI endpoint" value={localRuntime?.url ?? 'Not configured'} />
            <SettingsRow label="Model directory" value={localRuntime?.model_directory ?? 'Not configured'} />
            <SettingsRow label="Discovered models" value={String(localRuntime?.discovered_models ?? 0)} />
            <SettingsRow
              label="Owner mode"
              value={<StatusPill tone={isOwnerMode ? 'success' : 'warning'}>{isOwnerMode ? 'Enabled' : 'Locked'}</StatusPill>}
              detail={isOwnerMode ? 'Local model access is active.' : 'Enable this on your own machine to use local checkpoints.'}
            />
            {!isOwnerMode ? (
              <div className="px-4 py-3.5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={ownerKey}
                    onChange={(event) => setOwnerKey(event.target.value)}
                    placeholder="Optional owner key"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
                  />
                  <button
                    onClick={handleActivateOwnerMode}
                    disabled={isActivatingOwnerMode}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isActivatingOwnerMode ? 'Activating...' : 'Activate owner mode'}
                  </button>
                </div>
                {ownerError ? <div className="mt-3 text-sm text-rose-200">{ownerError}</div> : null}
              </div>
            ) : null}
          </SettingsSection>

          <SettingsSection title="Subscription" description="Plans and limits without opening a giant pricing wall.">
            {(settingsQuery.data?.plans ?? []).map((plan) => (
              <SettingsRow
                key={plan.id}
                label={plan.label}
                value={<StatusPill tone={plan.id === auth?.plan.id ? 'brand' : 'neutral'}>{plan.monthly_credits} credits</StatusPill>}
                detail={`${plan.queue_priority} queue, max resolution ${plan.max_resolution}${plan.share_links ? ', share links on' : ''}.`}
              />
            ))}
            <div className="px-4 py-3.5">
              <Link to="/subscription" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
                Open subscription
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection title="Model access" description="Which models are available in your current setup.">
            {(settingsQuery.data?.models ?? []).map((model) => (
              <SettingsRow
                key={model.id}
                label={model.label}
                value={
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusPill tone={model.runtime === 'local' ? 'warning' : model.min_plan === 'pro' ? 'warning' : 'brand'}>{model.runtime}</StatusPill>
                    {model.owner_only ? <StatusPill tone="neutral">owner only</StatusPill> : null}
                  </div>
                }
                detail={`${model.credit_cost} credits, up to ${model.max_width}x${model.max_height}. ${model.description}`}
              />
            ))}
          </SettingsSection>

          <SettingsSection title="Provider health" description="Current provider and service status.">
            {providerHealth.length ? (
              providerHealth.map((provider) => (
                <SettingsRow
                  key={provider.name}
                  label={provider.name}
                  value={
                    <StatusPill
                      tone={
                        provider.status === 'healthy'
                          ? 'success'
                          : provider.status === 'not_configured' || provider.status === 'degraded'
                            ? 'warning'
                            : provider.status === 'disabled'
                              ? 'neutral'
                              : 'danger'
                      }
                    >
                      {provider.status}
                    </StatusPill>
                  }
                  detail={provider.detail ?? 'No details available.'}
                />
              ))
            ) : (
              <SettingsRow label="Providers" value="Loading" detail="Provider health is still loading." />
            )}
          </SettingsSection>
        </div>
      </div>
    </AppPage>
  )
}
