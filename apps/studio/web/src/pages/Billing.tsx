import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Sparkles, Zap, Crown } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import {
  describeGenerationLaneTrust,
  formatGenerationGuideSummary,
  formatGenerationPricingLane,
  formatGenerationStartCapacity,
  studioApi,
  type CheckoutKind,
} from '@/lib/studioApi'

/* ─── tier data ─── */
const tiers = [
  {
    id: 'free' as const,
    label: 'Free',
    icon: Sparkles,
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 60,
    badge: null,
    features: [
      '60 monthly credits',
      'Core generation models',
      'Prompt improvement',
      '1024 × 1024 max resolution',
      'Standard queue',
      'Library & collections',
      'Public profile',
    ],
    cta: 'Get Started',
    ctaStyle: 'outline' as const,
  },
  {
    id: 'pro' as const,
    label: 'Pro',
    icon: Zap,
    monthlyPrice: 18,
    annualPrice: 12,
    credits: 1200,
    badge: 'Most Popular',
    features: [
      '1,200 monthly credits',
      'All generation models',
      'Priority queue',
      '2048 × 2048 max resolution',
      'Share links enabled',
      'Prompt history & analytics',
      'Extended library storage',
      'Commercial usage license',
    ],
    cta: 'Upgrade to Pro',
    ctaStyle: 'gradient' as const,
  },
  {
    id: 'creator' as const,
    label: 'Creator',
    icon: Crown,
    monthlyPrice: 35,
    annualPrice: 28,
    credits: 5000,
    badge: null,
    features: [
      '5,000 monthly credits',
      'All models + early access',
      'Priority+ queue (fastest)',
      '4096 × 4096 max resolution',
      'API access (coming soon)',
      'Dedicated support',
      'Team workspace (coming soon)',
      'Unlimited library storage',
      'Full commercial rights',
    ],
    cta: 'Go Creator',
    ctaStyle: 'white' as const,
  },
]

const topUpOptions = [
  { kind: 'top_up_small' as CheckoutKind, label: 'Top-up 200', credits: 200, price: 8 },
  { kind: 'top_up_large' as CheckoutKind, label: 'Top-up 800', credits: 800, price: 24 },
]

/* ─── comparison features ─── */
const comparisonRows = [
  { label: 'Monthly credits', free: '60', pro: '1,200', creator: '5,000' },
  { label: 'Max resolution', free: '1024px', pro: '1536px', creator: '4096px' },
  { label: 'Queue priority', free: 'Standard', pro: 'Priority', creator: 'Priority+' },
  { label: 'Models', free: 'Core', pro: 'All', creator: 'All + Early Access' },
  { label: 'Share links', free: '—', pro: '✓', creator: '✓' },
  { label: 'Commercial license', free: '—', pro: '✓', creator: '✓' },
  { label: 'API access', free: '—', pro: '—', creator: 'Coming soon' },
  { label: 'Dedicated support', free: '—', pro: '—', creator: '✓' },
]

function formatPrice(price: number | null): string {
  if (price === null) return 'Coming soon'
  if (price === 0) return '$0'
  return `$${price}`
}

export default function BillingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const welcomeMode = new URLSearchParams(location.search).get('welcome') === '1'
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  const billingQuery = useQuery({
    queryKey: ['billing-summary', 'subscription'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: canLoadPrivate,
  })

  const checkoutMutation = useMutation({
    mutationFn: (kind: CheckoutKind) => studioApi.checkout(kind),
    onSuccess: async (data: any) => {
      await queryClient.invalidateQueries()
      
      // Navigate to external checkout layout if provided
      if (data && data.checkout_url) {
        window.location.href = data.checkout_url
        return
      }

      navigate('/studio', { replace: true })
    },
  })

  const currentPlanId = auth?.plan.id ?? 'guest'

  return (
    <AppPage className="max-w-[1280px] gap-8 py-6">
      {/* ── Header ── */}
      <section className="text-center">
        <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Pricing</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] md:text-5xl" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {welcomeMode ? 'Welcome — choose your starting point.' : canLoadPrivate ? 'Pick the plan that matches the work.' : 'Simple, transparent pricing.'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">
          Start free, upgrade when you need more power. All plans include full access to Library, Collections, and your public profile.
        </p>

        {/* ── Monthly/Annual toggle ── */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-white/[0.08]">
          <button
            onClick={() => setBilling('monthly')}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${billing === 'monthly' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            style={billing === 'monthly' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${billing === 'annual' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'}`}
            style={billing === 'annual' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
          >
            Annual <span className="ml-1 text-[10px] font-semibold text-emerald-400">Save 20%</span>
          </button>
        </div>

        {canLoadPrivate && billingQuery.data ? (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-6 text-sm text-zinc-400">
            <span>Current: <span className="font-medium text-white">{billingQuery.data.plan.label}</span></span>
            <span className="h-3 w-px bg-white/10" />
            <span>Credits: <span className="font-medium text-white">{billingQuery.data.credits.remaining}</span></span>
          </div>
        ) : null}
      </section>

      {/* ── Tier Cards ── */}
      {canLoadPrivate && billingQuery.data?.generation_credit_guide?.lane_highlights?.length ? (
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Credit guardrails</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Current generation coverage</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                This follows today&apos;s live routing truth. It shows which lane Studio would plan right now, how many credits it would hold up front, and how many starts your current balance can safely cover.
              </p>
            </div>
            <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-zinc-400">
              <div>Available now: <span className="font-medium text-white">{billingQuery.data.generation_credit_guide.available_to_spend}</span> credits</div>
              <div className="mt-1">Already held: <span className="font-medium text-white">{billingQuery.data.generation_credit_guide.reserved_total}</span> credits</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {billingQuery.data.generation_credit_guide.lane_highlights.map((entry) => (
              <div key={`${entry.pricing_lane}-${entry.model_id}`} className="rounded-[24px] border border-white/[0.08] bg-black/20 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{formatGenerationPricingLane(entry.pricing_lane)}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{entry.label}</div>
                  </div>
                  <StatusPill tone={entry.affordable_now ? 'success' : 'warning'}>
                    {formatGenerationStartCapacity(entry.max_startable_jobs_now, entry.start_status)}
                  </StatusPill>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-zinc-500">Quoted</div>
                    <div className="mt-1 font-medium text-white">{entry.quoted_credit_cost} credits</div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-zinc-500">Held up front</div>
                    <div className="mt-1 font-medium text-white">{entry.reserved_credit_cost} credits</div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-zinc-500">Settle target</div>
                    <div className="mt-1 font-medium text-white">{entry.settlement_credit_cost} credits</div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-zinc-500">Planned provider</div>
                    <div className="mt-1 font-medium text-white">{entry.planned_provider ?? 'unplanned'}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-zinc-500">{formatGenerationGuideSummary(entry)}</div>
                <div className="mt-1 text-[11px] leading-5 text-zinc-600">
                  {describeGenerationLaneTrust(entry.pricing_lane, entry.planned_provider)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = currentPlanId === tier.id
          const price = billing === 'annual' ? tier.annualPrice : tier.monthlyPrice
          const isPro = tier.id === 'pro'
          const isCreator = tier.id === 'creator'
          const ctaLabel = tier.cta

          return (
            <div
              key={tier.id}
              className={`relative overflow-hidden rounded-[28px] border p-6 transition-all duration-300 ${
                isPro
                  ? 'border-[rgba(124,58,237,0.18)] shadow-[0_0_40px_rgba(124,58,237,0.18)]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-[rgba(124,58,237,0.18)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.25)]'
              }`}
              style={isPro ? { background: `linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.18) 40%, rgba(124,58,237,0.18) 100%)` } : undefined}
            >
              {tier.badge ? (
                <div className="absolute right-4 top-4">
                  <StatusPill tone="brand">{tier.badge}</StatusPill>
                </div>
              ) : null}

              <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${isPro ? '' : 'bg-white/[0.05]'}`} style={isPro ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.18))' } : undefined}>
                <tier.icon className={`h-5 w-5 ${isPro ? '' : 'text-white'}`} style={isPro ? { color: 'rgb(var(--primary-light))' } : undefined} />
              </div>

              <div className="mt-4">
                <div className="text-xl font-semibold text-white">{tier.label}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-3xl font-bold ${isPro ? '' : 'text-white'}`} style={isPro ? { color: 'rgb(var(--primary-light))' } : undefined}>
                    {formatPrice(price)}
                  </span>
                  {price !== null && price > 0 ? (
                    <span className="text-sm text-zinc-500">/ {billing === 'annual' ? 'year' : 'month'}</span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-zinc-500">{tier.credits.toLocaleString()} credits / month</div>
              </div>

              <ul className="mt-6 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${isPro ? '' : 'text-zinc-600'}`} style={isPro ? { color: 'rgb(var(--primary-light))' } : undefined} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isCurrent ? (
                  <div className="flex items-center justify-center rounded-full border border-white/[0.08] px-5 py-3 text-sm font-medium text-zinc-400">
                    Current plan
                  </div>
                ) : tier.ctaStyle === 'gradient' ? (
                  canLoadPrivate ? (
                    <button
                      onClick={() => checkoutMutation.mutate('pro_monthly')}
                      disabled={checkoutMutation.isPending}
                      className="w-full rounded-full px-5 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', boxShadow: '0 0 20px rgba(124,58,237,0.18)' }}
                    >
                      {checkoutMutation.isPending ? 'Processing...' : ctaLabel}
                    </button>
                  ) : (
                    <Link to="/signup" className="block w-full rounded-full px-5 py-3 text-center text-sm font-semibold text-white transition-all hover:brightness-110" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', boxShadow: '0 0 20px rgba(124,58,237,0.18)' }}>
                      {ctaLabel}
                    </Link>
                  )
                ) : tier.ctaStyle === 'white' ? (
                  isCreator ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-full bg-white/[0.08] px-5 py-3 text-sm font-semibold text-zinc-500"
                    >
                      Coming soon
                    </button>
                  ) : canLoadPrivate ? (
                    <button
                      onClick={() => checkoutMutation.mutate('pro_monthly')}
                      disabled={checkoutMutation.isPending}
                      className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                    >
                      {checkoutMutation.isPending ? 'Processing...' : ctaLabel}
                    </button>
                  ) : (
                    <Link to="/signup" className="block w-full rounded-full bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:opacity-90">
                      {ctaLabel}
                    </Link>
                  )
                ) : (
                  <Link
                  to={canLoadPrivate ? '/create' : '/signup'}
                  className="block w-full rounded-full border border-white/[0.12] px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-white/[0.06]"
                >
                  {ctaLabel}
                </Link>
              )}
              </div>
            </div>
          )
        })}
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] transition-all duration-300 hover:border-[rgba(124,58,237,0.18)]">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="text-lg font-semibold text-white">Feature comparison</div>
          <div className="mt-1 text-sm text-zinc-500">Everything included in each plan at a glance.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-6 py-3 font-medium text-zinc-400">Feature</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Free</th>
                <th className="px-6 py-3 font-medium" style={{ color: 'rgb(var(--primary-light))' }}>Pro</th>
                <th className="px-6 py-3 font-medium text-zinc-400">Creator</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label} className="border-b border-white/[0.04] last:border-b-0">
                  <td className="px-6 py-3 text-zinc-300">{row.label}</td>
                  <td className="px-6 py-3 text-zinc-500">{row.free}</td>
                  <td className="px-6 py-3 text-white">{row.pro}</td>
                  <td className="px-6 py-3 text-zinc-300">{row.creator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Top-ups ── */}
      <section className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="text-lg font-semibold text-white">Credit top-ups</div>
        <div className="mt-1 text-sm text-zinc-500">Need more credits mid-cycle? Grab a one-time boost.</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {topUpOptions.map((option) => (
            <div key={option.kind} className="flex items-center justify-between gap-4 rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-[rgba(124,58,237,0.18)]">
              <div>
                <div className="text-sm font-medium text-white">{option.label}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {option.credits} credits · {option.price !== null ? `$${option.price}` : 'TBD'}
                </div>
              </div>
              {canLoadPrivate ? (
                <button
                  onClick={() => checkoutMutation.mutate(option.kind)}
                  disabled={checkoutMutation.isPending}
                  className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.1] disabled:opacity-60"
                >
                  Buy
                </button>
              ) : (
                <Link to="/signup" className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.1]">
                  Sign up
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── TBD Notice ── */}
      <div className="text-center text-xs text-zinc-600">
        Pricing is subject to change during the alpha period. Final pricing will be announced before general availability.
      </div>
    </AppPage>
  )
}
