import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi, type PublicPlansPayload } from '@/lib/studioApi'

const defaultPlans: PublicPlansPayload = {
  featured_plan: 'pro',
  plans: [
    {
      id: 'free',
      label: 'Free',
      monthly_credits: 60,
      queue_priority: 'standard',
      max_resolution: '1024 x 1024',
      share_links: false,
      can_generate: true,
    },
    {
      id: 'pro',
      label: 'Pro',
      monthly_credits: 1200,
      queue_priority: 'priority',
      max_resolution: '2048 x 2048',
      share_links: true,
      can_generate: true,
    },
  ],
  top_ups: [
    { kind: 'top_up_small', label: 'Top up 250', credits: 250, price_usd: 9, plan: null },
    { kind: 'top_up_large', label: 'Top up 1200', credits: 1200, price_usd: 29, plan: null },
  ],
}

const atmosphereRows = [
  {
    motion: 'landing-drift-a',
    depthBlur: 1.05,
    opacity: 0.18,
    scale: 1.03,
    top: '5%',
    left: '-16%',
    items: [
      { src: '/atmosphere/atmosphere-05-desert-courtyard.png', width: '21rem', rotate: '-4deg', rise: '1.2rem', focus: '60% center' },
      { src: '/atmosphere/atmosphere-01-brutalist.png', width: '24rem', rotate: '2deg', rise: '2.9rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-04-snow-leopard.png', width: '20rem', rotate: '-2deg', rise: '0.2rem', focus: '68% center' },
      { src: '/atmosphere/atmosphere-02-conservatory.png', width: '23rem', rotate: '4deg', rise: '2.2rem', focus: 'center center' },
    ],
  },
  {
    motion: 'landing-drift-b',
    depthBlur: 0.3,
    opacity: 0.25,
    scale: 1,
    top: '24%',
    left: '-8%',
    items: [
      { src: '/atmosphere/atmosphere-03-skyline-garden.png', width: '25rem', rotate: '3deg', rise: '1.6rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-01-brutalist.png', width: '22rem', rotate: '-4deg', rise: '0rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-02-conservatory.png', width: '21rem', rotate: '2deg', rise: '2.2rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-05-desert-courtyard.png', width: '24rem', rotate: '-3deg', rise: '0.5rem', focus: '55% center' },
    ],
  },
  {
    motion: 'landing-drift-c',
    depthBlur: 1.45,
    opacity: 0.16,
    scale: 1.05,
    top: '49%',
    left: '-14%',
    items: [
      { src: '/atmosphere/atmosphere-04-snow-leopard.png', width: '22rem', rotate: '-5deg', rise: '2.7rem', focus: '72% center' },
      { src: '/atmosphere/atmosphere-03-skyline-garden.png', width: '24rem', rotate: '4deg', rise: '0.4rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-05-desert-courtyard.png', width: '23rem', rotate: '-2deg', rise: '2.1rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-01-brutalist.png', width: '20rem', rotate: '5deg', rise: '0.8rem', focus: 'center center' },
    ],
  },
  {
    motion: 'landing-drift-d',
    depthBlur: 0.2,
    opacity: 0.22,
    scale: 0.97,
    top: '71%',
    left: '-5%',
    items: [
      { src: '/atmosphere/atmosphere-02-conservatory.png', width: '21rem', rotate: '3deg', rise: '0.7rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-01-brutalist.png', width: '24rem', rotate: '-4deg', rise: '2.1rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-03-skyline-garden.png', width: '22rem', rotate: '2deg', rise: '0.9rem', focus: 'center center' },
      { src: '/atmosphere/atmosphere-04-snow-leopard.png', width: '20rem', rotate: '-3deg', rise: '2.6rem', focus: '66% center' },
    ],
  },
]

const heroAnchors = [
  {
    src: '/atmosphere/atmosphere-03-skyline-garden.png',
    width: '28rem',
    height: '17rem',
    top: '8%',
    right: '8%',
    rotate: '5deg',
    opacity: 0.32,
    blur: 0.1,
    focus: 'center center',
  },
  {
    src: '/atmosphere/atmosphere-05-desert-courtyard.png',
    width: '26rem',
    height: '15.5rem',
    top: '34%',
    right: '2%',
    rotate: '-4deg',
    opacity: 0.28,
    blur: 0.2,
    focus: '58% center',
  },
  {
    src: '/atmosphere/atmosphere-04-snow-leopard.png',
    width: '24rem',
    height: '15rem',
    top: '58%',
    right: '13%',
    rotate: '3deg',
    opacity: 0.24,
    blur: 0.4,
    focus: '68% center',
  },
]

const proofPoints = [
  'Sharper prompts before you spend credits.',
  'Fewer wasted generations and cleaner visual direction.',
  'Every strong result stays organized instead of disappearing into a feed.',
]

const capabilityLines = [
  ['Explore visual direction before you commit to a render.', 'References, moods, and composition signals stay easy to scan.'],
  ['Compose faster with stronger prompts and clearer model choices.', 'The interface stays simple while the output gets more polished.'],
  ['Keep every variation in one calm library instead of a mess of exports.', 'Collections, favorites, and trash stay easy to manage.'],
]

const workflowSteps = [
  ['Find the direction', 'Start with references, tones, and image energy before you generate.'],
  ['Write the prompt', 'Tighten the wording, improve it when needed, and choose the right ratio.'],
  ['Keep the best ones', 'Every result lands in Library so the work stays organized.'],
]

const useCases = ['Brand visuals', 'Product launches', 'Social content', 'Poster concepts', 'Editorial images', 'Stylized worlds']

const compareRows = [
  { label: 'Monthly credits', free: '60', pro: '1200' },
  { label: 'Generation pace', free: 'Standard', pro: 'Priority' },
  { label: 'Resolution ceiling', free: 'Core', pro: 'Higher' },
  { label: 'Share links', free: 'No', pro: 'Yes' },
]

function planSummary(planId: string) {
  if (planId === 'pro') {
    return 'Made for people creating often, moving faster, and pushing more polished output every week.'
  }

  return 'A clean way to step inside OmniaCreata and start creating without pressure.'
}

function AtmosphereRow({
  motion,
  top,
  left,
  depthBlur,
  opacity,
  scale,
  items,
}: {
  motion: string
  top: string
  left: string
  depthBlur: number
  opacity: number
  scale: number
  items: { src: string; width: string; rotate: string; rise: string; focus?: string }[]
}) {
  const repeated = [...items, ...items]

  return (
    <div
      className={`pointer-events-none absolute ${motion}`}
      style={{
        top,
        left,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div className="flex w-max gap-7">
        {repeated.map((item, index) => (
          <div
            key={`${item.src}-${index}`}
            className="relative overflow-hidden rounded-[34px] border border-white/[0.045] bg-white/[0.015] shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            style={{
              width: item.width,
              transform: `translateY(${item.rise}) rotate(${item.rotate})`,
            }}
          >
            <img
              src={item.src}
              alt=""
              aria-hidden="true"
              className="h-[13rem] w-full object-cover"
              style={{
                objectPosition: item.focus ?? 'center center',
                filter: `blur(${depthBlur}px) saturate(0.9) contrast(1) brightness(0.9)`,
              }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,26,0.02),rgba(7,17,26,0.14)_56%,rgba(7,17,26,0.24))]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useStudioAuth()
  const plansQuery = useQuery({
    queryKey: ['public-plans', 'landing'],
    queryFn: () => studioApi.getPublicPlans(),
  })
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 })

  const planData = plansQuery.data ?? defaultPlans
  const primaryCta = isAuthenticated ? '/studio' : '/signup'
  const primaryLabel = isAuthenticated ? 'Open Studio' : 'Enter OmniaCreata'

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#07111a] text-white"
      onPointerMove={(event) => {
        const x = event.clientX / window.innerWidth
        const y = event.clientY / window.innerHeight
        setPointer({ x, y })
      }}
    >
      <style>{`
        @keyframes landingDriftA {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-5.5%, 0, 0); }
        }
        @keyframes landingDriftB {
          0% { transform: translate3d(-3.5%, 0, 0); }
          100% { transform: translate3d(4.5%, 0, 0); }
        }
        @keyframes landingDriftC {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-4%, 0, 0); }
        }
        @keyframes landingDriftD {
          0% { transform: translate3d(-2.5%, 0, 0); }
          100% { transform: translate3d(5%, 0, 0); }
        }
        .landing-drift-a { animation: landingDriftA 66s linear infinite alternate; }
        .landing-drift-b { animation: landingDriftB 74s linear infinite alternate; }
        .landing-drift-c { animation: landingDriftC 82s linear infinite alternate; }
        .landing-drift-d { animation: landingDriftD 90s linear infinite alternate; }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-[34rem] w-[34rem] rounded-full bg-cyan-300/[0.07] blur-[180px]" />
        <div className="absolute right-[-6%] top-[16%] h-[26rem] w-[26rem] rounded-full bg-blue-300/[0.06] blur-[170px]" />
        <div className="absolute bottom-[-10%] left-[18%] h-[30rem] w-[30rem] rounded-full bg-indigo-300/[0.06] blur-[190px]" />

        <div
          className="absolute inset-0 transition-transform duration-700 ease-out"
          style={{
            transform: `translate3d(${(pointer.x - 0.5) * -16}px, ${(pointer.y - 0.5) * -10}px, 0) rotateX(${(pointer.y - 0.5) * 1.8}deg) rotateY(${(pointer.x - 0.5) * -2.4}deg)`,
          }}
        >
          {atmosphereRows.map((row) => (
            <AtmosphereRow key={`${row.motion}-${row.top}`} {...row} />
          ))}
          {heroAnchors.map((item) => (
            <div
              key={item.src}
              className="absolute overflow-hidden rounded-[38px] border border-white/[0.055] bg-white/[0.02] shadow-[0_38px_120px_rgba(0,0,0,0.28)]"
              style={{
                top: item.top,
                right: item.right,
                width: item.width,
                height: item.height,
                opacity: item.opacity,
                transform: `translate3d(${(pointer.x - 0.5) * -10}px, ${(pointer.y - 0.5) * -6}px, 0) rotate(${item.rotate})`,
              }}
            >
              <img
                src={item.src}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: item.focus,
                  filter: `blur(${item.blur}px) saturate(0.94) contrast(1.02) brightness(0.94)`,
                }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,26,0.03),rgba(7,17,26,0.16)_58%,rgba(7,17,26,0.28))]" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(120,196,255,0.11),transparent_20%),radial-gradient(circle_at_78%_24%,rgba(120,196,255,0.09),transparent_18%),linear-gradient(180deg,rgba(7,17,26,0.06),rgba(7,17,26,0.24)_26%,rgba(7,17,26,0.58)_62%,#07111a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,26,0.88),rgba(7,17,26,0.46)_30%,rgba(7,17,26,0.16)_64%,rgba(7,17,26,0.36)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col px-5 py-6 md:px-8 xl:px-10">
        <header className="flex items-center justify-between gap-6 py-4">
          <Link to="/landing" className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="#capabilities" className="transition hover:text-white">
              Capabilities
            </a>
            <a href="#workflow" className="transition hover:text-white">
              Workflow
            </a>
            <a href="#plans" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#use-cases" className="transition hover:text-white">
              Use cases
            </a>
            {!isAuthenticated ? (
              <Link to="/login" className="transition hover:text-white">
                Log in
              </Link>
            ) : null}
            <Link to={primaryCta} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
              {primaryLabel}
            </Link>
          </nav>
        </header>

        <section className="flex min-h-[calc(100vh-116px)] items-center py-10">
          <div className="max-w-[70rem]">
            <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">OmniaCreata Studio</div>
            <h1 className="mt-5 max-w-[64rem] text-5xl font-semibold tracking-[-0.075em] text-white md:text-7xl md:leading-[0.92] xl:text-[6.15rem]">
              Turn early ideas into premium visuals without the usual creative drag.
            </h1>
            <p className="mt-6 max-w-[44rem] text-base leading-8 text-zinc-300 md:text-lg">
              OmniaCreata gives you a calmer way to explore references, sharpen prompts, generate stronger images, and keep every version worth saving in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={primaryCta} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated ? (
                <Link to="/signup" className="rounded-full bg-white/[0.06] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.1]">
                  Start free
                </Link>
              ) : null}
            </div>

            <div className="mt-10 flex max-w-4xl flex-wrap gap-x-8 gap-y-4 border-t border-white/[0.08] pt-6">
              {proofPoints.map((line) => (
                <div key={line} className="flex min-w-[17rem] items-start gap-3 text-sm leading-7 text-zinc-300">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-white" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="capabilities" className="grid gap-10 border-t border-white/[0.08] py-14 lg:grid-cols-[0.74fr_1.26fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Capabilities</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              A premium image workflow should feel controlled, not crowded.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
              OmniaCreata is built to make visual work feel deliberate. You do less blind guessing, spend fewer wasted credits, and keep more of the output that actually matters.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {capabilityLines.map(([title, body], index) => (
              <div key={title} className="grid gap-3 py-5 md:grid-cols-[88px_minmax(0,1fr)]">
                <div className="text-sm font-medium text-zinc-600">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="grid gap-10 border-t border-white/[0.08] py-14 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Workflow</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              Find the direction. Tighten the prompt. Keep the results that deserve to stay.
            </h2>
          </div>

          <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {workflowSteps.map(([title, body], index) => (
              <div key={title} className="grid gap-3 py-5 md:grid-cols-[88px_minmax(0,1fr)]">
                <div className="text-sm font-medium text-zinc-600">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</div>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="plans" className="grid gap-10 border-t border-white/[0.08] py-14 lg:grid-cols-[0.66fr_1.34fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Pricing</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              Start free. Move into Pro when output volume, pace, and polish actually start to matter.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400">
              Free gets people inside the product. Pro opens more room, more credits, and faster movement. Top-ups stay available for teams that only need extra generation power from time to time.
            </p>
          </div>

          <div className="border-y border-white/[0.06]">
            <div className="grid grid-cols-[minmax(0,1.2fr)_140px_140px] gap-4 border-b border-white/[0.06] py-4 text-xs uppercase tracking-[0.22em] text-zinc-600">
              <div>Plan difference</div>
              <div>Free</div>
              <div>Pro</div>
            </div>
            {compareRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[minmax(0,1.2fr)_140px_140px] gap-4 border-b border-white/[0.06] py-4 text-sm text-zinc-300 last:border-b-0">
                <div>{row.label}</div>
                <div>{row.free}</div>
                <div className="text-white">{row.pro}</div>
              </div>
            ))}

            <div className="grid gap-8 py-6 lg:grid-cols-2">
              {planData.plans.map((plan) => (
                <div key={plan.id}>
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{plan.label}</div>
                  <div className="mt-1 text-sm text-zinc-500">{plan.id === 'pro' ? '$24 / month' : '$0'} - {plan.monthly_credits} monthly credits</div>
                  <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">{planSummary(plan.id)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] py-5">
              <div className="text-sm font-semibold text-white">Top-ups</div>
              <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-300">
                {planData.top_ups.map((topUp) => (
                  <div key={topUp.kind} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    <span>
                      {topUp.label} - {topUp.credits} credits - ${topUp.price_usd}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={isAuthenticated ? '/subscription' : '/signup'}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  {isAuthenticated ? 'Manage subscription' : 'Choose your start'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {!isAuthenticated ? (
                  <Link to="/signup" className="rounded-full bg-white/[0.06] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.1]">
                    Continue with Free
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section id="use-cases" className="grid gap-10 border-t border-white/[0.08] py-14 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Use cases</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
              Built for visual work people return to every week, not one-off novelty runs.
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4 text-base text-zinc-300 md:text-lg">
            {useCases.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-16">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Ready when you are</div>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white md:text-5xl">
                Step inside the Studio when you want the cleaner, faster version of the workflow.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
                The landing page sets the tone. The Studio is where the real image work begins.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link to={primaryCta} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90">
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated ? (
                <Link to="/login" className="rounded-full bg-white/[0.06] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.1]">
                  Log in
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <LegalFooter className="mt-auto pb-6" />
      </div>
    </div>
  )
}
