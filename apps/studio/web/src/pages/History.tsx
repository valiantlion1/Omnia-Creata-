import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { EmptyState, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

export default function HistoryPage() {
  const { auth, isAuthenticated, isLoading, signInDemo } = useStudioAuth()
  const generationsQuery = useQuery({
    queryKey: ['generations'],
    queryFn: () => studioApi.listGenerations(),
    enabled: isAuthenticated,
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading history...</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="History is private until creator mode is active."
          description="This page is built from persistent generation jobs, so it opens only for signed-in creators."
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

  const generations = generationsQuery.data?.generations ?? []

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="History"
        title="Every generation keeps its prompt snapshot, status, model, and output."
        description="This replaces the old floating gallery logic with real job persistence, which means reload-safe polling and a single truth source for the media library."
      />

      <Panel>
        {generations.length ? (
          <div className="space-y-4">
            {generations.map((generation) => (
              <div key={generation.job_id} className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4 md:grid-cols-[200px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  {generation.outputs[0] ? (
                    <img src={generation.outputs[0].thumbnail_url ?? generation.outputs[0].url} alt={generation.prompt_snapshot.prompt} className="aspect-square h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-sm text-zinc-500">No output yet</div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={generation.status === 'completed' ? 'success' : generation.status === 'retryable_failed' ? 'warning' : generation.status === 'failed' ? 'danger' : 'brand'}>
                      {generation.status}
                    </StatusPill>
                    <StatusPill tone="neutral">{generation.model}</StatusPill>
                    <StatusPill tone="neutral">{generation.credit_cost} credits</StatusPill>
                    <StatusPill tone="neutral">{generation.provider}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">{generation.prompt_snapshot.prompt}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-400">
                    <span>
                      Project: <Link to={`/projects/${generation.project_id}`} className="text-cyan-200">{generation.project_id.slice(0, 8)}</Link>
                    </span>
                    <span>Size: {generation.prompt_snapshot.width}x{generation.prompt_snapshot.height}</span>
                    <span>Seed: {generation.prompt_snapshot.seed}</span>
                  </div>
                  {generation.error ? <div className="mt-3 text-sm text-rose-200">{generation.error}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No generation history yet" description="Create a project, run the first image job, and history will become the reliable source for every result." />
        )}
      </Panel>
    </div>
  )
}
