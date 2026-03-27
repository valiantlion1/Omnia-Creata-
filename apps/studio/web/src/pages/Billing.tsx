import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppPage, EmptyState, StatusPill, Surface } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type CheckoutKind } from '@/lib/studioApi'

export default function BillingPage() {
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading, signInDemo } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const billingQuery = useQuery({
    queryKey: ['billing'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: canLoadPrivate,
  })

  const checkoutMutation = useMutation({
    mutationFn: (kind: CheckoutKind) => studioApi.checkout(kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading subscription...</div>
  }

  if (auth?.guest) {
    return (
      <AppPage>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Subscription</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Sign in to manage access</h1>
        </div>
        <EmptyState
          title="Sign in to see credits and upgrades."
          description="Subscription becomes personal after you enter Studio."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia User')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue with free access
            </button>
          }
        />
      </AppPage>
    )
  }

  const billing = billingQuery.data

  return (
    <AppPage>
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Subscription</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Plan and credits</h1>
      </div>

      {billing ? (
        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Surface tone="muted" className="space-y-1">
            {[
              ['Plan', billing.plan.label],
              ['Status', billing.subscription_status],
              ['Credits', String(billing.credits.remaining)],
              ['Monthly allowance', String(billing.credits.monthly_allowance)],
              ['Extra credits', String(billing.credits.extra_credits)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl px-1 py-2">
                <div className="text-sm text-zinc-400">{label}</div>
                <div className="text-sm font-medium text-white">{value}</div>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 rounded-2xl px-1 py-2">
              <div className="text-sm text-zinc-400">Share links</div>
              <StatusPill tone={billing.plan.share_links ? 'success' : 'neutral'}>
                {billing.plan.share_links ? 'Enabled' : 'Locked'}
              </StatusPill>
            </div>
          </Surface>

          <div className="space-y-4">
            <Surface tone="raised">
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Top up</div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {billing.checkout_options.map((option) => (
                  <div key={option.kind} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-base font-semibold text-white">{option.label}</div>
                      {option.plan ? <StatusPill tone="brand">{option.plan}</StatusPill> : null}
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">${option.price_usd}</div>
                    <div className="mt-1.5 text-sm text-zinc-400">{option.credits} credits</div>
                    <button
                      onClick={() => checkoutMutation.mutate(option.kind)}
                      className="mt-4 w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                    >
                      {checkoutMutation.isPending ? 'Processing...' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface tone="muted">
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Activity</div>
              <div className="mt-4 space-y-2.5">
                {billing.recent_activity.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{entry.description}</div>
                        <div className="mt-1 text-sm text-zinc-400">{new Date(entry.created_at).toLocaleString()}</div>
                      </div>
                      <StatusPill tone={entry.amount >= 0 ? 'success' : 'warning'}>
                        {entry.amount >= 0 ? `+${entry.amount}` : entry.amount} credits
                      </StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </div>
      ) : null}
    </AppPage>
  )
}
