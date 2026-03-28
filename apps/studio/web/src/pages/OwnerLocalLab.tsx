import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FolderOpen, RefreshCw, Wand2, X, Zap } from 'lucide-react'

import { AppPage, ButtonChip, PageHeader, Surface, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type Generation, type JobStatus } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

const aspectPresets = {
  '1:1': { width: 1024, height: 1024, label: 'Square' },
  '16:9': { width: 1280, height: 720, label: 'Landscape' },
  '4:5': { width: 1024, height: 1280, label: 'Editorial' },
} as const

const outputCountOptions = [1, 2] as const

type GenerationToast = {
  id: string
  title: string
  status: JobStatus
  outputCount: number
  model: string
  projectId: string
  error: string | null
  dismissed: boolean
}

function isTerminalStatus(status: JobStatus) {
  return status === 'completed' || status === 'failed' || status === 'retryable_failed'
}

function getToastTone(status: JobStatus): 'brand' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'retryable_failed') return 'warning'
  if (status === 'failed') return 'danger'
  return 'brand'
}

function getToastLabel(status: JobStatus) {
  switch (status) {
    case 'pending':
      return 'Generation started'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'retryable_failed':
      return 'Needs retry'
    case 'failed':
      return 'Failed'
    default:
      return 'Queued'
  }
}

function getToastDescription(job: GenerationToast) {
  if (job.status === 'completed') return 'Saved to Library / My Images.'
  if (job.status === 'processing' || job.status === 'pending') return 'Local ComfyUI render is running now.'
  return job.error || 'This run did not finish successfully.'
}

function mapGenerationToToast(generation: Generation, projectId: string): GenerationToast {
  return {
    id: generation.job_id,
    title: generation.title,
    status: generation.status,
    outputCount: generation.output_count,
    model: generation.model,
    projectId,
    error: generation.error,
    dismissed: false,
  }
}

export default function OwnerLocalLabPage() {
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isLoading, isAuthSyncing } = useStudioAuth()
  const isOwner = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)
  const canLoad = !isLoading && !isAuthSyncing && isAuthenticated && isOwner

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [model, setModel] = useState('')
  const [aspectRatio, setAspectRatio] = useState<keyof typeof aspectPresets>('1:1')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const [outputCount, setOutputCount] = useState<(typeof outputCountOptions)[number]>(1)
  const [modelOpen, setModelOpen] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [submittingCount, setSubmittingCount] = useState(0)
  const [generationToasts, setGenerationToasts] = useState<GenerationToast[]>([])

  const projectPromiseRef = useRef<Promise<string> | null>(null)

  const ownerLabQuery = useQuery({
    queryKey: ['owner-local-lab'],
    queryFn: () => studioApi.getOwnerLocalLabBootstrap(),
    enabled: canLoad,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const localModels = ownerLabQuery.data?.models ?? []
  const runtime = ownerLabQuery.data?.runtime
  const ownerLabError = ownerLabQuery.error instanceof Error ? ownerLabQuery.error.message : null
  const selectedModel = useMemo(() => localModels.find((entry) => entry.id === model) ?? localModels[0], [localModels, model])
  const runningJobs = useMemo(
    () => generationToasts.filter((job) => job.status === 'pending' || job.status === 'processing').length,
    [generationToasts],
  )
  const visibleToasts = useMemo(() => generationToasts.filter((job) => !job.dismissed), [generationToasts])

  useEffect(() => {
    if (!localModels.length) return
    if (!localModels.some((entry) => entry.id === model)) {
      setModel(localModels[0].id)
    }
  }, [localModels, model])

  useEffect(() => {
    if (!canLoad) return
    const pendingJobs = generationToasts.filter((job) => !isTerminalStatus(job.status))
    if (!pendingJobs.length) return

    const interval = window.setInterval(async () => {
      const snapshots = await Promise.all(
        pendingJobs.map(async (job) => {
          try {
            const generation = await studioApi.getGeneration(job.id)
            return [job.id, generation] as const
          } catch {
            return null
          }
        }),
      )

      const snapshotMap = new Map(snapshots.filter(Boolean) as Array<readonly [string, Generation]>)
      let invalidate = false

      setGenerationToasts((current) =>
        current
          .map((job) => {
            const snapshot = snapshotMap.get(job.id)
            if (!snapshot) return job

            if (!isTerminalStatus(job.status) && isTerminalStatus(snapshot.status)) {
              invalidate = true
            }

            return {
              ...job,
              title: snapshot.title,
              status: snapshot.status,
              outputCount: snapshot.output_count,
              model: snapshot.model,
              error: snapshot.error,
            }
          })
          .filter((job) => !(job.dismissed && isTerminalStatus(job.status))),
      )

      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: ['assets'] })
        await queryClient.invalidateQueries({ queryKey: ['generations'] })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }, 1500)

    return () => window.clearInterval(interval)
  }, [canLoad, generationToasts, queryClient])

  const ensureProjectId = useCallback(async () => {
    if (projectId) return projectId

    if (!projectPromiseRef.current) {
      projectPromiseRef.current = studioApi
        .createProject({
          title: 'Local Lab Sessions',
          description: 'Private local checkpoint testing',
        })
        .then((project) => {
          setProjectId(project.id)
          return project.id
        })
        .finally(() => {
          projectPromiseRef.current = null
        })
    }

    return projectPromiseRef.current
  }, [projectId])

  const dismissToast = useCallback((jobId: string) => {
    setGenerationToasts((current) =>
      current
        .map((job) => {
          if (job.id !== jobId) return job
          if (isTerminalStatus(job.status)) return null
          return { ...job, dismissed: true }
        })
        .filter(Boolean) as GenerationToast[],
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !selectedModel) return

    setCreateError(null)
    setSubmittingCount((value) => value + 1)

    try {
      const targetProjectId = await ensureProjectId()
      const generation = await studioApi.createGeneration({
        project_id: targetProjectId,
        prompt,
        negative_prompt: negativePrompt,
        model: selectedModel.id,
        width,
        height,
        steps: 28,
        cfg_scale: 6.5,
        seed,
        aspect_ratio: aspectRatio,
        output_count: outputCount,
      })

      setGenerationToasts((current) => [mapGenerationToToast(generation, targetProjectId), ...current.filter((job) => job.id !== generation.job_id)])
      setSeed(Math.floor(Math.random() * 1_000_000_000))

      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to run local generation.')
    } finally {
      setSubmittingCount((value) => Math.max(0, value - 1))
    }
  }, [aspectRatio, ensureProjectId, height, negativePrompt, outputCount, prompt, queryClient, seed, selectedModel, width])

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading local lab...</div>
  }

  if (!isOwner) {
    return (
      <AppPage className="max-w-[880px] gap-4 py-5">
        <PageHeader
          eyebrow="Owner"
          title="Local Lab"
          description="Private local checkpoint testing stays outside the public Studio flow."
          actions={
            <Link to="/settings" className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
              Open Settings
            </Link>
          }
        />
        <Surface tone="raised">
          <div className="text-sm leading-7 text-zinc-300">
            Local Lab is only available after owner mode is unlocked on this machine. Use Settings to enable it when you want to test ComfyUI and local checkpoints.
          </div>
        </Surface>
      </AppPage>
    )
  }

  return (
    <>
      <AppPage className="max-w-[980px] gap-4 py-5">
        <PageHeader
          eyebrow="Owner"
          title="Local Lab"
          description="Owner-only local test bench. Keep the main Studio cloud-first and use this page only for machine-level checkpoint checks."
          actions={
            <>
              <StatusPill tone={runtime?.status === 'healthy' ? 'success' : runtime?.status === 'disabled' ? 'neutral' : 'warning'}>
                {runtime?.status ?? 'unknown'}
              </StatusPill>
              {runningJobs ? <StatusPill tone="brand">{runningJobs} running</StatusPill> : null}
              <Link to="/library/images" className="inline-flex">
                <ButtonChip>My Images</ButtonChip>
              </Link>
            </>
          }
        />

        <Surface tone="muted" className="p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">Status</div>
              <div className="mt-2 text-sm font-semibold text-white">{runtime?.status ?? 'unknown'}</div>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">Discovered models</div>
              <div className="mt-2 text-sm font-semibold text-white">{runtime?.discovered_models ?? localModels.length}</div>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">ComfyUI</div>
              <div className="mt-2 truncate text-sm text-zinc-300">{runtime?.url ?? 'Not configured'}</div>
            </div>
            <div className="rounded-[20px] border border-white/[0.06] bg-black/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">Model directory</div>
              <div className="mt-2 truncate text-sm text-zinc-300">{runtime?.model_directory ?? 'Not configured'}</div>
            </div>
          </div>

          {ownerLabError ? (
            <div className="mt-3 rounded-[18px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-200">{ownerLabError}</div>
          ) : runtime?.detail ? (
            <div
              className={`mt-3 rounded-[18px] px-4 py-3 text-sm leading-6 ${
                runtime.available
                  ? 'border border-white/[0.06] bg-black/20 text-zinc-400'
                  : 'border border-amber-300/20 bg-amber-300/10 text-amber-100'
              }`}
            >
              {runtime.detail}
            </div>
          ) : null}
        </Surface>

        <Surface tone="raised" className="p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-600">Local generation</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Run a checkpoint on this machine</h2>
            </div>
            <Link to="/library/images" className="hidden md:inline-flex">
              <ButtonChip>
                <span className="inline-flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5" />
                  Open Library
                </span>
              </ButtonChip>
            </Link>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-[#0f1013] p-4 md:p-5">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Describe the image you want to generate..."
              className="w-full resize-none bg-transparent text-base leading-8 text-white outline-none placeholder:text-zinc-500"
            />
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">Negative prompt</div>
            <div className="rounded-[20px] border border-white/[0.08] bg-[#0f1013] px-4 py-3">
              <input
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                placeholder="Optional"
                className="w-full bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">Local model</div>
              <div className="relative">
                <button
                  onClick={() => setModelOpen((value) => !value)}
                  className="flex w-full items-center justify-between rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3.5 text-left transition hover:bg-black/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{selectedModel?.label ?? 'Select local model'}</div>
                    <div className="mt-1 text-xs text-zinc-500">{selectedModel?.source_id ?? 'Local checkpoint'}</div>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${modelOpen ? 'rotate-180' : ''}`} />
                </button>

                {modelOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-y-auto rounded-[20px] border border-white/[0.08] bg-[#111216] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    {localModels.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setModel(entry.id)
                          setModelOpen(false)
                        }}
                        className={`w-full px-4 py-3 text-left transition ${
                          entry.id === model ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="text-sm font-medium">{entry.label}</div>
                        <div className="mt-1 text-xs text-zinc-500">{entry.source_id ?? entry.description}</div>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {!ownerLabQuery.isLoading && !localModels.length ? (
                <div className="mt-2 text-xs leading-5 text-amber-100">
                  No local checkpoints were found yet. If they exist in `C:\AI\models\checkpoints`, refresh the backend and reopen Local Lab.
                </div>
              ) : null}
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">Variations</div>
              <div className="flex flex-wrap gap-2">
                {outputCountOptions.map((count) => (
                  <button key={count} onClick={() => setOutputCount(count)}>
                    <ButtonChip active={outputCount === count}>
                      {count} output{count > 1 ? 's' : ''}
                    </ButtonChip>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-zinc-600">Format</div>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(aspectPresets) as Array<[keyof typeof aspectPresets, (typeof aspectPresets)[keyof typeof aspectPresets]]>).map(([ratio, config]) => (
                <button
                  key={ratio}
                  onClick={() => {
                    setAspectRatio(ratio)
                    setWidth(config.width)
                    setHeight(config.height)
                  }}
                >
                  <ButtonChip active={aspectRatio === ratio}>
                    {ratio} - {config.label}
                  </ButtonChip>
                </button>
              ))}
            </div>
          </div>

          {createError ? (
            <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{createError}</div>
          ) : null}

          <div className="mt-5 flex flex-col gap-4 border-t border-white/[0.06] pt-5 md:flex-row md:items-center md:justify-between">
            <div className="text-sm leading-6 text-zinc-400">Runs save into Library / My Images so the main Create page stays clean.</div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || !selectedModel}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingCount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {submittingCount ? 'Starting...' : 'Run local test'}
              <span className="inline-flex items-center gap-1 text-black/65">
                <Zap className="h-4 w-4" />
                0
              </span>
            </button>
          </div>
        </Surface>
      </AppPage>

      {visibleToasts.length ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[360px] max-w-[calc(100vw-24px)] flex-col gap-3">
          {visibleToasts.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="pointer-events-auto rounded-[24px] border border-white/[0.08] bg-[#17181d]/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.4)] backdrop-blur"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{getToastLabel(job.status)}</div>
                  <div className="mt-2 line-clamp-2 text-sm font-semibold text-white">{job.title}</div>
                </div>
                <button
                  onClick={() => dismissToast(job.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 text-sm leading-6 text-zinc-400">{getToastDescription(job)}</div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusPill tone={getToastTone(job.status)}>{job.status}</StatusPill>
                <StatusPill tone="neutral">
                  {job.outputCount} output{job.outputCount > 1 ? 's' : ''}
                </StatusPill>
              </div>

              <div className="mt-4 flex items-center gap-3">
                {job.status === 'completed' ? (
                  <Link to="/library/images" className="text-sm font-medium text-white transition hover:text-zinc-200">
                    Open My Images
                  </Link>
                ) : null}
                {job.projectId ? (
                  <Link to={`/projects/${job.projectId}`} className="text-sm text-zinc-400 transition hover:text-white">
                    Open project
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
