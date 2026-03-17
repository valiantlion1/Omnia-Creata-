import { motion } from 'framer-motion'
import { ArrowRight, Camera, CreditCard, LibraryBig, Sparkles, Wand2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { EmptyState, MetricCard, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

const featureCards = [
  {
    icon: Sparkles,
    title: 'Project-led creative flow',
    body: 'Each render belongs to a project, which means history, media, and future revisions stay stitched together instead of drifting into separate demos.',
    accent: 'from-cyan-400/25 via-sky-400/15 to-transparent',
  },
  {
    icon: Wand2,
    title: 'Cloud-first image production',
    body: 'The UX now assumes a real managed pipeline first, then falls back gracefully in development so creators can keep moving while infrastructure catches up.',
    accent: 'from-amber-300/25 via-orange-300/15 to-transparent',
  },
  {
    icon: CreditCard,
    title: 'Margin-aware product design',
    body: 'Guest access, free quota, Pro, and top-up credits are visible in the product instead of being bolted on later.',
    accent: 'from-emerald-300/25 via-lime-300/15 to-transparent',
  },
]

const flowSteps = [
  { index: '01', title: 'Open a project', text: 'Start from a workspace instead of a loose prompt box.' },
  { index: '02', title: 'Compose the generation', text: 'Prompt, model, aspect ratio, and render settings live inside the create canvas.' },
  { index: '03', title: 'Save into history + media', text: 'Every finished output is persisted once and then reused across history, media, and share flows.' },
]

const pricingCards = [
  {
    name: 'Guest',
    price: 'Explore',
    description: 'Browse the product and understand the workflow before spending anything.',
    tone: 'border-white/10 bg-white/[0.04]',
    points: ['Public browse', 'Preview the flow', 'No generation spend'],
  },
  {
    name: 'Free Creator',
    price: 'Monthly quota',
    description: 'Ideal for testing the platform and producing early concept work.',
    tone: 'border-cyan-300/20 bg-cyan-300/10',
    points: ['Real image generation', 'Standard queue', 'Managed credit ceiling'],
  },
  {
    name: 'Pro',
    price: 'Subscription + top-ups',
    description: 'Higher ceilings, premium models, and share links for production output.',
    tone: 'border-amber-300/20 bg-amber-300/10',
    points: ['Higher limits', 'Premium models', 'Project and asset share links'],
  },
]

const heroStats = [
  { label: 'Workspace model', value: 'Project -> Create -> History' },
  { label: 'Current launch focus', value: 'Image generation only' },
  { label: 'Monetization model', value: 'Quota + subscription + credits' },
]

export default function Home() {
  const { auth, isAuthenticated, signInDemo } = useStudioAuth()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,14,24,0.96),rgba(8,10,18,0.88))] px-6 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:px-8 md:py-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[5%] top-[8%] h-44 w-44 rounded-full bg-cyan-300/15 blur-[95px]" />
          <div className="absolute right-[8%] top-[12%] h-56 w-56 rounded-full bg-amber-300/15 blur-[110px]" />
          <div className="absolute bottom-[-8%] left-[24%] h-52 w-52 rounded-full bg-fuchsia-300/10 blur-[115px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)]" />
        </div>

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Flagship Creative Suite
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]"
            >
              OmniaCreata Studio now feels like a real creative product, not a floating prototype.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base"
            >
              The new shell keeps the product path clear: dashboard, project, create canvas, history, media, and billing.
              Now we can bring back the stronger CTA energy and premium launch feel without losing the new architecture underneath.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="mt-7 flex flex-wrap gap-3"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] hover:opacity-90"
                >
                  Open dashboard
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              ) : (
                <button
                  onClick={() => signInDemo('free', 'Omnia Creator')}
                  className="group inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] hover:opacity-90"
                >
                  Continue as Free Creator
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              )}
              <Link to="/billing" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
                Review plans
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-8 grid gap-3 md:grid-cols-3"
            >
              {heroStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-white">{item.value}</div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="relative min-h-[420px]"
          >
            <div className="absolute inset-0 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-full flex-col gap-4 rounded-[26px] border border-white/10 bg-[#060911]/90 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Live canvas preview</div>
                    <div className="mt-1 text-lg font-semibold text-white">Studio launch board</div>
                  </div>
                  <StatusPill tone="brand">Image V1</StatusPill>
                </div>

                <div className="grid flex-1 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,26,43,0.95),rgba(10,14,22,0.95))] p-4">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
                        <Camera className="h-4 w-4 text-cyan-200" />
                        Project hero render
                      </div>
                      <div className="text-xs text-zinc-500">1024x1024</div>
                    </div>
                    <div className="mt-4 aspect-[4/3] overflow-hidden rounded-[20px] border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.35),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(251,191,36,0.35),transparent_25%),linear-gradient(145deg,rgba(15,23,42,0.96),rgba(9,12,20,0.96))]">
                      <div className="flex h-full flex-col justify-between p-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
                          <span className="text-xs uppercase tracking-[0.2em] text-emerald-100">Generation ready</span>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur">
                          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Prompt snapshot</div>
                          <div className="mt-2 text-sm leading-6 text-zinc-100">
                            Cinematic product portrait of a chrome fragrance bottle, reflective obsidian, premium editorial rim light.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/10 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">Current identity</div>
                      <div className="mt-2 text-xl font-semibold text-cyan-50">{auth?.identity.display_name ?? 'Guest mode'}</div>
                      <div className="mt-2 text-sm leading-6 text-cyan-50/80">
                        {auth?.guest ? 'Browsing only until creator mode is activated.' : 'Creator workspace is active and ready for real jobs.'}
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-amber-300/15 bg-amber-300/10 p-4">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-amber-100/70">Credit posture</div>
                      <div className="mt-2 text-3xl font-semibold text-amber-50">{auth?.credits.remaining ?? 0}</div>
                      <div className="mt-2 text-sm leading-6 text-amber-50/80">Visible quota keeps the product premium without losing cost discipline.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Identity" value={auth?.identity.display_name ?? 'Guest'} detail="One Omnia identity model with app-specific onboarding and billing boundaries." />
        <MetricCard label="Plan" value={auth?.plan.label ?? 'Guest'} detail="Guest browse mode is open. Image generation unlocks once the creator identity is active." />
        <MetricCard label="Credits" value={String(auth?.credits.remaining ?? 0)} detail="Backend-enforced quota is already in the Studio flow, so cost control is part of the core product." />
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Why this direction works</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">The product now sells itself with the interface.</h2>
            </div>
            <StatusPill tone="brand">OmniaCreata vibe</StatusPill>
          </div>
          <div className="mt-6 grid gap-4">
            {featureCards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.35, delay: index * 0.08 }}
                  className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-black/25 p-5"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${card.accent} opacity-0 transition duration-300 group-hover:opacity-100`} />
                  <div className="relative z-10 flex gap-4">
                    <div className="mt-1 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">{card.body}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Panel>

        <Panel>
          <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Launch flow</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">A sharper V1 path makes the whole studio feel more expensive.</h2>
          <div className="mt-6 space-y-4">
            {flowSteps.map((step) => (
              <div key={step.index} className="grid grid-cols-[56px_1fr] gap-4 rounded-[24px] border border-white/10 bg-black/25 p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-lg font-semibold text-white">
                  {step.index}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[26px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,14,22,0.96),rgba(7,24,33,0.94))] p-5">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-white">
              <LibraryBig className="h-4 w-4 text-cyan-200" />
              What changed from the old feel
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              The old landing had energy, but it was mostly presentation. The new direction keeps that energy while making every CTA land in a real system with projects, jobs, media, and billing behind it.
            </p>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Membership system</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">The monetization model should feel premium, not apologetic.</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            Instead of hiding pricing until late, Studio can use the interface itself as positioning. The CTA pages should show exactly why free exists, why Pro matters, and how credits support real creative output.
          </p>
          <div className="mt-6 grid gap-4">
            {pricingCards.map((card) => (
              <div key={card.name} className={`rounded-[24px] border p-5 ${card.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{card.name}</div>
                  <div className="text-sm font-medium text-white/90">{card.price}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{card.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.points.map((point) => (
                    <StatusPill key={point} tone="neutral">
                      {point}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {isAuthenticated ? (
          <Panel className="overflow-hidden">
            <div className="flex h-full flex-col justify-between rounded-[24px] border border-white/10 bg-[linear-gradient(140deg,rgba(7,22,28,0.96),rgba(10,14,22,0.92))] p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-100">
                  Creator mode active
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-white">You already have the new shell. Now let’s make it feel elite.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
                  Dashboard, project, create canvas, history, media, and billing are now connected. The next UI pass can push motion, polish, and richer interaction even further.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                  Open dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/media" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
                  Open media library
                </Link>
              </div>
            </div>
          </Panel>
        ) : (
          <EmptyState
            title="Activate a creator identity to open the full workspace."
            description="Dashboard, project creation, image generation, history, media persistence, and billing all come online after a quick demo sign-in."
            action={
              <button
                onClick={() => signInDemo('free', 'Omnia Creator')}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Start in free mode
                <ArrowRight className="h-4 w-4" />
              </button>
            }
          />
        )}
      </section>
    </div>
  )
}
