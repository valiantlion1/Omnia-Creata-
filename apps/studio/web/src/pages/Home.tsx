import { Link } from 'react-router-dom'

import { EmptyState, MetricCard, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

const workflowCards = [
  {
    title: 'Project-first workspace',
    body: 'Start with a project, then keep every render, prompt snapshot, and asset version connected to the same creative thread.',
  },
  {
    title: 'Cloud-first image production',
    body: 'Studio is wired for managed generation. In development it falls back cleanly so the product stays usable while the paid path is configured.',
  },
  {
    title: 'Credits that protect margin',
    body: 'Free quota, Pro subscription, and top-up credits are part of the product flow from day one instead of being an afterthought.',
  },
]

export default function Home() {
  const { auth, isAuthenticated, signInDemo } = useStudioAuth()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
      <PageIntro
        eyebrow="Flagship Creative Suite"
        title="OmniaCreata Studio turns projects into a real AI production workflow."
        description="The Studio shell now follows one clear path: dashboard, projects, create canvas, history, media, and billing. Guests can explore. Registered creators get real jobs, real credits, and persistent outputs."
        actions={
          <>
            {isAuthenticated ? (
              <Link to="/dashboard" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                Open dashboard
              </Link>
            ) : (
              <button
                onClick={() => signInDemo('free', 'Omnia Creator')}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Continue as Free Creator
              </button>
            )}
            <Link to="/billing" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
              Review plans
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Identity" value={auth?.identity.display_name ?? 'Guest'} detail="One Omnia identity model with app-specific onboarding and billing boundaries." />
        <MetricCard label="Plan" value={auth?.plan.label ?? 'Guest'} detail="Guest browse mode is open. Image generation unlocks once the creator identity is active." />
        <MetricCard label="Credits" value={String(auth?.credits.remaining ?? 0)} detail="Backend-enforced quota is already in the Studio flow, so cost control is part of the core product." />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel className="overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Product direction</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">Cinematic creative tooling with real persistence</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">
                Studio is no longer framed as a floating prompt toy. It is moving toward a true creator workspace where projects,
                assets, generation jobs, history, credits, and subscription state all share the same backbone.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <StatusPill tone="brand">Dashboard</StatusPill>
                <StatusPill tone="brand">Project</StatusPill>
                <StatusPill tone="brand">Create Canvas</StatusPill>
                <StatusPill tone="brand">History</StatusPill>
                <StatusPill tone="brand">Media Library</StatusPill>
                <StatusPill tone="brand">Billing</StatusPill>
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/30 p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">V1 shipping focus</div>
              <div className="mt-4 space-y-4">
                {workflowCards.map((card) => (
                  <div key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Current access mode</div>
          <h2 className="mt-3 text-2xl font-semibold text-white">Launch with guest browsing, then unlock production.</h2>
          <p className="mt-3 text-sm leading-7 text-zinc-300">
            This keeps the product visible while still protecting provider spend. Free creators receive a limited monthly quota, Pro unlocks higher limits and share links, and extra credits cover bursts.
          </p>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <div className="text-sm font-semibold text-emerald-100">Guest</div>
              <div className="mt-1 text-sm text-emerald-50/80">Explore the product, inspect workflows, and understand the value before signing in.</div>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <div className="text-sm font-semibold text-cyan-100">Free Creator</div>
              <div className="mt-1 text-sm text-cyan-50/80">Monthly quota, standard queue, and core image generation.</div>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
              <div className="text-sm font-semibold text-amber-100">Pro</div>
              <div className="mt-1 text-sm text-amber-50/80">Higher limits, premium models, and project or asset share links.</div>
            </div>
          </div>
        </Panel>
      </div>

      {!isAuthenticated ? (
        <EmptyState
          title="Activate a creator identity to see the full workspace."
          description="Dashboard, project creation, image generation, history, media persistence, and billing all come online after a quick demo sign-in."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia Creator')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Start in free mode
            </button>
          }
        />
      ) : null}
    </div>
  )
}
