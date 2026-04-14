import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, CreditCard, ExternalLink, Loader2, ShieldCheck, Sparkles, TrendingUp, Zap } from 'lucide-react'

import {
  describeGenerationLaneTrust,
  formatGenerationGuideSummary,
  studioApi,
  type BillingSummary,
  type CheckoutKind,
  type PublicPlansPayload,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'

function formatBillingStatusLabel(summary: BillingSummary) {
  if (summary.account_tier === 'free') return 'Free account'
  if (!summary.subscription_status || summary.subscription_status === 'none') return 'No active subscription'
  return summary.subscription_status.replace(/_/g, ' ')
}

function formatBillingActivityDescription(description: string) {
  const trimmed = description.trim()
  if (/^free account welcome credits$/i.test(trimmed)) return 'Free account welcome credits'
  if (/^free account monthly refresh$/i.test(trimmed)) return 'Free account monthly refresh'
  if (/^creator activation$/i.test(trimmed)) return 'Creator activation'
  if (/^creator renewal$/i.test(trimmed)) return 'Creator renewal'
  if (/^pro activation$/i.test(trimmed)) return 'Pro activation'
  if (/^pro renewal$/i.test(trimmed)) return 'Pro renewal'
  return trimmed
}

function formatPlanPrice(priceUsd: number | null, billingPeriod: 'month' | null) {
  if (priceUsd == null) return { price: 'Catalog', period: null as string | null }
  if (priceUsd === 0) return { price: '$0', period: null as string | null }
  return { price: `$${priceUsd}`, period: billingPeriod ? `/${billingPeriod}` : null }
}

function formatCreditPackLeadPrice(options: PublicPlansPayload['credit_packs']) {
  if (!options.length) return 'Catalog'
  return `$${Math.min(...options.map((entry) => entry.price_usd))}`
}

export default function BillingPage() {
  const { auth, isAuthenticated } = useStudioAuth()
  const isRoot = auth?.identity?.root_admin || auth?.identity?.owner_mode
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [publicPlans, setPublicPlans] = useState<PublicPlansPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  usePageMeta(
    'Plans & Billing',
    'Review Studio plans, credits, and checkout availability.',
  )

  useEffect(() => {
    studioApi.getPublicPlans().then(setPublicPlans).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    setLoading(true)
    studioApi.getBillingSummary()
      .then(setBilling)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const isUnlimitedAccess = Boolean(billing?.credits.unlimited || isRoot)
  const availableCheckoutKinds = new Set<CheckoutKind>((billing?.checkout_options ?? []).map((option) => option.kind))
  const currentCommercialPlan = useMemo(
    () =>
      publicPlans && billing
        ? [publicPlans.free_account, ...publicPlans.subscriptions].find((plan) => plan.entitlement_plan === billing.plan.id) ?? null
        : null,
    [billing, publicPlans],
  )
  const generationLaneHighlights = billing?.generation_credit_guide?.lane_highlights ?? []
  const entitlementFacts = useMemo(() => {
    if (!billing) return []
    return [
      billing.entitlements.can_access_chat ? 'Create + Chat unlocked' : 'Chat locked',
      billing.entitlements.premium_chat ? 'Premium chat active' : 'Standard chat lane',
      billing.entitlements.can_share_links ? 'Share links enabled' : 'Share links locked',
      billing.entitlements.can_clean_export ? 'Clean exports enabled' : 'Clean export locked',
    ]
  }, [billing])

  const handleCheckout = async (kind: CheckoutKind) => {
    setCheckoutLoading(kind)
    try {
      const result = await studioApi.checkout(kind)
      if (typeof result.checkout_url === 'string' && result.checkout_url) {
        window.location.assign(result.checkout_url)
      }
    } catch (err) {
      console.error('Checkout failed:', err)
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-12 md:px-6">
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider backdrop-blur-md">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Plans & billing</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
          Plans and credits
        </h1>
        <p className="text-zinc-400 max-w-3xl text-lg">
          Review your current plan, available credits, and the checkout options enabled in this environment.
        </p>
      </section>

      {isRoot && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 text-zinc-300">
          <ShieldCheck className="h-5 w-5 text-zinc-200" />
          <p className="font-semibold text-sm">
            Owner access mirrors public billing logic without charging this account like a customer account.
          </p>
        </div>
      )}

      {billing && !loading ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {isUnlimitedAccess ? 'Access state' : 'Credits available'}
            </div>
            <div className="text-3xl font-bold text-white">
              {isUnlimitedAccess ? 'Owner access' : billing.credits.available_to_spend.toLocaleString()}
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              {isUnlimitedAccess
                ? 'Metered credit warnings stay hidden on this account.'
                : `${billing.credits.reserved_total} credits currently held across live runs.`}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {isUnlimitedAccess ? 'Shell plan mirror' : 'Current plan'}
            </div>
            <div className="text-3xl font-bold text-white">{currentCommercialPlan?.label ?? billing.plan.label}</div>
            <div className="mt-1 text-sm text-zinc-400 capitalize">
              {isUnlimitedAccess ? 'Owner account' : formatBillingStatusLabel(billing)}
            </div>
            {!isUnlimitedAccess ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {entitlementFacts.slice(0, 2).map((fact) => (
                  <span key={fact} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300">
                    {fact}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {isUnlimitedAccess ? 'Metering mode' : 'Monthly allowance'}
            </div>
            <div className="text-3xl font-bold text-white">
              {isUnlimitedAccess ? 'Mirror mode' : billing.credits.monthly_allowance.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              {isUnlimitedAccess
                ? 'Public billing math is mirrored here without charging your owner account.'
                : `${billing.credits.extra_credits} extra credits available`}
            </div>
          </div>
        </section>
      ) : null}

      {publicPlans ? (
        <section className="grid gap-8 md:grid-cols-2 pt-4">
          {[publicPlans.free_account, ...publicPlans.subscriptions].map((plan) => {
            const isCurrentPlan = billing?.plan.id === plan.entitlement_plan
            const checkoutEnabled = Boolean(plan.checkout_kind && availableCheckoutKinds.has(plan.checkout_kind))
            const isCheckoutPending = Boolean(plan.checkout_kind) && checkoutLoading === plan.checkout_kind
            const price = formatPlanPrice(plan.price_usd, plan.billing_period)
            const ctaLabel = isCurrentPlan
              ? 'Included'
              : plan.checkout_kind && !checkoutEnabled
                ? 'Checkout not enabled here'
                : plan.checkout_kind
                  ? 'Continue to checkout'
                  : 'Create account'

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-[32px] p-8 transition-all duration-300 ${
                  plan.recommended
                    ? 'bg-[#121318] border border-[rgb(var(--primary))]/50 shadow-[0_15px_60px_rgb(var(--primary)/0.15)]'
                    : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]'
                }`}
              >
                {plan.recommended ? (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] px-4 py-1 text-xs font-bold text-white shadow-lg">
                    Recommended
                  </div>
                ) : null}

                <h3 className="text-xl font-bold text-white mb-2">{plan.label}</h3>
                <p className="text-sm text-zinc-400 mb-6 min-h-[40px]">{plan.summary}</p>

                <div className="mb-3 flex items-baseline gap-1 text-white">
                  <span className="text-5xl font-extrabold tracking-tight">{price.price}</span>
                  {price.period ? <span className="text-lg font-medium text-zinc-500">{price.period}</span> : null}
                </div>
                <div className="mb-6 text-sm text-zinc-500">
                  {plan.monthly_credits.toLocaleString()} monthly credits - up to {plan.max_resolution}
                </div>

                {plan.checkout_kind ? (
                  <button
                    onClick={() => {
                      if (plan.checkout_kind && checkoutEnabled) {
                        void handleCheckout(plan.checkout_kind)
                      }
                    }}
                    disabled={isCurrentPlan || !checkoutEnabled || isCheckoutPending}
                    className={`w-full rounded-full py-3.5 px-6 font-semibold transition-all flex items-center justify-center gap-2 ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-white shadow-[0_0_20px_rgb(var(--primary)/0.4)] hover:shadow-[0_0_30px_rgb(var(--primary)/0.6)] hover:scale-[1.02] disabled:opacity-60'
                        : 'bg-white/[0.05] text-white hover:bg-white/[0.1] disabled:opacity-40'
                    }`}
                  >
                    {isCheckoutPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : !isCurrentPlan && checkoutEnabled ? (
                      <>
                        <ExternalLink className="h-4 w-4" /> {ctaLabel}
                      </>
                    ) : (
                      ctaLabel
                    )}
                  </button>
                ) : (
                  <Link
                    to="/signup"
                    className="w-full rounded-full py-3.5 px-6 font-semibold transition-all flex items-center justify-center gap-2 bg-white/[0.05] text-white hover:bg-white/[0.1]"
                  >
                    <Sparkles className="h-4 w-4" /> {ctaLabel}
                  </Link>
                )}

                <div className="mt-8 space-y-4 flex-1">
                  {plan.feature_summary.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className={`h-5 w-5 shrink-0 ${plan.recommended ? 'text-[rgb(var(--accent))]' : 'text-zinc-500'}`} />
                      <span className="text-sm font-medium text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {publicPlans ? (
        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Flexible usage</div>
              <h2 className="mt-2 text-2xl font-bold text-white">Credit packs</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Free accounts and subscribers can both buy wallet credits. Studio spends included monthly allowance first, then wallet balance.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-500">Starts at</div>
              <div className="text-4xl font-extrabold tracking-tight text-white">{formatCreditPackLeadPrice(publicPlans.credit_packs)}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {[
              'Free accounts can buy wallet credits',
              'Image generation requires included allowance or wallet balance',
              'Monthly allowance spends before wallet credits',
            ].map((feature) => (
              <span key={feature} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                {feature}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {publicPlans.credit_packs.map((option) => {
              const checkoutEnabled = availableCheckoutKinds.has(option.kind)
              const isCheckoutPending = checkoutLoading === option.kind
              return (
                <div key={option.kind} className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{option.label}</div>
                      <div className="mt-1 text-sm text-zinc-400">{option.credits} extra credits</div>
                    </div>
                    <div className="text-2xl font-bold text-white">${option.price_usd}</div>
                  </div>
                  <button
                    onClick={() => checkoutEnabled && handleCheckout(option.kind)}
                    disabled={!isAuthenticated || !checkoutEnabled || isCheckoutPending}
                    className="mt-5 w-full rounded-full bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:opacity-40"
                  >
                    {isCheckoutPending ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : !isAuthenticated ? (
                      'Sign in to buy credits'
                    ) : checkoutEnabled ? (
                      'Buy credits'
                    ) : (
                      'Checkout not enabled here'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {billing && generationLaneHighlights.length ? (
        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <Zap className="h-3.5 w-3.5" />
            <span>Generation cost guide</span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-white">Create and Chat follow the same credit rules</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            These holds, settlement ranges, and lane estimates come from the backend and are used before image runs start.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {generationLaneHighlights.slice(0, 3).map((entry) => (
              <div key={entry.model_id} className="rounded-2xl border border-white/[0.06] bg-black/20 p-5">
                <div className="text-sm font-semibold text-white">{entry.label}</div>
                <div className="mt-2 text-xs leading-6 text-zinc-400">{formatGenerationGuideSummary(entry)}</div>
                <div className="mt-3 text-xs text-zinc-500">
                  {describeGenerationLaneTrust(entry.pricing_lane, entry.planned_provider)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {billing && billing.recent_activity.length > 0 && !isUnlimitedAccess ? (
        <section className="pt-2">
          <h2 className="text-xl font-bold text-white mb-4">Credit activity</h2>
          <div className="space-y-2">
            {billing.recent_activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-zinc-200">{formatBillingActivityDescription(entry.description)}</span>
                  <span className="ml-3 text-xs text-zinc-500">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-sm font-bold ${entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount} credits
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  )
}
