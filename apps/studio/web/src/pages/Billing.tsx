import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppPage, LegalFooter, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type CheckoutKind } from '@/lib/studioApi'

const defaultPlans = {
  featured_plan: 'pro' as const,
  plans: [
    {
      id: 'free' as const,
      label: 'Free',
      monthly_credits: 60,
      queue_priority: 'standard',
      max_resolution: '1024 x 1024',
      share_links: false,
      can_generate: true,
    },
    {
      id: 'pro' as const,
      label: 'Pro',
      monthly_credits: 1200,
      queue_priority: 'priority',
      max_resolution: '2048 x 2048',
      share_links: true,
      can_generate: true,
    },
  ],
  top_ups: [
    { kind: 'top_up_small' as const, label: 'Top up 250', credits: 250, price_usd: 9, plan: null },
    { kind: 'top_up_large' as const, label: 'Top up 1200', credits: 1200, price_usd: 29, plan: null },
  ],
}

function planBullets(planId: string) {
  if (planId === 'pro') {
    return ['1200 monthly credits', 'Priority queue', 'Higher output ceiling', 'Share links enabled']
  }
  return ['60 monthly credits', 'Core generation access', 'Prompt improvement', 'Upgrade only when needed']
}

export default function BillingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const welcomeMode = new URLSearchParams(location.search).get('welcome') === '1'

  const publicPlansQuery = useQuery({
    queryKey: ['public-plans', 'subscription'],
    queryFn: () => studioApi.getPublicPlans(),
  })

  const billingQuery = useQuery({
    queryKey: ['billing-summary', 'subscription'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: canLoadPrivate,
  })

  const checkoutMutation = useMutation({
    mutationFn: (kind: CheckoutKind) => studioApi.checkout(kind),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      navigate('/studio', { replace: true })
    },
  })

  const plans = useMemo(() => publicPlansQuery.data?.plans ?? defaultPlans.plans, [publicPlansQuery.data])
  const topUps = useMemo(() => publicPlansQuery.data?.top_ups ?? defaultPlans.top_ups, [publicPlansQuery.data])
  const currentPlanId = auth?.plan.id ?? 'guest'

  return (
    <AppPage className="max-w-[1180px] gap-10 py-6">
      <section className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Subscription</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
            {welcomeMode ? 'Choose how you want to start.' : 'Pick the plan that matches the work.'}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
            Free gets you inside the product. Pro gives you more credits, faster access, and more room to work. Top-ups are there when you only need more generation power.
          </p>
          {canLoadPrivate && billingQuery.data ? (
            <div className="mt-6 space-y-2 text-sm text-zinc-300">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2">
                <span>Current plan</span>
                <span className="font-medium text-white">{billingQuery.data.plan.label}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-2">
                <span>Credits remaining</span>
                <span className="font-medium text-white">{billingQuery.data.credits.remaining}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <span>Monthly allowance</span>
                <span className="font-medium text-white">{billingQuery.data.credits.monthly_allowance}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id
            const isPro = plan.id === 'pro'
            return (
              <div key={plan.id} className="border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl font-semibold text-white">{plan.label}</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {plan.id === 'pro' ? '$24 / month' : '$0'} - {plan.monthly_credits} monthly credits
                    </div>
                  </div>
                  {isCurrent ? <StatusPill tone="brand">Current</StatusPill> : null}
                </div>

                <div className="mt-5 space-y-2.5 text-sm text-zinc-300">
                  {planBullets(plan.id).map((line) => (
                    <div key={line} className="flex items-start gap-3 leading-6">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/70" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {isPro ? (
                    canLoadPrivate ? (
                      <button
                        onClick={() => checkoutMutation.mutate('pro_monthly')}
                        disabled={checkoutMutation.isPending}
                        className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {checkoutMutation.isPending ? 'Opening checkout...' : 'Upgrade to Pro'}
                      </button>
                    ) : (
                      <Link to="/signup" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                        Start with Pro
                      </Link>
                    )
                  ) : (
                    <button
                      onClick={() => navigate('/studio')}
                      className="rounded-full bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                    >
                      Continue with Free
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          <div className="border-t border-white/[0.06] pt-5 lg:col-span-2">
            <div className="text-lg font-semibold text-white">Top-ups</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {topUps.map((option) => (
                <div key={option.kind} className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                  <div>
                    <div className="text-sm font-medium text-white">{option.label}</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      {option.credits} credits - ${option.price_usd}
                    </div>
                  </div>
                  {canLoadPrivate ? (
                    <button
                      onClick={() => checkoutMutation.mutate(option.kind)}
                      disabled={checkoutMutation.isPending}
                      className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Buy
                    </button>
                  ) : (
                    <Link to="/signup" className="rounded-full bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]">
                      Sign up
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <LegalFooter className="pt-8" />
    </AppPage>
  )
}
