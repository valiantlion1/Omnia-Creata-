import { useQuery } from '@tanstack/react-query'

import { PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

export default function SettingsPage() {
  const { auth, isAuthenticated, isLoading, signOut } = useStudioAuth()
  const settingsQuery = useQuery({
    queryKey: ['settings-bootstrap'],
    queryFn: () => studioApi.getSettingsBootstrap(),
    enabled: isAuthenticated,
  })
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => studioApi.getHealth(),
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading settings...</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Settings"
        title="Operational truth lives here while the product is still being stabilized."
        description="This page surfaces the active identity, available plans, model access, and current provider health so we can iterate on Studio with fewer hidden assumptions."
        actions={
          !auth?.guest ? (
            <button onClick={signOut} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
              Sign out
            </button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Identity</div>
          <div className="mt-4 space-y-3 rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="text-lg font-semibold text-white">{auth?.identity.display_name ?? 'Guest'}</div>
            <div className="text-sm text-zinc-400">{auth?.identity.email || 'Guest browse mode'}</div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="brand">{auth?.plan.label ?? 'Guest'}</StatusPill>
              <StatusPill tone="neutral">{auth?.credits.remaining ?? 0} credits</StatusPill>
            </div>
          </div>

          {settingsQuery.data ? (
            <div className="mt-6 space-y-3">
              {settingsQuery.data.plans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">{plan.label}</div>
                    <StatusPill tone="neutral">{plan.monthly_credits} monthly credits</StatusPill>
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">{plan.queue_priority} queue, max resolution {plan.max_resolution}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Model access</div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(settingsQuery.data?.models ?? []).map((model) => (
                <div key={model.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{model.label}</div>
                    <StatusPill tone={model.min_plan === 'pro' ? 'warning' : 'brand'}>{model.min_plan}</StatusPill>
                  </div>
                  <div className="mt-2 text-sm text-zinc-400">{model.description}</div>
                  <div className="mt-3 text-sm text-zinc-500">
                    {model.credit_cost} credits, up to {model.max_width}x{model.max_height}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Provider health</div>
            <div className="mt-5 space-y-3">
              {Array.isArray((healthQuery.data as { providers?: Array<{ name: string; status: string; detail?: string }> } | undefined)?.providers) ? (
                ((healthQuery.data as { providers: Array<{ name: string; status: string; detail?: string }> }).providers).map((provider) => (
                  <div key={provider.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{provider.name}</div>
                      <StatusPill
                        tone={
                          provider.status === 'healthy'
                            ? 'success'
                            : provider.status === 'not_configured'
                              ? 'warning'
                              : provider.status === 'disabled'
                                ? 'neutral'
                                : 'danger'
                        }
                      >
                        {provider.status}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-sm text-zinc-400">{provider.detail ?? 'No details available.'}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-zinc-500">Provider health is still loading.</div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
