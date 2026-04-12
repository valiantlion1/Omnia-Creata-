import { useState, useEffect } from 'react'
import { CheckCircle2, Zap, ShieldCheck, Cpu, Loader2, ExternalLink, TrendingUp } from 'lucide-react'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type BillingSummary } from '@/lib/studioApi'
import { usePageMeta } from '@/lib/usePageMeta'

const tiers = [
  {
    name: 'Free Creator',
    price: '$0',
    description: 'Perfect for exploring the Studio capabilities.',
    features: ['150 Monthly Credits', 'Standard generation lane', 'Community access', 'Starter export quality'],
    cta: 'Current Plan',
    checkoutKind: null as null,
    highlighted: false,
  },
  {
    name: 'Pro Visionary',
    price: '$15',
    period: '/mo',
    description: 'Unlock the full power of Omnia Creata models.',
    features: ['2,500 Monthly Credits', 'Priority generation lane', 'Commercial license', 'Higher quality exports', 'Saved workflow memory'],
    cta: 'Upgrade to Pro',
    checkoutKind: 'pro_monthly' as const,
    highlighted: true,
  },
  {
    name: 'Studio Enterprise',
    price: '$45',
    period: '/mo',
    description: 'For power users and boutique creative teams.',
    features: ['10,000 Monthly Credits', 'Shared team workflows', 'Advanced account controls', 'Priority support', 'Custom onboarding'],
    cta: 'Contact Sales',
    checkoutKind: null as null,
    highlighted: false,
  },
]

export default function BillingPage() {
  const { auth, isAuthenticated } = useStudioAuth()
  const isRoot = auth?.identity?.root_admin || auth?.identity?.owner_mode
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  usePageMeta('Plans & Billing', 'Review protected-beta plans, credits, and checkout lanes powered by LemonSqueezy.')

  // Fetch live billing summary
  useEffect(() => {
    if (!isAuthenticated) return
    setLoading(true)
    studioApi.getBillingSummary()
      .then(setBilling)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isAuthenticated])

  const handleCheckout = async (kind: string) => {
    setCheckoutLoading(kind)
    try {
      const result = await studioApi.checkout(kind as any)
      // If checkout returns a URL, redirect to LemonSqueezy
      if ((result as any).checkout_url) {
        window.location.href = (result as any).checkout_url
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-4 py-12 md:px-6">
      
      {/* Header */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold text-emerald-400 uppercase tracking-wider backdrop-blur-md">
          <Zap className="h-3.5 w-3.5" />
          <span>Scale Your Creativity</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
          Plans for Every Creator
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Protected-beta plan packaging with clear credit allowances and checkout handled by LemonSqueezy.
        </p>
      </section>

      {/* Root Admin Banner */}
      {isRoot && (
         <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#7c3aed]/20 to-fuchsia-500/20 border border-[#7c3aed]/30 shadow-[0_0_30px_rgba(124,58,237,0.15)] text-[#d8b4fe]">
            <ShieldCheck className="h-6 w-6" />
            <p className="font-semibold text-sm">You have unlimited access to all features and credits.</p>
         </div>
      )}

      {/* Live Credit Summary */}
      {billing && !loading && (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Credits Remaining</div>
            <div className="text-3xl font-bold text-white">{billing.credits.remaining.toLocaleString()}</div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-fuchsia-500 transition-all" style={{ width: `${Math.min(100, (billing.credits.remaining / Math.max(1, billing.credits.monthly_allowance)) * 100)}%` }} />
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Current Plan</div>
            <div className="text-3xl font-bold text-white">{billing.plan.label}</div>
            <div className="mt-1 text-sm text-zinc-400 capitalize">{billing.subscription_status?.replace(/_/g, ' ') ?? 'Active'}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Monthly Allowance</div>
            <div className="text-3xl font-bold text-white">{billing.credits.monthly_allowance.toLocaleString()}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-emerald-400"><TrendingUp className="h-3.5 w-3.5" /> {billing.credits.extra_credits} bonus credits</div>
          </div>
        </section>
      )}

      {/* Pricing Cards */}
      <section className="grid gap-8 md:grid-cols-3 pt-8">
        {tiers.map((tier) => {
          const isCheckoutPending = Boolean(tier.checkoutKind) && checkoutLoading === tier.checkoutKind

          return (
          <div 
            key={tier.name} 
            className={`relative flex flex-col rounded-[32px] p-8 transition-all duration-300 ${
              tier.highlighted 
                ? 'bg-[#121318] border border-[#7c3aed]/50 shadow-[0_15px_60px_rgba(124,58,237,0.15)] scale-105 z-10' 
                : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04]'
            }`}
          >
            {tier.highlighted && (
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#7c3aed] to-fuchsia-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                 MOST POPULAR
               </div>
            )}
            
            <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
            <p className="text-sm text-zinc-400 mb-6 h-10">{tier.description}</p>
            
            <div className="mb-8 flex items-baseline gap-1 text-white">
              <span className="text-5xl font-extrabold tracking-tight">{tier.price}</span>
              {tier.period && <span className="text-lg font-medium text-zinc-500">{tier.period}</span>}
            </div>

            <button 
              onClick={() => tier.checkoutKind && handleCheckout(tier.checkoutKind)}
              disabled={!tier.checkoutKind || isCheckoutPending}
              className={`w-full rounded-full py-3.5 px-6 font-semibold transition-all flex items-center justify-center gap-2 ${
                tier.highlighted
                  ? 'bg-gradient-to-r from-[#7c3aed] to-fuchsia-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] hover:scale-[1.02] disabled:opacity-60'
                  : 'bg-white/[0.05] text-white hover:bg-white/[0.1] disabled:opacity-40'
              }`}
            >
              {isCheckoutPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : tier.checkoutKind ? (
                <><ExternalLink className="h-4 w-4" /> {tier.cta}</>
              ) : (
                tier.cta
              )}
            </button>

            <div className="mt-8 space-y-4 flex-1">
              {tier.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className={`h-5 w-5 shrink-0 ${tier.highlighted ? 'text-fuchsia-400' : 'text-zinc-500'}`} />
                  <span className="text-sm font-medium text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          )
        })}
      </section>

      <p className="mt-[-12px] text-center text-sm text-zinc-500">
        Protected beta pricing copy is provisional and may change before public launch.
      </p>

      {/* Recent Activity */}
      {billing && billing.recent_activity.length > 0 && (
        <section className="pt-8">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {billing.recent_activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-zinc-200">{entry.description}</span>
                  <span className="ml-3 text-xs text-zinc-500">{new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`text-sm font-bold ${entry.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {entry.amount > 0 ? '+' : ''}{entry.amount} credits
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Footer Trust Markers */}
      <section className="pt-12 mt-12 border-t border-white/[0.05] grid gap-8 md:grid-cols-2 text-zinc-400 text-sm">
         <div className="flex gap-4 items-center">
            <Cpu className="h-8 w-8 text-zinc-600" />
            <div>
               <p className="font-semibold text-zinc-200">Managed Render Infrastructure</p>
               <p>Protected beta generations run through curated provider lanes tuned for reliability, safety, and honest delivery expectations.</p>
            </div>
         </div>
         <div className="flex gap-4 items-center">
            <ShieldCheck className="h-8 w-8 text-zinc-600" />
            <div>
               <p className="font-semibold text-zinc-200">Powered by LemonSqueezy</p>
               <p>Secure global payments with support for 100+ countries. Your financial data never touches our servers.</p>
            </div>
         </div>
      </section>

    </div>
  )
}
