import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCircle2, ExternalLink, Loader2, Minus, ShieldCheck, Sparkles, Zap } from 'lucide-react'

import {
  studioApi,
  type AuthMeResponse,
  type BillingSummary,
  type CheckoutKind,
  type PublicPlansPayload,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { IS_CHAT_ENABLED } from '@/lib/featureFlags'
import { toUserFacingErrorMessage } from '@/lib/uiError'
import { usePageMeta } from '@/lib/usePageMeta'
import { InlineError } from '@/components/InlineError'
import { useToast } from '@/components/Toast'

function errorMessage(error: unknown, fallback: string) {
  return toUserFacingErrorMessage(error, fallback)
}

function formatBillingStatusLabel(summary: BillingSummary) {
  if (summary.account_tier === 'free') return 'Free'
  if (!summary.subscription_status || summary.subscription_status === 'none') return 'No active subscription'
  return summary.subscription_status.replace(/_/g, ' ')
}

function formatBillingActivityDescription(description: string) {
  const trimmed = description.trim()
  if (/^free account welcome credits$/i.test(trimmed)) return 'Free welcome credits'
  if (/^free account monthly refresh$/i.test(trimmed)) return 'Free monthly refresh'
  if (/^creator activation$/i.test(trimmed)) return 'Essential activation'
  if (/^creator renewal$/i.test(trimmed)) return 'Essential renewal'
  if (/^pro activation$/i.test(trimmed)) return 'Premium activation'
  if (/^pro renewal$/i.test(trimmed)) return 'Premium renewal'
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

function BillingPill({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'brand' | 'success' | 'warning' }) {
  const className =
    tone === 'brand'
      ? 'border-[rgb(var(--primary-light))]/25 bg-[rgb(var(--primary-light))]/10 text-[rgb(var(--primary-light))]'
      : tone === 'success'
        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
        : tone === 'warning'
          ? 'border-amber-300/20 bg-amber-300/10 text-amber-100'
          : 'border-white/[0.08] bg-white/[0.04] text-zinc-300'
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${className}`}>{children}</span>
}

function billingSummaryFromAuth(auth?: Partial<AuthMeResponse>): BillingSummary | null {
  if (!auth || auth.guest) return null
  const plan = auth.plan ?? {
    id: auth.identity?.plan ?? 'free',
    label: auth.identity?.plan === 'pro' ? 'Premium' : auth.identity?.plan === 'creator' ? 'Essential' : 'Free',
    monthly_credits: 0,
    queue_priority: 'standard',
    share_links: false,
    can_generate: true,
    can_access_chat: false,
  }
  const monthlyAllowance = Math.max(plan.monthly_credits ?? auth.credits?.monthly_remaining ?? 0, 0)
  const monthlyRemaining = Math.max(auth.credits?.monthly_remaining ?? monthlyAllowance, 0)
  const extraCredits = Math.max(auth.credits?.extra_credits ?? auth.wallet_balance ?? 0, 0)
  const remaining = Math.max(auth.credits?.remaining ?? monthlyRemaining + extraCredits, 0)
  const accountTier = auth.account_tier ?? (auth.identity?.plan && auth.identity.plan !== 'guest' ? auth.identity.plan : 'free')
  const entitlements = auth.entitlements ?? auth.feature_entitlements ?? {
    can_access_chat: Boolean(plan.can_access_chat),
    premium_chat: accountTier === 'pro',
    allowed_chat_modes: accountTier === 'pro' ? ['standard', 'premium'] : ['standard'],
    chat_message_limit: accountTier === 'free' ? 0 : 100,
    max_chat_attachments: accountTier === 'free' ? 0 : 4,
    can_clean_export: accountTier !== 'free',
    can_share_links: Boolean(plan.share_links),
    can_generate: Boolean(plan.can_generate),
  }
  const credits = {
    remaining,
    gross_remaining: remaining,
    monthly_remaining: monthlyRemaining,
    monthly_allowance: monthlyAllowance,
    extra_credits: extraCredits,
    reserved_total: 0,
    available_to_spend: remaining,
    spend_order: 'monthly_then_extra',
    unlimited: Boolean(auth.identity?.root_admin || auth.identity?.owner_mode),
  }

  return {
    plan,
    subscription_status: accountTier === 'free' ? 'none' : 'active',
    entitlements,
    feature_entitlements: entitlements,
    credits,
    wallet: {
      balance: extraCredits,
      wallet_balance: extraCredits,
      included_monthly_allowance: monthlyAllowance,
      included_monthly_remaining: monthlyRemaining,
      reserved_total: 0,
      available_to_spend: remaining,
      spend_order: 'monthly_then_extra',
      unlimited: credits.unlimited,
    },
    wallet_balance: extraCredits,
    account_tier: accountTier,
    subscription_tier: accountTier === 'creator' || accountTier === 'pro' ? accountTier : null,
    generation_credit_guide: {
      available_to_spend: remaining,
      reserved_total: 0,
      unlimited: credits.unlimited,
      lane_highlights: [],
      models: [],
    },
    checkout_options: [],
    recent_activity: [],
  }
}

export default function BillingPage() {
  const { auth, isAuthenticated } = useStudioAuth()
  const { addToast } = useToast()
  const isRoot = auth?.identity?.root_admin || auth?.identity?.owner_mode
  const authBillingSnapshot = useMemo(() => billingSummaryFromAuth(auth), [auth])
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [publicPlans, setPublicPlans] = useState<PublicPlansPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  usePageMeta(
    'Subscription',
    'Review your Studio subscription, credits, and purchases.',
  )

  const loadPublicPlans = useCallback(async () => {
    setPlansLoading(true)
    setPlansError(null)
    try {
      const payload = await studioApi.getPublicPlans()
      setPublicPlans(payload)
    } catch (err) {
      setPlansError(errorMessage(err, 'Could not load Studio plans.'))
    } finally {
      setPlansLoading(false)
    }
  }, [])

  const loadBillingSummary = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setSummaryError(null)
    try {
      const payload = await studioApi.getBillingSummary()
      setBilling(payload)
    } catch (err) {
      setSummaryError(errorMessage(err, 'Could not load your billing summary.'))
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    void loadPublicPlans()
  }, [loadPublicPlans])

  useEffect(() => {
    void loadBillingSummary()
  }, [loadBillingSummary])

  useEffect(() => {
    if (!isAuthenticated || billing || !authBillingSnapshot) return
    setBilling(authBillingSnapshot)
  }, [authBillingSnapshot, billing, isAuthenticated])

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
    const facts: string[] = []
    if (IS_CHAT_ENABLED) {
      facts.push(billing.entitlements.can_access_chat ? 'Create + Chat unlocked' : 'Chat locked')
      facts.push(billing.entitlements.premium_chat ? 'Premium chat active' : 'Standard chat lane')
    } else {
      facts.push(billing.entitlements.can_generate ? 'Create unlocked' : 'Create locked')
    }
    facts.push(billing.entitlements.can_share_links ? 'Share links enabled' : 'Share links locked')
    facts.push(billing.entitlements.can_clean_export ? 'Clean exports enabled' : 'Clean export locked')
    return facts
  }, [billing])
  const creditUsePercent = billing && !isUnlimitedAccess && billing.credits.monthly_allowance > 0
    ? Math.min(100, Math.max(0, Math.round(((billing.credits.monthly_allowance - billing.credits.monthly_remaining) / billing.credits.monthly_allowance) * 100)))
    : 0
  const comparisonRows = useMemo(() => {
    if (!publicPlans || publicPlans.subscriptions.length < 2) return []
    const creator = publicPlans.subscriptions.find((plan) => plan.id === 'creator') ?? publicPlans.subscriptions[0]
    const pro = publicPlans.subscriptions.find((plan) => plan.id === 'pro') ?? publicPlans.subscriptions[1]
    const free = publicPlans.free_account
    const freeEntitlements = publicPlans.entitlements.free
    const creatorEntitlements = publicPlans.entitlements.creator
    const proEntitlements = publicPlans.entitlements.pro

    const rows: Array<{ feature: string; free: string | boolean; creator: string | boolean; pro: string | boolean }> = []
    if (IS_CHAT_ENABLED) {
      rows.push({ feature: 'Studio chat', free: free.can_access_chat, creator: creator.can_access_chat, pro: pro.can_access_chat })
    }
    rows.push({ feature: 'Image model access', free: 'Core', creator: 'Newer', pro: 'Newest + advanced' })
    rows.push({
      feature: 'Bundled monthly image credits',
      free: false,
      creator: `${creator.monthly_credits.toLocaleString()} / mo`,
      pro: `${pro.monthly_credits.toLocaleString()} / mo`,
    })
    rows.push({ feature: 'Wallet credit packs', free: true, creator: true, pro: true })
    rows.push({
      feature: 'Concurrent generations',
      free: `${freeEntitlements.max_incomplete_generations} job`,
      creator: `${creatorEntitlements.max_incomplete_generations} jobs`,
      pro: `${proEntitlements.max_incomplete_generations} jobs`,
    })
    rows.push({ feature: 'Share links', free: free.share_links, creator: creator.share_links, pro: pro.share_links })
    rows.push({ feature: 'Clean exports', free: freeEntitlements.can_clean_export, creator: creatorEntitlements.can_clean_export, pro: proEntitlements.can_clean_export })
    if (IS_CHAT_ENABLED) {
      rows.push({ feature: 'Premium chat lanes', free: false, creator: false, pro: true })
    }
    return rows
  }, [publicPlans])

  const handleCheckout = async (kind: CheckoutKind) => {
    setCheckoutLoading(kind)
    setCheckoutError(null)
    try {
      const result = await studioApi.checkout(kind)
      if (typeof result.checkout_url === 'string' && result.checkout_url) {
        window.location.assign(result.checkout_url)
        return
      }
      const msg = 'Purchases are not open for this plan on your account yet.'
      setCheckoutError(msg)
      addToast('warning', msg)
    } catch (err) {
      const msg = errorMessage(err, 'Checkout could not be started. Please try again.')
      setCheckoutError(msg)
      addToast('error', msg)
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-28 pt-5 md:px-5 md:pb-8 xl:px-6">
      {/* ─── Hero ─── */}
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--primary-light))]/70">
            Billing
          </div>
          <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-white">Your subscription</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Manage your plan, credits, and purchases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {billing ? <BillingPill tone={billing.account_tier === 'pro' ? 'brand' : 'neutral'}>{billing.plan.label}</BillingPill> : null}
          {billing && !isUnlimitedAccess ? <BillingPill tone={hasAnyCheckoutEnabled ? 'success' : 'warning'}>{hasAnyCheckoutEnabled ? 'Checkout ready' : 'Checkout paused'}</BillingPill> : null}
          {isRoot ? <BillingPill tone="brand">Owner mirror</BillingPill> : null}
        </div>
      </header>

      {isRoot && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-[rgb(var(--primary-light))]/[0.1] bg-[rgb(var(--primary-light))]/[0.05] p-4 text-zinc-300">
          <ShieldCheck className="h-5 w-5 text-zinc-200" />
          <p className="font-semibold text-sm">
            Owner access shows the public subscription experience without charging this account.
          </p>
        </div>
      )}

      {plansError ? (
        <InlineError
          title="Studio plans unavailable"
          message={plansError}
          onRetry={() => { void loadPublicPlans() }}
          retryDisabled={plansLoading}
          retryLabel={plansLoading ? 'Retrying...' : 'Try again'}
        />
      ) : null}

      {isAuthenticated && summaryError ? (
        <InlineError
          title="Billing summary failed to load"
          message={summaryError}
          onRetry={() => { void loadBillingSummary() }}
          retryDisabled={loading}
          retryLabel={loading ? 'Retrying...' : 'Try again'}
        />
      ) : null}

      {checkoutError ? (
        <InlineError
          title="Checkout unavailable"
          message={checkoutError}
          onRetry={() => setCheckoutError(null)}
          retryLabel="Dismiss"
        />
      ) : null}

      {isAuthenticated && !billing && loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your billing summary...
        </div>
      ) : null}

      {!publicPlans && plansLoading && !plansError ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-6 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading plans...
        </div>
      ) : null}

      {isAuthenticated && billing && !isUnlimitedAccess && !hasAnyCheckoutEnabled ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.08] p-4 text-amber-100">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <div className="text-sm font-semibold">Checkout is not open for this account yet.</div>
            <p className="mt-1 text-sm text-amber-100/80">
              You can review plans now. Upgrades and credit packs will appear here when billing opens for your account.
            </p>
          </div>
        </div>
      ) : null}

      {/* ─── Stats row ─── */}
      {billing ? (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] lg:gap-4">
          {/* Credits */}
          <div className="group relative col-span-2 overflow-hidden rounded-[24px] border border-[rgb(var(--primary-light))]/[0.14] bg-[linear-gradient(135deg,rgba(22,17,10,0.72),rgba(7,7,6,0.92))] p-4 shadow-[0_20px_64px_rgba(0,0,0,0.28)] transition hover:border-[rgb(var(--primary-light))]/[0.2] md:p-6 lg:col-span-1">
            <div className="absolute inset-x-4 bottom-4 h-2 overflow-hidden rounded-full bg-white/[0.08] md:inset-x-6 md:bottom-5">
              <div className="h-full rounded-full bg-[rgb(var(--primary-light))]" style={{ width: `${isUnlimitedAccess ? 100 : creditUsePercent}%` }} />
            </div>
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Access state' : 'Credits available'}
              </div>
              <div className="mt-3 text-4xl font-bold text-white tabular-nums">
                {isUnlimitedAccess ? 'Unlimited' : billing.credits.available_to_spend.toLocaleString()}
              </div>
              <div className="mb-6 mt-2 text-[13px] text-zinc-500 md:mb-7">
                {isUnlimitedAccess
                  ? 'Unlimited owner access'
                  : billing.credits.reserved_total > 0
                    ? `${billing.credits.reserved_total} held in active runs`
                    : 'No credits in use'}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0a0907]/70 p-4 transition hover:border-[rgb(var(--primary-light))]/[0.16] md:p-6">
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Shell plan mirror' : 'Current plan'}
              </div>
              <div className="mt-2 text-xl font-bold text-white md:mt-3 md:text-2xl">{currentCommercialPlan?.label ?? billing.plan.label}</div>
              <div className="mt-1 text-[13px] text-zinc-500 capitalize">
                {isUnlimitedAccess ? 'Owner account' : formatBillingStatusLabel(billing)}
              </div>
              {!isUnlimitedAccess ? (
                <div className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
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
          <div className="group relative overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#0a0907]/70 p-4 transition hover:border-[rgb(var(--primary-light))]/[0.16] md:p-6">
            <div className="relative">
              <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isUnlimitedAccess ? 'Metering mode' : 'Monthly allowance'}
              </div>
              <div className="mt-2 text-2xl font-bold text-white tabular-nums md:mt-3 md:text-4xl">
                {isUnlimitedAccess ? 'Unlimited' : billing.credits.monthly_allowance.toLocaleString()}
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
        <section className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--primary-light))]/65">Plans</div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Choose access</h2>
            </div>
            <Link to="/legal/refunds" className="text-sm font-medium text-zinc-500 transition hover:text-white">
              Refund Policy
            </Link>
          </div>
          <div className="grid gap-4 pt-16 md:pt-0 lg:grid-cols-3">
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
                    ? 'border border-[rgb(var(--primary-light))]/35 bg-gradient-to-b from-[rgb(var(--primary-light))]/[0.12] to-black/[0.14] shadow-[0_0_60px_-18px_rgba(241,191,103,0.45)]'
                    : 'border border-white/[0.06] bg-black/[0.16] hover:border-[rgb(var(--primary-light))]/[0.14]'
                }`}
              >
                {plan.recommended ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-light))] px-3 py-0.5 text-[10px] font-bold text-black uppercase tracking-wider shadow-lg">
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
                <div className="mt-1 text-[12px] text-zinc-600">{plan.monthly_credits.toLocaleString()} credits/mo</div>

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
                          ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-light))] text-black shadow-[0_0_20px_rgba(241,191,103,0.24)] hover:shadow-[0_0_30px_rgba(241,191,103,0.36)] hover:scale-[1.01]'
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
                          ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--primary-light))] text-black shadow-[0_0_20px_rgba(241,191,103,0.24)] hover:shadow-[0_0_30px_rgba(241,191,103,0.36)] hover:scale-[1.01] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100'
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
          </div>
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
                  <th className="p-6 text-center font-semibold text-white min-w-[120px]">Essential</th>
                  <th className="p-6 text-center font-semibold text-[rgb(var(--primary-light))] min-w-[120px]">Premium</th>
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
