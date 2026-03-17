import { motion } from 'framer-motion'
import { ArrowRight, FolderPlus, Layers3, Play, Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EmptyState, MetricCard, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

function CreditProgress({ value, total }: { value: number; total: number }) {
  const progress = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-500">
        <span>Available quota</span>
        <span>{value} / {total}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(103,232,249,0.95),rgba(251,191,36,0.95))]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isLoading, signInDemo } = useStudioAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => studioApi.listProjects(),
    enabled: isAuthenticated,
  })

  const generationsQuery = useQuery({
    queryKey: ['generations'],
    queryFn: () => studioApi.listGenerations(),
    enabled: isAuthenticated,
  })

  const billingQuery = useQuery({
    queryKey: ['billing'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: isAuthenticated,
  })

  const createProjectMutation = useMutation({
    mutationFn: () => studioApi.createProject({ title, description }),
    onSuccess: async (project) => {
      setTitle('')
      setDescription('')
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/projects/${project.id}`)
    },
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading dashboard...</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,14,24,0.96),rgba(7,10,18,0.9))] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            Guest Demo
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white">Dashboard opens fully once creator mode is active.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
            The public shell stays browseable, but projects, generation history, media, and billing belong to the signed-in creator experience.
          </p>
          <div className="mt-7">
            <button
              onClick={() => signInDemo('free', 'Omnia Creator')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue as Free Creator
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const projects = projectsQuery.data?.projects ?? []
  const generations = generationsQuery.data?.generations ?? []
  const latestGeneration = generations[0]
  const billing = billingQuery.data
  const monthlyTotal = billing?.credits.monthly_allowance ?? 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(9,14,24,0.96),rgba(7,10,18,0.88))] px-6 py-7 shadow-[0_30px_120px_rgba(0,0,0,0.34)] md:px-8 md:py-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-[8%] h-40 w-40 rounded-full bg-cyan-300/15 blur-[100px]" />
          <div className="absolute right-[12%] top-[18%] h-48 w-48 rounded-full bg-amber-300/15 blur-[110px]" />
          <div className="absolute bottom-[-10%] left-[35%] h-44 w-44 rounded-full bg-fuchsia-300/10 blur-[110px]" />
        </div>

        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Dashboard
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Welcome back, {auth?.identity.display_name}. The studio now feels alive, not static.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
                This dashboard is designed to feel like a command surface: clear quota visibility, faster project entry, and immediate access to the latest creative output.
              </p>
            </motion.div>

            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  <Layers3 className="h-3.5 w-3.5" />
                  Projects
                </div>
                <div className="mt-4 text-3xl font-semibold text-white">{projects.length}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">Project-first structure keeps creative work organized from the start.</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  <Play className="h-3.5 w-3.5" />
                  Generations
                </div>
                <div className="mt-4 text-3xl font-semibold text-white">{generations.length}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">History is now tied to real jobs instead of placeholder gallery state.</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  <Wallet className="h-3.5 w-3.5" />
                  Plan
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{auth?.plan.label}</div>
                <div className="mt-2 text-sm leading-6 text-zinc-400">Billing is part of the product feel, not hidden behind a later phase.</div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[30px] border border-white/10 bg-[linear-gradient(160deg,rgba(10,16,28,0.95),rgba(6,9,16,0.95))] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Creative posture</div>
                <div className="mt-2 text-xl font-semibold text-white">{billing?.plan.label ?? auth?.plan.label}</div>
              </div>
              <StatusPill tone="brand">{billing?.subscription_status ?? 'active'}</StatusPill>
            </div>

            <CreditProgress value={billing?.credits.remaining ?? auth?.credits.remaining ?? 0} total={monthlyTotal} />

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Link to="/billing" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white transition hover:bg-white/[0.08]">
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Manage plan</div>
                <div className="mt-2 font-semibold">Upgrade or top up credits</div>
              </Link>
              <Link to="/history" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white transition hover:bg-white/[0.08]">
                <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Recent work</div>
                <div className="mt-2 font-semibold">Jump straight into generation history</div>
              </Link>
            </div>

            <div className="mt-5 rounded-[24px] border border-amber-300/15 bg-amber-300/10 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-amber-100/70">Launch note</div>
              <p className="mt-2 text-sm leading-6 text-amber-50/80">
                The interface is now carrying more of the product narrative: creator confidence, quota awareness, and fast return-to-work momentum.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Projects" value={String(projects.length)} detail="Each generation now lands inside a project-scoped workspace instead of drifting in a disconnected gallery." />
        <MetricCard label="Credits remaining" value={String(auth?.credits.remaining ?? 0)} detail="Free and Pro quotas are enforced on the backend, so the dashboard can surface real remaining capacity." />
        <MetricCard label="Recent generations" value={String(generations.length)} detail="History and media are both driven from persistent generation outputs, not mock cards." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">New project</div>
              <h2 className="mt-2 text-2xl font-semibold text-white">Give the next idea a proper workspace.</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-white">
              <FolderPlus className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Campaign launch visuals"
              className="w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
              rows={4}
              className="w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
            <button
              onClick={() => createProjectMutation.mutate()}
              disabled={!title.trim() || createProjectMutation.isPending}
              className="w-full rounded-[22px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createProjectMutation.isPending ? 'Creating project...' : 'Create project'}
            </button>
          </div>

          {billing ? (
            <div className="mt-6 rounded-[24px] border border-white/10 bg-[linear-gradient(140deg,rgba(11,16,24,0.96),rgba(6,24,31,0.9))] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Quota snapshot</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{billing.credits.remaining} credits ready</div>
                </div>
                <StatusPill tone="brand">{billing.plan.label}</StatusPill>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Monthly allowance {billing.credits.monthly_allowance}, extra credits {billing.credits.extra_credits}. This makes spend visible while the creator is still deciding what to render next.
              </p>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Spotlight output</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Resume from the latest successful generation.</h2>
              </div>
              {latestGeneration ? <StatusPill tone="success">{latestGeneration.status}</StatusPill> : null}
            </div>

            {latestGeneration ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                  {latestGeneration.outputs[0] ? (
                    <img src={latestGeneration.outputs[0].thumbnail_url ?? latestGeneration.outputs[0].url} alt={latestGeneration.prompt_snapshot.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-zinc-500">Awaiting output</div>
                  )}
                </div>
                <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(140deg,rgba(11,16,24,0.96),rgba(7,22,28,0.94))] p-5">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="brand">{latestGeneration.prompt_snapshot.model}</StatusPill>
                    <StatusPill tone="neutral">{latestGeneration.credit_cost} credits</StatusPill>
                    <StatusPill tone="neutral">{latestGeneration.provider}</StatusPill>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-zinc-200">{latestGeneration.prompt_snapshot.prompt}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Resolution</div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        {latestGeneration.prompt_snapshot.width}x{latestGeneration.prompt_snapshot.height}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Seed</div>
                      <div className="mt-2 text-lg font-semibold text-white">{latestGeneration.prompt_snapshot.seed}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/projects/${latestGeneration.project_id}`} className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
                      Open project
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link to={`/projects/${latestGeneration.project_id}/create`} className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.06]">
                      Create again
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No generations yet" description="Create a project first, then jump into the canvas to produce the first image in this Studio flow." />
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Projects</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Everything starts with a workspace.</h2>
              </div>
              <Link to="/history" className="text-sm text-zinc-300 transition hover:text-white">
                View history
              </Link>
            </div>

            {projects.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.35, delay: index * 0.06 }}
                  >
                    <Link
                      to={`/projects/${project.id}`}
                      className="group block rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(10,14,22,0.92),rgba(8,20,26,0.86))] p-5 transition hover:border-cyan-300/20 hover:shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-lg font-semibold text-white">{project.title}</div>
                        <StatusPill tone="neutral">{new Date(project.updated_at).toLocaleDateString()}</StatusPill>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{project.description || 'No description yet.'}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200">
                        Open workspace
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No projects yet" description="The dashboard is ready. Create the first workspace and the rest of the Studio flow lights up automatically." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
