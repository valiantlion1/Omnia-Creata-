import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EmptyState, MetricCard, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

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
        <PageIntro
          eyebrow="Guest Demo"
          title="Dashboard unlocks once the creator identity is active."
          description="Guests can inspect the Studio shell, but project data, generation jobs, history, and media are reserved for signed-in creators."
        />
        <EmptyState
          title="Enter as a free creator"
          description="This demo sign-in uses the new Omnia identity path so we can test projects, jobs, quotas, and billing without wiring production auth yet."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia Creator')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue as Free Creator
            </button>
          }
        />
      </div>
    )
  }

  const projects = projectsQuery.data?.projects ?? []
  const generations = generationsQuery.data?.generations ?? []
  const latestGeneration = generations[0]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Dashboard"
        title="Recent work, live quota, and the fastest route back into creation."
        description="This view is intentionally project-first. It keeps the Studio flow focused on what was created recently, where margin is sitting, and which project should be resumed next."
        actions={
          <Link to="/billing" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
            Manage plan
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Projects" value={String(projects.length)} detail="Each generation now lands inside a project-scoped workspace instead of drifting in a disconnected gallery." />
        <MetricCard label="Credits remaining" value={String(auth?.credits.remaining ?? 0)} detail="Free and Pro quotas are enforced on the backend, so the dashboard can surface real remaining capacity." />
        <MetricCard label="Recent generations" value={String(generations.length)} detail="History and media are both driven from persistent generation outputs, not mock cards." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">New project</div>
              <h2 className="mt-2 text-xl font-semibold text-white">Kick off a fresh workspace</h2>
            </div>
            <StatusPill tone="brand">{auth?.plan.label}</StatusPill>
          </div>

          <div className="mt-6 space-y-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Campaign launch visuals"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
            <button
              onClick={() => createProjectMutation.mutate()}
              disabled={!title.trim() || createProjectMutation.isPending}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createProjectMutation.isPending ? 'Creating project...' : 'Create project'}
            </button>
          </div>

          {billingQuery.data ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Quota snapshot</div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-white">{billingQuery.data.credits.remaining}</div>
                <div className="text-sm text-zinc-400">credits currently available</div>
              </div>
              <div className="mt-3 text-sm text-zinc-400">
                Monthly allowance: {billingQuery.data.credits.monthly_allowance} and extra credits: {billingQuery.data.credits.extra_credits}
              </div>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Recent work</div>
                <h2 className="mt-2 text-xl font-semibold text-white">Resume where the last successful output landed.</h2>
              </div>
              {latestGeneration ? <StatusPill tone="success">{latestGeneration.status}</StatusPill> : null}
            </div>

            {latestGeneration ? (
              <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {latestGeneration.outputs[0] ? (
                    <img src={latestGeneration.outputs[0].thumbnail_url ?? latestGeneration.outputs[0].url} alt={latestGeneration.prompt_snapshot.prompt} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">Awaiting output</div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-white">{latestGeneration.prompt_snapshot.model}</div>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{latestGeneration.prompt_snapshot.prompt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone="brand">{latestGeneration.prompt_snapshot.width}x{latestGeneration.prompt_snapshot.height}</StatusPill>
                    <StatusPill tone="neutral">{latestGeneration.credit_cost} credits</StatusPill>
                    <StatusPill tone="neutral">{latestGeneration.provider}</StatusPill>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/projects/${latestGeneration.project_id}`} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90">
                      Open project
                    </Link>
                    <Link to={`/projects/${latestGeneration.project_id}/create`} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06]">
                      Create again
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="No generations yet" description="Create a project first, then jump into the canvas to produce the first image in this new Studio flow." />
            )}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Projects</div>
                <h2 className="mt-2 text-xl font-semibold text-white">Everything starts with a workspace.</h2>
              </div>
              <Link to="/history" className="text-sm text-zinc-300 transition hover:text-white">
                View history
              </Link>
            </div>

            {projects.length ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {projects.map((project) => (
                  <Link key={project.id} to={`/projects/${project.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-white/20 hover:bg-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-white">{project.title}</div>
                      <StatusPill tone="neutral">{new Date(project.updated_at).toLocaleDateString()}</StatusPill>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{project.description || 'No description yet.'}</p>
                    <div className="mt-4 text-sm text-cyan-200">Open workspace</div>
                  </Link>
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
