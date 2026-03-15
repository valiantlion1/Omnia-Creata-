import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { EmptyState, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

const aspectPresets = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '3:4': { width: 960, height: 1280 },
  '4:5': { width: 1024, height: 1280 },
}

export default function CreateCanvasPage() {
  const { projectId = '' } = useParams()
  const queryClient = useQueryClient()
  const { auth, signInDemo } = useStudioAuth()
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [model, setModel] = useState('flux-schnell')
  const [steps, setSteps] = useState(28)
  const [cfgScale, setCfgScale] = useState(6.5)
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '3:4' | '4:5'>('1:1')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => studioApi.getProject(projectId),
    enabled: Boolean(projectId && !auth?.guest),
  })

  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: () => studioApi.listModels(),
  })

  const presetsQuery = useQuery({
    queryKey: ['presets'],
    queryFn: () => studioApi.listPresets(),
  })

  const activeGenerationQuery = useQuery({
    queryKey: ['generation', activeJobId],
    queryFn: () => studioApi.getGeneration(activeJobId as string),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 1500
      return data.status === 'pending' || data.status === 'processing' ? 1500 : false
    },
  })

  const createGenerationMutation = useMutation({
    mutationFn: () =>
      studioApi.createGeneration({
        project_id: projectId,
        prompt,
        negative_prompt: negativePrompt,
        model,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        seed,
        aspect_ratio: aspectRatio,
      }),
    onSuccess: (generation) => {
      setActiveJobId(generation.job_id)
    },
  })

  useEffect(() => {
    const result = activeGenerationQuery.data
    if (!result) return
    if (result.status === 'completed' || result.status === 'failed' || result.status === 'retryable_failed') {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['generations'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['billing'] })
    }
  }, [activeGenerationQuery.data, projectId, queryClient])

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="The create canvas is gated behind creator access."
          description="That keeps real compute spend behind a registered identity while still allowing guests to inspect the Studio shell."
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

  const latestAsset = projectQuery.data?.recent_assets[0]
  const activeGeneration = activeGenerationQuery.data

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Create Canvas"
        title="Prompt, render, and save directly into the project workspace."
        description="This is the new V1 production heart: image generation only, cloud-first, and every output written back to project history and the media library."
        actions={
          <Link to={`/projects/${projectId}`} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]">
            Back to project
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="space-y-5">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Prompt</div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Describe the image you want to create..."
              className="mt-3 w-full rounded-[24px] border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Negative prompt</div>
            <textarea
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              rows={3}
              placeholder="Optional: what should the image avoid?"
              className="mt-3 w-full rounded-[24px] border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Model</div>
              <select value={model} onChange={(event) => setModel(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none">
                {(modelsQuery.data?.models ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label} ({entry.credit_cost} credits)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Seed</div>
              <input
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value) || 0)}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Presets</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(presetsQuery.data?.presets ?? []).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSteps(preset.defaults.steps)
                    setCfgScale(preset.defaults.cfg_scale)
                    const nextRatio = preset.defaults.aspect_ratio as keyof typeof aspectPresets
                    if (nextRatio in aspectPresets) {
                      setAspectRatio(nextRatio)
                      setWidth(aspectPresets[nextRatio].width)
                      setHeight(aspectPresets[nextRatio].height)
                    }
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-200 transition hover:bg-white/[0.08]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Aspect ratio</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(aspectPresets) as Array<keyof typeof aspectPresets>).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => {
                      setAspectRatio(ratio)
                      setWidth(aspectPresets[ratio].width)
                      setHeight(aspectPresets[ratio].height)
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${aspectRatio === ratio ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]'}`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Width</div>
                <input value={width} onChange={(event) => setWidth(Number(event.target.value) || 0)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Height</div>
                <input value={height} onChange={(event) => setHeight(Number(event.target.value) || 0)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Steps</div>
              <input value={steps} onChange={(event) => setSteps(Number(event.target.value) || 0)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">CFG</div>
              <input value={cfgScale} onChange={(event) => setCfgScale(Number(event.target.value) || 0)} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" />
            </div>
          </div>

          <button
            onClick={() => createGenerationMutation.mutate()}
            disabled={!prompt.trim() || createGenerationMutation.isPending}
            className="w-full rounded-[24px] bg-white px-5 py-4 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createGenerationMutation.isPending ? 'Queuing generation...' : 'Generate image'}
          </button>

          {createGenerationMutation.error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {createGenerationMutation.error instanceof Error ? createGenerationMutation.error.message : 'Unable to queue generation.'}
            </div>
          ) : null}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Live preview</div>
                <h2 className="mt-2 text-xl font-semibold text-white">The latest completed output becomes the project media asset.</h2>
              </div>
              {activeGeneration ? (
                <StatusPill tone={activeGeneration.status === 'completed' ? 'success' : activeGeneration.status === 'retryable_failed' ? 'warning' : activeGeneration.status === 'failed' ? 'danger' : 'brand'}>
                  {activeGeneration.status}
                </StatusPill>
              ) : null}
            </div>

            <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-black/30">
              {activeGeneration?.outputs[0] ? (
                <img src={activeGeneration.outputs[0].url} alt={activeGeneration.prompt_snapshot.prompt} className="aspect-[4/3] w-full object-cover" />
              ) : latestAsset ? (
                <img src={latestAsset.url} alt={latestAsset.title} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-500">Your next generation will appear here.</div>
              )}
            </div>

            {activeGeneration ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="neutral">{activeGeneration.model}</StatusPill>
                  <StatusPill tone="neutral">{activeGeneration.credit_cost} credits</StatusPill>
                  <StatusPill tone="neutral">{activeGeneration.provider}</StatusPill>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">{activeGeneration.prompt_snapshot.prompt}</p>
                {activeGeneration.error ? <div className="mt-3 text-sm text-rose-200">{activeGeneration.error}</div> : null}
              </div>
            ) : null}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-zinc-400">Project context</div>
                <h2 className="mt-2 text-xl font-semibold text-white">{projectQuery.data?.project.title ?? 'Current project'}</h2>
              </div>
              <Link to="/history" className="text-sm text-zinc-300 transition hover:text-white">
                Global history
              </Link>
            </div>

            {(projectQuery.data?.recent_generations ?? []).length ? (
              <div className="mt-5 space-y-3">
                {projectQuery.data?.recent_generations.slice(0, 4).map((generation) => (
                  <div key={generation.job_id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{generation.model}</div>
                      <StatusPill tone={generation.status === 'completed' ? 'success' : generation.status === 'failed' ? 'danger' : 'brand'}>
                        {generation.status}
                      </StatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{generation.prompt_snapshot.prompt}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No project jobs yet" description="Once the first generation is queued, the project context panel will track it here." />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
