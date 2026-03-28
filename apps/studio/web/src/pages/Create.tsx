import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, RefreshCw, Sparkles, Wand2, X } from 'lucide-react'

import { AppPage, ButtonChip, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type Generation, type JobStatus, type ModelCatalogEntry } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

const aspectPresets = {
  '1:1': { width: 1024, height: 1024, label: 'Square' },
  '16:9': { width: 1280, height: 720, label: 'Landscape' },
  '4:5': { width: 1024, height: 1280, label: 'Portrait' },
  '3:4': { width: 960, height: 1280, label: 'Vertical' },
} as const

type GenerationToast = {
  id: string
  title: string
  status: JobStatus
  outputCount: number
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
  if (job.status === 'processing' || job.status === 'pending') return 'Your image is being rendered.'
  return job.error || 'This run did not finish successfully.'
}

function mapGenerationToToast(generation: Generation, projectId: string): GenerationToast {
  return {
    id: generation.job_id,
    title: generation.title,
    status: generation.status,
    outputCount: generation.output_count,
    projectId,
    error: generation.error,
    dismissed: false,
  }
}

function sortModels(models: ModelCatalogEntry[], canUseLocal: boolean) {
  return [...models]
    .filter((entry) => !entry.owner_only || canUseLocal)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.credit_cost - b.credit_cost)
}

function getModelCostLabel(model: ModelCatalogEntry | undefined) {
  if (!model) return 'Select a model'
  if (model.runtime === 'local') return 'Local runtime'
  return `${model.credit_cost} credits`
}

function getModelCostSummary(model: ModelCatalogEntry | undefined, width: number, height: number) {
  if (!model) return `${width} x ${height}`
  if (model.runtime === 'local') return `Local runtime · no credit spend · ${width} x ${height}`
  return `Cost ${model.credit_cost} credits · ${width} x ${height}`
}

export default function CreatePage() {
  const queryClient = useQueryClient()
  const { projectId: routeProjectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()

  const requestedProjectId = routeProjectId ?? searchParams.get('projectId')
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const canUseLocalModels = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)

  const [prompt, setPrompt] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [aspectRatio, setAspectRatio] = useState<keyof typeof aspectPresets>('1:1')
  const [submittingCount, setSubmittingCount] = useState(0)
  const [createError, setCreateError] = useState<string | null>(null)
  const [improveState, setImproveState] = useState<'idle' | 'working' | 'done' | 'fallback'>('idle')
  const [generationToasts, setGenerationToasts] = useState<GenerationToast[]>([])
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(requestedProjectId ?? null)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  const projectPromiseRef = useRef<Promise<string> | null>(null)
  const modelPickerRef = useRef<HTMLDivElement | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['models', 'create'],
    queryFn: () => studioApi.listModels(),
    enabled: canLoadPrivate,
  })

  const models = useMemo(
    () => sortModels(modelsQuery.data?.models ?? [], canUseLocalModels),
    [canUseLocalModels, modelsQuery.data],
  )
  const selectedModel = useMemo(() => models.find((entry) => entry.id === selectedModelId) ?? models[0], [models, selectedModelId])
  const visibleToasts = useMemo(() => generationToasts.filter((job) => !job.dismissed), [generationToasts])
  const runningJobs = useMemo(
    () => generationToasts.filter((job) => job.status === 'pending' || job.status === 'processing').length,
    [generationToasts],
  )
  const runtimeCredits = auth?.credits.remaining ?? 0
  const activeAspect = aspectPresets[aspectRatio]

  useEffect(() => {
    if (!models.length) return
    if (!models.some((entry) => entry.id === selectedModelId)) {
      setSelectedModelId(models[0].id)
    }
  }, [models, selectedModelId])

  useEffect(() => {
    if (!requestedProjectId) return
    setResolvedProjectId(requestedProjectId)
  }, [requestedProjectId])

  useEffect(() => {
    const nextPrompt = searchParams.get('prompt')
    const nextModel = searchParams.get('model')
    const nextAspect = searchParams.get('aspect_ratio') as keyof typeof aspectPresets | null

    if (nextPrompt) setPrompt(nextPrompt)
    if (nextModel) setSelectedModelId(nextModel)
    if (nextAspect && nextAspect in aspectPresets) setAspectRatio(nextAspect)
  }, [searchParams])

  useEffect(() => {
    if (!searchParams.has('tool')) return
    const next = new URLSearchParams(searchParams)
    next.delete('tool')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!modelPickerRef.current) return
      if (modelPickerRef.current.contains(event.target as Node)) return
      setModelPickerOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!canLoadPrivate) return
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
  }, [canLoadPrivate, generationToasts, queryClient])

  useEffect(() => {
    setModelPickerOpen(false)
  }, [selectedModelId])

  const ensureProjectId = useCallback(async () => {
    if (resolvedProjectId) return resolvedProjectId

    if (!projectPromiseRef.current) {
      projectPromiseRef.current = studioApi
        .createProject({
          title: 'New image set',
          description: 'Created from Studio Create',
        })
        .then((project) => {
          setResolvedProjectId(project.id)
          return project.id
        })
        .finally(() => {
          projectPromiseRef.current = null
        })
    }

    return projectPromiseRef.current
  }, [resolvedProjectId])

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

  const handleImprovePrompt = useCallback(async () => {
    if (!prompt.trim()) return

    setImproveState('working')
    try {
      const response = await studioApi.improvePrompt({ prompt })
      setPrompt(response.prompt)
      setImproveState(response.used_llm ? 'done' : 'fallback')
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Prompt could not be improved.')
      setImproveState('idle')
    }
  }, [prompt])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !selectedModel) return

    setCreateError(null)
    setSubmittingCount((value) => value + 1)

    try {
      const projectId = await ensureProjectId()
      const generation = await studioApi.createGeneration({
        project_id: projectId,
        prompt,
        negative_prompt: '',
        model: selectedModel.id,
        width: activeAspect.width,
        height: activeAspect.height,
        steps: 28,
        cfg_scale: 6.5,
        seed: Math.floor(Math.random() * 1_000_000_000),
        aspect_ratio: aspectRatio,
        output_count: 1,
      })

      setGenerationToasts((current) => [mapGenerationToToast(generation, projectId), ...current.filter((job) => job.id !== generation.job_id)])
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Generation could not be started.')
    } finally {
      setSubmittingCount((value) => Math.max(0, value - 1))
    }
  }, [activeAspect.height, activeAspect.width, aspectRatio, ensureProjectId, prompt, queryClient, selectedModel])

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading compose...</div>
  }

  if (!isAuthenticated || auth?.guest) {
    return (
      <AppPage className="max-w-[1040px] py-8">
        <section className="px-2 py-8 md:px-4">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Compose</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Write the prompt, choose the model, pick the ratio, generate. The result lands in Library automatically.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/signup" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90">
              Start free
            </Link>
            <Link to="/login" className="rounded-full bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">
              Log in
            </Link>
          </div>
        </section>
      </AppPage>
    )
  }

  return (
    <>
      <AppPage className="h-full max-w-[1180px] py-4">
        <section className="flex h-full min-h-0 flex-col px-2 py-2 md:px-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Compose</h1>
              <p className="mt-3 text-sm text-zinc-500">Prompt. Model. Ratio. Generate. Results land in Library.</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill tone="brand">{runtimeCredits} credits</StatusPill>
              {runningJobs ? <StatusPill tone="neutral">{runningJobs} running</StatusPill> : null}
            </div>
          </div>

          <div className="mt-8 flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="text-sm text-zinc-500">Prompt</div>
              <button
                onClick={handleImprovePrompt}
                disabled={!prompt.trim() || improveState === 'working'}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {improveState === 'working' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Improve prompt
              </button>
            </div>

            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                if (improveState !== 'idle') setImproveState('idle')
              }}
              rows={9}
              placeholder="Describe the image you want to generate..."
              className="mt-4 min-h-[250px] w-full flex-1 resize-none bg-transparent text-[1.08rem] leading-8 text-white outline-none placeholder:text-zinc-500 md:min-h-[290px] md:text-[1.14rem]"
            />

            <div className="mt-6 border-t border-white/[0.06] pt-5">
              <div className="flex flex-wrap items-center gap-3">
                {(Object.entries(aspectPresets) as Array<[keyof typeof aspectPresets, (typeof aspectPresets)[keyof typeof aspectPresets]]>).map(([ratio, config]) => (
                  <button key={ratio} onClick={() => setAspectRatio(ratio)}>
                    <ButtonChip active={aspectRatio === ratio}>
                      {ratio} - {config.label}
                    </ButtonChip>
                  </button>
                ))}

                <div ref={modelPickerRef} className="relative">
                  <button
                    onClick={() => setModelPickerOpen((value) => !value)}
                    className="inline-flex min-w-[240px] items-center justify-between gap-3 rounded-full bg-white/[0.05] px-4 py-3 text-left text-sm text-white transition hover:bg-white/[0.08]"
                  >
                      <div className="min-w-0">
                      <div className="truncate font-medium">{selectedModel?.label ?? 'Select model'}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{getModelCostLabel(selectedModel)}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${modelPickerOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>

                  {modelPickerOpen ? (
                    <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-[min(420px,calc(100vw-56px))] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111216]/98 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                      {models.slice(0, 6).map((entry) => {
                        const active = entry.id === selectedModel?.id
                        return (
                          <button
                            key={entry.id}
                            onClick={() => setSelectedModelId(entry.id)}
                            className={`flex w-full items-start justify-between gap-4 rounded-[18px] px-3.5 py-3 text-left transition ${
                              active ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                {active ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="h-3.5 w-3.5" />}
                                <span className="truncate">{entry.label}</span>
                              </div>
                              <div className="mt-1 pl-[1.3rem] text-xs leading-5 text-zinc-500">{entry.description}</div>
                            </div>
                            <div className="shrink-0 text-right text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              {entry.runtime === 'local' ? 'Local' : `${entry.credit_cost} cr`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="text-sm text-zinc-500">{getModelCostSummary(selectedModel, activeAspect.width, activeAspect.height)}</div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  {improveState === 'done' ? <span className="text-xs text-emerald-200">Prompt improved.</span> : null}
                  {improveState === 'fallback' ? <span className="text-xs text-zinc-400">Prompt tightened.</span> : null}
                  <Link to="/library/images" className="text-sm text-white transition hover:text-zinc-200">
                    Open My Images
                  </Link>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !selectedModel || submittingCount > 0}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingCount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {submittingCount ? 'Starting...' : 'Generate'}
                </button>
              </div>

              {createError ? <div className="mt-4 text-sm text-rose-200">{createError}</div> : null}
            </div>
          </div>
        </section>
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
                <Link to={`/projects/${job.projectId}`} className="text-sm text-zinc-400 transition hover:text-white">
                  Open project
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
