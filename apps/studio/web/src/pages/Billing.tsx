import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2, CreditCard, ExternalLink, Loader2, Minus, ShieldCheck, Sparkles, Zap } from 'lucide-react'

import {
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
  const hasAnyCheckoutEnabled = availableCheckoutKinds.size > 0
  const currentCommercialPlan = useMemo(
    () =>
      publicPlans && billing
        ? [publicPlans.free_account, ...publicPlans.subscriptions].find(
            (plan) => plan.entitlement_plan === billing.plan.id || plan.entitlement_plan === billing.account_tier,
          ) ?? null
        : null,
    [billing, publicPlans],
  )
  const entitlementFacts = useMemo(() => {
    if (!billing) return []
    return [
      billing.entitlements.can_access_chat ? 'Create + Chat unlocked' : 'Chat locked',
      billing.entitlements.premium_chat ? 'Premium chat active' : 'Standard chat lane',
      billing.entitlements.can_share_links ? 'Share links enabled' : 'Share links locked',
      billing.entitlements.can_clean_export ? 'Clean exports enabled' : 'Clean export locked',
    ]
  }, [billing])
  const comparisonRows = useMemo(() => {
    if (!publicPlans || publicPlans.subscriptions.length < 2) return []
    const creator = publicPlans.subscriptions.find((plan) => plan.id === 'creator') ?? publicPlans.subscriptions[0]
    const pro = publicPlans.subscriptions.find((plan) => plan.id === 'pro') ?? publicPlans.subscriptions[1]
    const free = publicPlans.free_account
    const freeEntitlements = publicPlans.entitlements.free
    const creatorEntitlements = publicPlans.entitlements.creator
    const proEntitlements = publicPlans.entitlements.pro

    return [
      { feature: 'Studio chat', free: free.can_access_chat, creator: creator.can_access_chat, pro: pro.can_access_chat },
      {
        feature: 'Bundled monthly image credits',
        free: false,
        creator: `${creator.monthly_credits.toLocaleString()} / mo`,
        pro: `${pro.monthly_credits.toLocaleString()} / mo`,
      },
      { feature: 'Wallet credit packs', free: true, creator: true, pro: true },
      {
        feature: 'Concurrent generations',
        free: `${freeEntitlements.max_incomplete_generations} job`,
        creator: `${creatorEntitlements.max_incomplete_generations} jobs`,
        pro: `${proEntitlements.max_incomplete_generations} jobs`,
      },
      { feature: 'Max resolution', free: free.max_resolution, creator: creator.max_resolution, pro: pro.max_resolution },
      { feature: 'Share links', free: free.share_links, creator: creator.share_links, pro: pro.share_links },
      { feature: 'Clean exports', free: freeEntitlements.can_clean_export, creator: creatorEntitlements.can_clean_export, pro: proEntitlements.can_clean_export },
      { feature: 'Premium chat lanes', free: false, creator: false, pro: true },
    ]
  }, [publicPlans])

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
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-14 px-4 py-12 md:px-6">
      {/* ─── Hero ─── */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center gap-2 rounded-full border border-[rgb(var(--primary))]/30 bg-[rgb(var(--primary))]/[0.06] px-3.5 py-1 text-xs font-semibold text-[rgb(var(--primary))] uppercase tracking-wider">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Plans & billing</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold tracking-tight text-white">
          Your subscription
        </h1>
        <p className="text-zinc-500 max-w-xl text-[15px] leading-relaxed">
          Manage your plan, track credits, and unlock more from Studio.
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

      {isAuthenticated && billing && !isUnlimitedAccess && !hasAnyCheckoutEnabled ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-4 text-amber-100">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <div className="text-sm font-semibold">Self-serve billing is not live on this build.</div>
            <p className="mt-1 text-sm text-amber-100/80">
              You can review the Studio catalog here, but upgrades and credit-pack top-ups stay unavailable until billing is connected for this environment.
            </p>
          </div>
        </div>
      ) : null}

      {/* ─── Stats row ─── */}
      {billing && !loading ? (
        <section className="grid gap-4 md:grid-cols-3">
          {/* Credits */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--primary))]/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Access state' : 'Credits available'}
              </div>
              <div className="mt-3 text-4xl font-bold text-white tabular-nums">
                {isUnlimitedAccess ? '∞' : billing.credits.available_to_spend.toLocaleString()}
              </div>
              <div className="mt-2 text-[13px] text-zinc-500">
                {isUnlimitedAccess
                  ? 'Unlimited owner access'
                  : billing.credits.reserved_total > 0
                    ? `${billing.credits.reserved_total} held in active runs`
                    : 'No credits in use'}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))]/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Shell plan mirror' : 'Current plan'}
              </div>
              <div className="mt-3 text-2xl font-bold text-white">{currentCommercialPlan?.label ?? billing.plan.label}</div>
              <div className="mt-1 text-[13px] text-zinc-500 capitalize">
                {isUnlimitedAccess ? 'Owner account' : formatBillingStatusLabel(billing)}
              </div>
              {!isUnlimitedAccess ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entitlementFacts.slice(0, 2).map((fact) => (
                    <span key={fact} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-400">
                      {fact}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Allowance */}
          <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-white/[0.1]">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--primary))]/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Metering mode' : 'Monthly allowance'}
              </div>
              <div className="mt-3 text-4xl font-bold text-white tabular-nums">
                {isUnlimitedAccess ? '∞' : billing.credits.monthly_allowance.toLocaleString()}
              </div>
              <div className="mt-2 text-[13px] text-zinc-500">
                {isUnlimitedAccess
                  ? 'Mirror mode active'
                  : billing.credits.extra_credits > 0
                    ? `+${billing.credits.extra_credits} extra credits available`
                    : 'No extra credits'}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── Plan comparison ─── */}
      {publicPlans ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {[publicPlans.free_account, ...publicPlans.subscriptions].map((plan) => {
            const isCurrentPlan = Boolean(
              billing && (billing.plan.id === plan.entitlement_plan || billing.account_tier === plan.entitlement_plan),
            )
            const isFreeCurrentPlan = isCurrentPlan && plan.id === 'free_account'
            const checkoutEnabled = Boolean(plan.checkout_kind && availableCheckoutKinds.has(plan.checkout_kind))
            const isCheckoutPending = Boolean(plan.checkout_kind) && checkoutLoading === plan.checkout_kind
            const needsAccount = Boolean(plan.checkout_kind) && !isAuthenticated
            const price = formatPlanPrice(plan.price_usd, plan.billing_period)
            const ctaLabel = isCurrentPlan
              ? isFreeCurrentPlan
                ? 'Open Create'
                : 'Current plan'
              : needsAccount
                ? 'Create account'
                : plan.checkout_kind && !checkoutEnabled
                ? 'Checkout unavailable'
                : plan.checkout_kind
                  ? 'Upgrade now'
                  : isAuthenticated
                    ? 'Open Create'
                    : 'Create account'

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${
                  plan.recommended
                    ? 'border border-[rgb(var(--primary))]/40 bg-gradient-to-b from-[rgb(var(--primary))]/[0.06] to-transparent shadow-[0_0_60px_-15px_rgb(var(--primary)/0.2)]'
                    : 'border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]'
                }`}
              >
                {plan.recommended ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] px-3 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg">
                    Recommended
                  </div>
                ) : null}

                {isCurrentPlan && !plan.recommended ? (
                  <div className="absolute -top-3 left-6 rounded-full border border-white/[0.1] bg-zinc-900 px-3 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Current
                  </div>
                ) : null}

                <h3 className="text-lg font-bold text-white">{plan.label}</h3>
                <p className="mt-1 text-[13px] text-zinc-500 min-h-[36px]">{plan.summary}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white">{price.price}</span>
                  {price.period ? <span className="text-base font-medium text-zinc-600">{price.period}</span> : null}
                </div>
                <div className="mt-1 text-[12px] text-zinc-600">
                  {plan.monthly_credits.toLocaleString()} credits/mo · up to {plan.max_resolution}
                </div>

                {/* CTA */}
                <div className="mt-6">
                  {isFreeCurrentPlan && isAuthenticated ? (
                    <Link
                      to="/create"
                      className="w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> {ctaLabel}
                    </Link>
                  ) : plan.checkout_kind && needsAccount ? (
                    <Link
                      to="/signup"
                      className={`w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        plan.recommended
                          ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-white shadow-[0_0_20px_rgb(var(--primary)/0.3)] hover:shadow-[0_0_30px_rgb(var(--primary)/0.5)] hover:scale-[1.01]'
                          : 'bg-white/[0.06] text-white hover:bg-white/[0.1]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> {ctaLabel}
                    </Link>
                  ) : plan.checkout_kind ? (
                    <button
                      onClick={() => {
                        if (plan.checkout_kind && checkoutEnabled) {
                          void handleCheckout(plan.checkout_kind)
                        }
                      }}
                      disabled={isCurrentPlan || !checkoutEnabled || isCheckoutPending}
                      className={`w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        plan.recommended
                          ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-white shadow-[0_0_20px_rgb(var(--primary)/0.3)] hover:shadow-[0_0_30px_rgb(var(--primary)/0.5)] hover:scale-[1.01] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100'
                          : 'bg-white/[0.06] text-white hover:bg-white/[0.1] disabled:opacity-30'
                      }`}
                    >
                      {isCheckoutPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                        </>
                      ) : !isCurrentPlan && checkoutEnabled ? (
                        <>
                          <ExternalLink className="h-3.5 w-3.5" /> {ctaLabel}
                        </>
                      ) : (
                        ctaLabel
                      )}
                    </button>
                  ) : (
                    <Link
                      to={isAuthenticated ? '/create' : '/signup'}
                      className="w-full rounded-xl py-3 px-6 text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> {ctaLabel}
                    </Link>
                  )}
                </div>

                {/* Features */}
                <div className="mt-6 space-y-3 flex-1 border-t border-white/[0.05] pt-5">
                  {plan.feature_summary.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${plan.recommended ? 'text-[rgb(var(--accent))]' : 'text-zinc-600'}`} />
                      <span className="text-[13px] text-zinc-400">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      ) : null}

      {/* ─── Feature Comparison ─── */}
      {publicPlans ? (
        <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#111216]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-white/[0.02]">
                <tr>
                  <th className="p-6 font-semibold text-white">Compare features</th>
                  <th className="p-6 text-center font-semibold text-white min-w-[120px]">Free</th>
                  <th className="p-6 text-center font-semibold text-white min-w-[120px]">Creator</th>
                  <th className="p-6 text-center font-semibold text-[rgb(var(--primary-light))] min-w-[120px]">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 pl-6 font-medium text-zinc-300">{row.feature}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? <Check className="h-5 w-5 text-zinc-400" /> : <Minus className="h-4 w-4 text-zinc-700" />
                        ) : (
                          <span className="text-zinc-400 font-medium">{row.free}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center">
                        {typeof row.creator === 'boolean' ? (
                          row.creator ? <Check className="h-5 w-5 text-zinc-300" /> : <Minus className="h-4 w-4 text-zinc-700" />
                        ) : (
                          <span className="text-zinc-300 font-medium">{row.creator}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center bg-[rgb(var(--primary))]/[0.03]">
                      <div className="flex justify-center">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check className="h-5 w-5 text-[rgb(var(--primary-light))]" /> : <Minus className="h-4 w-4 text-zinc-700" />
                        ) : (
                          <span className="font-semibold text-[rgb(var(--primary-light))]">{row.pro}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* ─── Credit packs ─── */}
      {publicPlans ? (
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <Zap className="h-3 w-3" /> Flexible usage
              </div>
              <h2 className="mt-2 text-xl font-bold text-white">Credit packs</h2>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-zinc-500">
                Buy wallet credits anytime. Studio spends your monthly allowance first, then wallet balance.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-zinc-600 uppercase tracking-wider">From</div>
              <div className="text-3xl font-extrabold tracking-tight text-white">{formatCreditPackLeadPrice(publicPlans.credit_packs)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {publicPlans.credit_packs.map((option) => {
              const checkoutEnabled = availableCheckoutKinds.has(option.kind)
              const isCheckoutPending = checkoutLoading === option.kind
              return (
                <div key={option.kind} className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition hover:border-white/[0.1]">
                  <div>
                    <div className="text-sm font-semibold text-white">{option.label}</div>
                    <div className="mt-0.5 text-[12px] text-zinc-500">{option.credits} credits</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white">${option.price_usd}</span>
                    {!isAuthenticated ? (
                      <Link
                        to="/signup"
                        className="rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.12]"
                      >
                        Create account
                      </Link>
                    ) : (
                      <button
                        onClick={() => checkoutEnabled && handleCheckout(option.kind)}
                        disabled={!checkoutEnabled || isCheckoutPending}
                        className="rounded-lg bg-white/[0.06] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-30"
                      >
                        {isCheckoutPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : checkoutEnabled ? (
                          'Buy'
                        ) : (
                          'Unavailable'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* ─── Activity log ─── */}
      {billing && billing.recent_activity.length > 0 && !isUnlimitedAccess ? (
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Recent activity</h2>
          <div className="space-y-1.5">
            {billing.recent_activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-3 transition hover:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-zinc-300">{formatBillingActivityDescription(entry.description)}</span>
                  <span className="text-[11px] text-zinc-600">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

    </div>
  )
}
