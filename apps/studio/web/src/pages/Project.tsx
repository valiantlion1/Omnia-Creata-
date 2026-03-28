import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'

import { EmptyState, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

export default function ProjectPage() {
  const { projectId = '' } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const [shareMessage, setShareMessage] = useState('')

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => studioApi.getProject(projectId),
    enabled: Boolean(projectId && canLoadPrivate),
  })

  const shareMutation = useMutation({
    mutationFn: () => studioApi.createShare({ project_id: projectId }),
    onSuccess: async (response) => {
      const shareUrl = `${window.location.origin}${response.url}`
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('Project share link copied to clipboard.')
    },
    onError: (error) => {
      setShareMessage(error instanceof Error ? error.message : 'Unable to create share link.')
    },
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading project...</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="Projects open after sign-in."
          description="Your images, history, and share links stay tied to your account, so guest mode only previews the shell."
          action={
            <button
              onClick={() => window.location.assign('/signup')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue with free access
            </button>
          }
        />
      </div>
    )
  }

  if (projectQuery.isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading project...</div>
  }

  if (!projectQuery.data) {
    return <div className="px-6 py-12 text-sm text-rose-300">Project not found.</div>
  }

  const { project, recent_generations: generations, recent_assets: assets } = projectQuery.data

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Project"
        title={project.title}
        description={project.description || 'A focused project for image production, history, and persistent media.'}
        actions={
          <>
            <Link to={`/create?projectId=${project.id}`} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
              Open Create
            </Link>
            <button
              onClick={() => shareMutation.mutate()}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
            >
              Create share link
            </button>
          </>
        }
      />

      {shareMessage ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{shareMessage}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Latest outputs</div>
              <h2 className="mt-2 text-xl font-semibold text-white">The project surface is now fed by real stored assets.</h2>
            </div>
            <Link to="/library/images" className="text-sm text-zinc-300 transition hover:text-white">
              Open library
            </Link>
          </div>

          {assets.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-square w-full object-cover" />
                  <div className="p-4">
                    <div className="text-sm font-semibold text-white">{asset.title}</div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{asset.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No assets in this project yet" description="The next completed render will land in this project automatically." />
          )}
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Generation history</div>
              <h2 className="mt-2 text-xl font-semibold text-white">Every run keeps its prompt snapshot attached.</h2>
            </div>
            <Link to="/library/images" className="text-sm text-zinc-300 transition hover:text-white">
              View all
            </Link>
          </div>

          {generations.length ? (
            <div className="mt-5 space-y-3">
              {generations.map((generation) => (
                <div key={generation.job_id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">{generation.model}</div>
                    <StatusPill tone={generation.status === 'completed' ? 'success' : generation.status === 'retryable_failed' ? 'warning' : generation.status === 'failed' ? 'danger' : 'brand'}>
                      {generation.status}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{generation.prompt_snapshot.prompt}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone="neutral">{generation.credit_cost} credits</StatusPill>
                    <StatusPill tone="neutral">{generation.prompt_snapshot.width}x{generation.prompt_snapshot.height}</StatusPill>
                    <StatusPill tone="neutral">{generation.provider}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No generations yet" description="Open Create and the first project job will show up here as soon as it is queued." />
          )}
        </Panel>
      </div>
    </div>
  )
}
