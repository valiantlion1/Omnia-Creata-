import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  Sparkles,
  Wand2,
  Layers3,
  Palette,
  Camera,
  Lightbulb,
  Users,
} from 'lucide-react'
import { usePageMeta } from '@/lib/usePageMeta'
import { LegalFooter } from '@/components/StudioPrimitives'
import { studioApi, type PublicPlansPayload, type PublicPost } from '@/lib/studioApi'

type PlanCard = {
  id: 'free_account' | 'creator' | 'pro'
  name: string
  price: string
  cadence: string
  tagline: string
  bullets: string[]
  cta: string
  recommended: boolean
  highlighted: boolean
}

function formatPrice(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return '—'
  if (usd === 0) return 'Free'
  return `$${usd % 1 === 0 ? usd.toFixed(0) : usd.toFixed(2)}`
}

function buildPlanCards(payload: PublicPlansPayload | undefined): PlanCard[] {
  if (!payload) return []
  const featured = payload.featured_subscription

  const free: PlanCard = {
    id: 'free_account',
    name: 'Free',
    price: 'Free',
    cadence: 'forever',
    tagline: 'Open your workspace before you spend.',
    bullets: [
      'Personal workspace, library, and saved history',
      'Buy wallet credits only when you are ready to generate',
      'Upgrade later for Chat and higher capacity',
    ],
    cta: 'Open your workspace',
    recommended: false,
    highlighted: false,
  }

  const cards: PlanCard[] = [free]

  for (const sub of payload.subscriptions ?? []) {
    const isCreator = sub.id === 'creator'
    const isPro = sub.id === 'pro'
    const credits = sub.monthly_credits ? sub.monthly_credits.toLocaleString() : null
    const isFeatured = sub.id === featured

    const bullets = isCreator
      ? [
          credits ? `${credits} credits each month` : 'Generous monthly allowance',
          'Chat mode for guided iteration',
          'Commercial use included',
          'Shareable links for your work',
        ]
      : isPro
        ? [
            credits ? `${credits} credits each month` : 'Higher monthly allowance',
            'Priority rendering queue',
            'Advanced finish quality',
            'Everything in Creator',
          ]
        : sub.feature_summary?.slice(0, 4) ?? []

    cards.push({
      id: sub.id,
      name: sub.label ?? (isCreator ? 'Creator' : isPro ? 'Pro' : sub.id),
      price: formatPrice(sub.price_usd),
      cadence: sub.billing_period === 'month' ? '/ month' : '',
      tagline: isCreator
        ? 'For the weekly maker.'
        : isPro
          ? 'For the studio operator.'
          : '',
      bullets,
      cta: isFeatured ? `Go ${sub.label ?? sub.id}` : `Choose ${sub.label ?? sub.id}`,
      recommended: isFeatured || sub.recommended,
      highlighted: isFeatured,
    })
  }

  return cards
}

type Faq = { q: string; a: string }

const FAQS: Faq[] = [
  {
    q: 'Can I use what I make commercially?',
    a: 'Yes — on any paid plan, you own what you create and can use it for client work, products, or anything else you put out into the world. The free tier is meant for personal projects and exploration.',
  },
  {
    q: 'Do I really own the images?',
    a: 'Yes. We do not reuse your prompts, outputs, or references for training, marketing, or anything else. What you make is yours, start to finish.',
  },
  {
    q: 'How fast is it?',
    a: 'Most images come back in a few seconds. Higher-quality finishes take a little longer because they render at a tighter pass — but you stay in the flow, not waiting on a queue.',
  },
  {
    q: 'What does the free plan actually include?',
    a: 'Full access to the creative canvas and a personal library. You can start making things immediately, without a card, and upgrade only when you want more room to work.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Anytime, from your account. No contracts, no exit fees, no support-ticket dance. Your library and past work stay with you either way.',
  },
]

function PricingCard({ card, onClick }: { card: PlanCard; onClick: () => void }) {
  return (
    <div
      className={[
        'relative flex flex-col gap-6 rounded-[26px] border p-7 transition',
        card.highlighted
          ? 'border-[rgb(var(--primary-light)/0.45)] bg-[rgb(var(--primary)/0.1)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]',
      ].join(' ')}
      style={{
        boxShadow: card.highlighted
          ? '0 0 60px -20px rgba(124,58,237,0.45), inset 0 0 40px -20px rgba(124,58,237,0.08)'
          : 'var(--border-glow)',
      }}
    >
      {card.recommended && (
        <div className="absolute -top-3 left-7 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-[0_4px_20px_-4px_rgba(124,58,237,0.5)]">
          Most popular
        </div>
      )}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{card.name}</div>
        {card.tagline && <div className="mt-1.5 text-[13px] text-zinc-400">{card.tagline}</div>}
        <div className="mt-5 flex items-baseline gap-1.5">
          <div className="text-[44px] font-black leading-none tracking-tight text-white">{card.price}</div>
          {card.cadence && <div className="text-sm text-zinc-500">{card.cadence}</div>}
        </div>
      </div>
      <ul className="flex flex-col gap-2.5 text-sm text-zinc-200">
        {card.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--primary-light))]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onClick}
        className={[
          'mt-auto rounded-full px-5 py-3.5 text-sm font-bold transition-all active:scale-[0.98]',
          card.highlighted
            ? 'bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] text-white shadow-[0_0_30px_-6px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_-6px_rgba(124,58,237,0.7)] hover:scale-[1.02]'
            : 'bg-white/[0.06] text-white ring-1 ring-white/[0.08] hover:bg-white/[0.1]',
        ].join(' ')}
      >
        {card.cta}
      </button>
    </div>
  )
}

function FaqItem({ item, open, onToggle }: { item: Faq; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-white/[0.05] last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 py-5 text-left transition"
      >
        <span className="text-[15px] font-semibold text-white/95 md:text-base">{item.q}</span>
        {open ? (
          <Minus className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
      </button>
      {open && <p className="pb-6 pr-10 text-[15px] leading-relaxed text-zinc-400">{item.a}</p>}
    </div>
  )
}

function GalleryTile({ post, aspect }: { post: PublicPost; aspect: string }) {
  const url = post.cover_asset?.thumbnail_url ?? post.cover_asset?.url ?? post.preview_assets?.[0]?.url
  if (!url) return null
  return (
    <figure
      className={`group relative overflow-hidden rounded-[18px] border border-white/[0.05] bg-white/[0.02] ${aspect}`}
      style={{ boxShadow: 'var(--border-glow)' }}
    >
      <img
        src={url}
        alt={post.title || post.prompt || 'Studio creation'}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      {post.title && (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="text-[13px] font-semibold text-white/95 line-clamp-1">{post.title}</div>
          <div className="text-[11px] text-zinc-400">by @{post.owner_username}</div>
        </figcaption>
      )}
    </figure>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  usePageMeta(
    'Omnia Creata Studio',
    'A creative studio for turning ideas into images. Make, iterate, and own the work.',
  )

  const { data: plansPayload } = useQuery({
    queryKey: ['landing', 'public-plans'],
    queryFn: () => studioApi.getPublicPlans(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const { data: trendingPosts } = useQuery({
    queryKey: ['landing', 'trending-posts'],
    queryFn: () => studioApi.listPublicPosts('trending'),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })

  const planCards = useMemo(() => buildPlanCards(plansPayload), [plansPayload])
  const galleryPosts = useMemo(() => {
    const posts = trendingPosts?.posts ?? []
    return posts
      .filter(
        (p) =>
          p.cover_asset?.thumbnail_url ||
          p.cover_asset?.url ||
          p.preview_assets?.[0]?.url,
      )
      .slice(0, 8)
  }, [trendingPosts])

  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const handlePlanCta = (id: PlanCard['id']) => {
    if (id === 'free_account') navigate('/signup')
    else navigate('/subscription')
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#060608] text-white">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-[-15%] top-[-10%] h-[55vw] w-[55vw] rounded-full bg-[rgb(var(--primary))] opacity-[0.14] blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-15%] h-[45vw] w-[45vw] rounded-full bg-[rgb(var(--accent))] opacity-[0.09] blur-[160px]" />
      <div className="pointer-events-none absolute left-1/2 top-[30%] h-[30vw] w-[60vw] -translate-x-1/2 rounded-full bg-[rgb(var(--primary-light))] opacity-[0.04] blur-[140px]" />

      {/* Navigation */}
      <nav className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5 md:px-8 md:py-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <img src="/omnia-crest.png" alt="Omnia Creata" className="h-10 w-10 object-contain" />
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold tracking-tight text-white/95">Omnia Creata</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Studio</div>
          </div>
        </button>
        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={() => navigate('/explore')} className="hidden lg:inline text-sm font-medium text-zinc-400 transition hover:text-white">
            Gallery
          </button>
          <button onClick={() => navigate('/subscription')} className="hidden lg:inline text-sm font-medium text-zinc-400 transition hover:text-white">
            Pricing
          </button>
          <button onClick={() => navigate('/help')} className="hidden lg:inline text-sm font-medium text-zinc-400 transition hover:text-white">
            Help
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-zinc-300 transition hover:text-white">
            Log in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.14)] transition-all hover:scale-105 active:scale-[0.98] md:px-5 md:py-2.5"
          >
            Create account
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-[1080px] flex-col items-center justify-center px-6 pb-16 pt-16 text-center md:px-8 md:pt-24">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--primary-light))]" />
          A creative studio, not a prompt box
        </div>

        <h1
          className="mb-6 text-[40px] font-black leading-[1.02] tracking-tighter font-display sm:text-6xl md:text-[80px] lg:text-[96px]"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, rgb(var(--primary-light)) 55%, #ffffff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Make it look
          <br />
          like you meant it.
        </h1>

        <p className="mb-10 max-w-[620px] text-[17px] leading-relaxed text-zinc-400 md:text-[19px]">
          Omnia Creata Studio is where ideas become images you actually want to use.
          Characters, concept art, product shots, moodboards — one workspace, your rules.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] px-7 py-4 text-base font-bold shadow-[0_0_40px_-6px_rgba(124,58,237,0.45)] transition-all hover:scale-[1.03] hover:shadow-[0_0_60px_-6px_rgba(124,58,237,0.65)] active:scale-[0.98]"
          >
            Start creating
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-7 py-4 text-base font-semibold text-zinc-300 backdrop-blur-md transition-all hover:bg-white/[0.06] hover:border-white/[0.12]"
          >
            Browse the gallery
          </button>
        </div>
      </main>

      {/* Gallery strip — real trending work */}
      {galleryPosts.length >= 4 && (
        <section className="relative z-10 py-12 md:py-16">
          <div className="mx-auto max-w-[1400px] px-6 md:px-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {galleryPosts.slice(0, 4).map((post, i) => (
                <GalleryTile
                  key={post.id}
                  post={post}
                  aspect={
                    i === 0 || i === 3
                      ? 'aspect-[4/5]'
                      : i === 1
                        ? 'aspect-[4/5] md:translate-y-8'
                        : 'aspect-[4/5] md:-translate-y-4'
                  }
                />
              ))}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/explore')}
                className="text-sm font-semibold text-zinc-400 transition hover:text-white"
              >
                See everything people are making →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Use cases */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#07080c] py-20 md:py-28">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="mb-14 max-w-2xl">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">Built for real work</div>
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[48px]">
              Whatever you make,
              <br className="hidden md:inline" />
              <span className="text-zinc-500"> make it better.</span>
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: 'Characters & portraits',
                body: 'Consistent faces, fits, and expressions for the cast you actually need.',
              },
              {
                icon: Palette,
                title: 'Concept & key art',
                body: 'Big establishing shots, environments, and story beats that read at a glance.',
              },
              {
                icon: Camera,
                title: 'Product & editorial',
                body: 'Clean staging, controlled lighting, and finishes that hold up on a grid.',
              },
              {
                icon: Lightbulb,
                title: 'Moodboards & exploration',
                body: 'Blast through twenty directions before lunch. Keep the two that click.',
              },
              {
                icon: Layers3,
                title: 'Iteration, not lottery',
                body: 'Refine an image with precision. No re-rolling the dice until you get lucky.',
              },
              {
                icon: Wand2,
                title: 'Your signature look',
                body: 'Save styles that match your voice and reuse them across projects.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-[22px] border border-white/[0.05] bg-white/[0.02] p-7 transition hover:border-white/[0.1] hover:bg-white/[0.035]"
                style={{ boxShadow: 'var(--border-glow)' }}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-[rgb(var(--primary-light))] transition group-hover:bg-[rgb(var(--primary)/0.12)]">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="text-[14px] leading-relaxed text-zinc-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#060608] py-20 md:py-28">
        <div className="mx-auto max-w-[1200px] px-6 md:px-8">
          <div className="mb-14 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">Pricing</div>
              <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[48px]">
                Simple plans.
                <br className="hidden md:inline" />
                <span className="text-zinc-500"> Honest math.</span>
              </h2>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              className="text-sm font-semibold text-[rgb(var(--primary-light))] transition hover:text-white"
            >
              See full pricing →
            </button>
          </div>

          {planCards.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {planCards.map((card) => (
                <PricingCard key={card.id} card={card} onClick={() => handlePlanCta(card.id)} />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[380px] rounded-[26px] border border-white/[0.05] bg-white/[0.02] p-7"
                  style={{ boxShadow: 'var(--border-glow)' }}
                >
                  <div className="h-3 w-20 animate-pulse rounded-full bg-white/[0.06]" />
                  <div className="mt-6 h-12 w-32 animate-pulse rounded-lg bg-white/[0.05]" />
                  <div className="mt-8 flex flex-col gap-3">
                    <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
                    <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/[0.04]" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#07080c] py-20 md:py-28">
        <div className="mx-auto grid max-w-[1100px] gap-12 px-6 md:px-8 lg:grid-cols-[340px_1fr]">
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600">Questions</div>
            <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-white md:text-[42px]">
              The things people ask first.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
              Everything else lives on the{' '}
              <button onClick={() => navigate('/help')} className="text-zinc-300 underline underline-offset-4 transition hover:text-white">
                help page
              </button>
              .
            </p>
          </div>
          <div
            className="rounded-[22px] border border-white/[0.05] bg-white/[0.015] px-6"
            style={{ boxShadow: 'var(--border-glow)' }}
          >
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 border-t border-white/[0.04] bg-gradient-to-b from-[#060608] to-[#04040a] py-24">
        <div className="mx-auto max-w-[720px] px-6 text-center">
          <h2
            className="text-[36px] font-bold leading-[1.05] tracking-tight md:text-[52px] font-display"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, rgb(var(--primary-light)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Go make something.
          </h2>
          <p className="mt-5 text-[17px] text-zinc-400">
            Free account, full canvas, no card. The upgrade path is there when you want it.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-base font-bold text-black shadow-[0_0_30px_rgba(255,255,255,0.18)] transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              Create your account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-8 py-4 text-base font-semibold text-zinc-300 backdrop-blur-md transition-all hover:bg-white/[0.06]"
            >
              Peek the gallery
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#050507] px-6 py-8 md:px-8">
        <LegalFooter className="mx-auto max-w-[1400px]" />
      </footer>
    </div>
  )
}
