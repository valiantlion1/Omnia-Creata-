import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type HealthProvider, type HealthResponse } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { useStudioUiPrefs } from '@/lib/studioUi'

function Section({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="border-b border-white/[0.06] py-6 first:pt-0 last:border-b-0">
      <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{title}</div>
      <div className="mt-4 divide-y divide-white/[0.06] border-y border-white/[0.06] bg-white/[0.015]">
        {children}
      </div>
    </section>
  )
}

function Row({
  title,
  description,
  value,
  actions,
}: {
  title: string
  description?: ReactNode
  value?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        {description ? <div className="mt-1 text-sm leading-7 text-zinc-500">{description}</div> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {value ? <div className="text-sm text-zinc-300">{value}</div> : null}
        {actions}
      </div>
    </div>
  )
}

function SoftButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white transition hover:bg-white/[0.08] ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

const docsLinks = [
  { id: 'faq', label: 'FAQ' },
  { id: 'terms', label: 'Terms' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'usage-policy', label: 'Usage policy' },
]

export default function SettingsPage() {
  const { auth, isAuthenticated, isLoading, isAuthSyncing, signOut } = useStudioAuth()
  const { prefs, setTipsEnabled, resetTips } = useStudioUiPrefs()
  const queryClient = useQueryClient()

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
  const isOwnerMode = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { display_name?: string; bio?: string; default_visibility?: 'public' | 'private' }) =>
      studioApi.updateMyProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
    },
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-500">Loading settings...</div>
  }

  return (
    <AppPage className="max-w-[1320px] gap-0 py-5">
      <div className="border-b border-white/[0.06] pb-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Settings</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Studio settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-500">
          Keep account, security, notifications, and documentation in one quiet place.
        </p>
      </div>

      <Section label="Account" title="Identity and access">
        <Row title="Name" value={auth?.identity.display_name ?? 'Guest'} />
        <Row
          title="Display name"
          description="This is what appears on your profile and anywhere your public work shows up."
          value={auth?.identity.display_name ?? 'Guest'}
          actions={
            !auth?.guest ? (
              <SoftButton
                onClick={async () => {
                  const nextName = window.prompt('Display name', auth?.identity.display_name ?? '')
                  if (!nextName) return
                  await updateProfileMutation.mutateAsync({ display_name: nextName })
                }}
              >
                Edit
              </SoftButton>
            ) : null
          }
        />
        <Row title="Email" value={auth?.identity.email || 'Guest browse mode'} />
        <Row title="Plan" value={auth?.plan.label ?? 'Guest'} />
        <Row
          title="Credits"
          value={<span className="font-medium text-white">{auth?.credits.remaining ?? 0}</span>}
          description={auth?.guest ? 'Credits unlock after sign in.' : 'Current Studio balance.'}
        />
        <Row
          title="Public profile default"
          value={<StatusPill tone={auth?.identity.default_visibility === 'private' ? 'neutral' : 'brand'}>{auth?.identity.default_visibility ?? 'public'}</StatusPill>}
          description="Choose whether new work should default to public visibility in Explore or stay private until you publish it."
          actions={
            <div className="flex flex-wrap gap-2">
              <SoftButton onClick={() => updateProfileMutation.mutate({ default_visibility: 'public' })}>Default public</SoftButton>
              <SoftButton onClick={() => updateProfileMutation.mutate({ default_visibility: 'private' })}>Default private</SoftButton>
            </div>
          }
        />
        <Row
          title="Profile bio"
          description={auth?.identity.bio ? auth.identity.bio : 'Add a short bio for your public profile.'}
          actions={
            <SoftButton
              onClick={async () => {
                const nextBio = window.prompt('Profile bio', auth?.identity.bio ?? '')
                if (nextBio === null) return
                await updateProfileMutation.mutateAsync({ bio: nextBio })
              }}
            >
              {auth?.identity.bio ? 'Edit bio' : 'Add bio'}
            </SoftButton>
          }
        />
        <Row
          title="Session"
          value={
            <div className="flex items-center gap-2">
              <StatusPill tone={auth?.guest ? 'neutral' : 'brand'}>{auth?.guest ? 'Guest' : 'Signed in'}</StatusPill>
              {auth?.identity.owner_mode ? <StatusPill tone="warning">Owner</StatusPill> : null}
            </div>
          }
          description="Leave sign out here so the main app stays focused on actual work."
          actions={
            !auth?.guest ? (
              <SoftButton onClick={signOut}>
                Log out
              </SoftButton>
            ) : null
          }
        />
      </Section>

      <Section label="Security" title="Privacy and local access">
        <Row
          title="Admin local access"
          value={<StatusPill tone={isOwnerMode ? 'success' : 'neutral'}>{isOwnerMode ? 'Unlocked' : 'Locked'}</StatusPill>}
          description={
            isOwnerMode
              ? 'This account can see local checkpoints inside Compose for moderation and safety testing.'
              : 'Local checkpoints stay hidden unless the account is explicitly approved as an admin.'
          }
        />
        <Row
          title="Role management"
          description="New admin access will be granted through a secure owner-only role flow instead of a local bypass key."
        />
      </Section>

      <Section label="App" title="General Studio behavior">
        <Row
          title="Tips"
          value={<StatusPill tone={prefs.tipsEnabled ? 'brand' : 'neutral'}>{prefs.tipsEnabled ? 'On' : 'Off'}</StatusPill>}
          description="Small hints in Explore, Compose, Chat, and Library."
          actions={<SoftButton onClick={() => setTipsEnabled(!prefs.tipsEnabled)}>{prefs.tipsEnabled ? 'Turn off' : 'Turn on'}</SoftButton>}
        />
        <Row
          title="Dismissed tips"
          description="Bring back any hints you closed earlier."
          actions={<SoftButton onClick={resetTips}>Reset tips</SoftButton>}
        />
        <Row
          title="Subscription"
          description="Review plan details, free vs pro differences, and top-up options."
          actions={
            <Link to="/subscription" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white transition hover:bg-white/[0.08]">
              Open subscription
            </Link>
          }
        />
        <Row
          title="Model access"
          description={
            canLoadPrivate && settingsQuery.data?.models?.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {settingsQuery.data.models.map((model) => (
                  <span key={model.id} className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300">
                    {model.label} / {model.runtime === 'local' ? 'Local runtime' : `${model.credit_cost} credits`}
                  </span>
                ))}
              </div>
            ) : (
              'Available managed models show up here after sign in.'
            )
          }
        />
      </Section>

      <Section label="Notifications" title="Updates and contact preferences">
        <Row
          title="Email updates"
          value={<StatusPill tone="neutral">Soon</StatusPill>}
          description="Product update and release controls will live here once notification preferences are wired end to end."
        />
        <Row
          title="What’s new"
          value={<StatusPill tone="neutral">Planned</StatusPill>}
          description="Small release popups and update notes will arrive here instead of cluttering the main app."
        />
      </Section>

      <Section label="Providers" title="Managed service health">
        {providerHealth.length ? (
          providerHealth.map((provider) => (
            <Row
              key={provider.name}
              title={provider.name}
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
              description={provider.detail ?? 'No details available.'}
            />
          ))
        ) : (
          <Row title="Providers" value="Loading" description="Provider health is still loading." />
        )}
      </Section>

      <Section label="Documentation" title="Help, legal, and policies">
        <Row
          title="Help"
          description="Open getting started guidance, safety notes, FAQ, and policy pages."
          actions={
            <Link to="/help" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white transition hover:bg-white/[0.08]">
              Open Help
            </Link>
          }
        />
        {docsLinks.map((item) => (
          <Row
            key={item.id}
            title={item.label}
            description={`Open ${item.label.toLowerCase()} content.`}
            actions={
              <Link to={`/help#${item.id}`} className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white transition hover:bg-white/[0.08]">
                Open
              </Link>
            }
          />
        ))}
      </Section>
    </AppPage>
  )
}
