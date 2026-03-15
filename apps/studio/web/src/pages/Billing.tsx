import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EmptyState, MetricCard, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type CheckoutKind } from '@/lib/studioApi'

export default function BillingPage() {
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isLoading, signInDemo } = useStudioAuth()
  const billingQuery = useQuery({
    queryKey: ['billing'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: isAuthenticated,
  })

  const checkoutMutation = useMutation({
    mutationFn: (kind: CheckoutKind) => studioApi.checkout(kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
    },
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading billing...</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <PageIntro
          eyebrow="Billing"
          title="Pricing is visible to guests. Usage is not."
          description="This is where Free, Pro, and top-up credits converge into one margin-aware monetization path."
        />
        <EmptyState
          title="Enter as a creator to simulate quota and upgrades."
          description="The current checkout flow runs in demo mode so Studio can validate plans, credit math, and upgrade UX before a real Paddle adapter is wired."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia Creator')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue as Free Creator
            </button>
          }
        />
      </div>
    )
  }

  const billing = billingQuery.data

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Billing"
        title="Subscription and top-up credits are part of the Studio core, not an afterthought."
        description="The backend now owns the plan state, remaining quota, and checkout intent so cost control lives where generation actually happens."
      />

      {billing ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Current plan" value={billing.plan.label} detail={`Subscription status: ${billing.subscription_status}`} />
            <MetricCard label="Credits left" value={String(billing.credits.remaining)} detail={`Monthly allowance ${billing.credits.monthly_allowance}, extra credits ${billing.credits.extra_credits}.`} />
            <MetricCard label="Share links" value={billing.plan.share_links ? 'Enabled' : 'Locked'} detail="Pro enables project and asset share links so Studio can stay private-first but still deliver externally." />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <Panel>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Checkout options</div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {billing.checkout_options.map((option) => (
                  <div key={option.kind} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-white">{option.label}</div>
                      {option.plan ? <StatusPill tone="brand">{option.plan}</StatusPill> : null}
                    </div>
                    <div className="mt-3 text-3xl font-semibold text-white">${option.price_usd}</div>
                    <div className="mt-2 text-sm text-zinc-400">{option.credits} credits delivered</div>
                    <button
                      onClick={() => checkoutMutation.mutate(option.kind)}
                      className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                    >
                      {checkoutMutation.isPending ? 'Processing...' : 'Activate in demo mode'}
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Recent credit activity</div>
              <div className="mt-5 space-y-3">
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
            </Panel>
          </div>
        </>
      ) : null}
    </div>
  )
}
