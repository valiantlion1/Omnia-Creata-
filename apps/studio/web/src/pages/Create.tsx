import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  Image as ImageIcon,
  Paintbrush,
  RefreshCw,
  Sparkles,
  Wand2,
  Wrench,
  X,
  Zap,
} from 'lucide-react'

import { AppPage, ButtonChip, EmptyState, PageHeader, Surface, SurfaceHeader, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type Generation, type JobStatus } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

const aspectPresets = {
  '1:1': { width: 1024, height: 1024, label: 'Square' },
  '16:9': { width: 1280, height: 720, label: 'Landscape' },
  '4:5': { width: 1024, height: 1280, label: 'Editorial' },
  '3:4': { width: 960, height: 1280, label: 'Portrait' },
} as const

const outputCountOptions = [1, 2, 4] as const
const createTools = ['image', 'edit', 'inpaint'] as const

const createToolContent = {
  image: {
    label: 'Image',
    title: 'Create images',
    helper: 'Fresh generation with direct prompt control.',
    promptPlaceholder: 'Describe the image you want to generate...',
    actionLabel: 'Generate',
    icon: ImageIcon,
  },
  edit: {
    label: 'Edit',
    title: 'Edit direction',
    helper: 'Use this when the image idea is already defined and you want a stronger pass.',
    promptPlaceholder: 'Describe the visual change you want to make...',
    actionLabel: 'Apply edit',
    icon: Paintbrush,
  },
  inpaint: {
    label: 'Inpaint',
    title: 'Repair or replace',
    helper: 'Target a region and describe exactly what should change.',
    promptPlaceholder: 'Describe what should change inside the selected area...',
    actionLabel: 'Run inpaint',
    icon: Wrench,
  },
} as const

type CreateTool = (typeof createTools)[number]

type GenerationToast = {
  id: string
  title: string
  status: JobStatus
  outputCount: number
  model: string
  projectId: string
  error: string | null
  dismissed: boolean
  createdAt: string
  completedAt: string | null
}

function isCreateTool(value: string | null): value is CreateTool {
  return createTools.includes((value ?? '') as CreateTool)
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
  if (job.status === 'completed') {
    return 'Saved to Library / My Images.'
  }
  if (job.status === 'processing' || job.status === 'pending') {
    return 'Studio is rendering this set now.'
  }
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
    createdAt: generation.created_at,
    completedAt: generation.completed_at,
  }
}

export default function CreatePage() {
  const { projectId: routeProjectId } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading, signInDemo, signInLocalOwner } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const requestedProjectId = routeProjectId ?? searchParams.get('projectId') ?? null
  const activeTool: CreateTool = isCreateTool(searchParams.get('tool')) ? searchParams.get('tool') : 'image'
  const toolContent = createToolContent[activeTool]

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [model, setModel] = useState('flux-schnell')
  const [aspectRatio, setAspectRatio] = useState<keyof typeof aspectPresets>('1:1')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [steps] = useState(28)
  const [cfgScale] = useState(6.5)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000_000))
  const [outputCount, setOutputCount] = useState<(typeof outputCountOptions)[number]>(1)
  const [modelOpen, setModelOpen] = useState(false)
  const [sessionProjectId, setSessionProjectId] = useState<string | null>(requestedProjectId)
  const [createError, setCreateError] = useState<string | null>(null)
  const [submittingCount, setSubmittingCount] = useState(0)
  const [generationToasts, setGenerationToasts] = useState<GenerationToast[]>([])

  const projectIdRef = useRef<string | null>(requestedProjectId)
  const projectPromiseRef = useRef<Promise<string> | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['models'],
    queryFn: () => studioApi.listModels(),
  })

  const projectContextQuery = useQuery({
    queryKey: ['project', sessionProjectId, 'create-context'],
    queryFn: () => studioApi.getProject(sessionProjectId as string),
    enabled: canLoadPrivate && Boolean(sessionProjectId),
  })

  const availableModels = modelsQuery.data?.models ?? []
  const selectedModel = useMemo(() => availableModels.find((entry) => entry.id === model) ?? availableModels[0], [availableModels, model])
  const projectTitle = projectContextQuery.data?.project.title ?? null
  const totalCredits = (selectedModel?.credit_cost ?? 0) * outputCount
  const runningJobs = useMemo(
    () => generationToasts.filter((job) => job.status === 'pending' || job.status === 'processing').length,
    [generationToasts],
  )
  const visibleToasts = useMemo(() => generationToasts.filter((job) => !job.dismissed), [generationToasts])

  useEffect(() => {
    projectIdRef.current = sessionProjectId
  }, [sessionProjectId])

  useEffect(() => {
    if (!availableModels.length) return
    if (!availableModels.some((entry) => entry.id === model)) {
      setModel(availableModels[0].id)
    }
  }, [availableModels, model])

  useEffect(() => {
    if (requestedProjectId && requestedProjectId !== sessionProjectId) {
      projectIdRef.current = requestedProjectId
      setSessionProjectId(requestedProjectId)
    }
  }, [requestedProjectId, sessionProjectId])

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
              model: snapshot.model,
              error: snapshot.error,
              completedAt: snapshot.completed_at,
            }
          })
          .filter((job) => !(job.dismissed && isTerminalStatus(job.status))),
      )

      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: ['assets'] })
        await queryClient.invalidateQueries({ queryKey: ['generations'] })
        await queryClient.invalidateQueries({ queryKey: ['billing'] })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }, 1500)

    return () => window.clearInterval(interval)
  }, [canLoadPrivate, generationToasts, queryClient])

  const ensureProjectId = useCallback(async () => {
    if (projectIdRef.current) return projectIdRef.current

    if (!projectPromiseRef.current) {
      const title = prompt.trim().split(/\s+/).slice(0, 6).join(' ') || 'Quick Create Session'
      projectPromiseRef.current = studioApi
        .createProject({
          title: title.slice(0, 60),
          description: 'Created from quick create',
        })
        .then((project) => {
          projectIdRef.current = project.id
          setSessionProjectId(project.id)
          return project.id
        })
        .finally(() => {
          projectPromiseRef.current = null
        })
    }

    return projectPromiseRef.current
  }, [prompt])

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
        model,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
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
      setCreateError(error instanceof Error ? error.message : 'Unable to generate image.')
    } finally {
      setSubmittingCount((value) => Math.max(0, value - 1))
    }
  }, [aspectRatio, cfgScale, ensureProjectId, height, model, negativePrompt, outputCount, prompt, queryClient, seed, selectedModel, steps, width])

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading create...</div>
  }

  if (auth?.guest) {
    return (
      <AppPage>
        <PageHeader
          eyebrow="Create"
          title="Create"
          description="Generate directly, then let your results land in Library automatically."
          actions={
            <>
              <button
                onClick={() => signInDemo('free', 'Omnia User')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Start free
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={() => signInLocalOwner('', 'Omnia Owner')}
                className="rounded-full bg-white/[0.04] px-5 py-3 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]"
              >
                Enter owner local mode
              </button>
            </>
          }
        />

        <Surface tone="raised" className="max-w-4xl">
          <div className="text-sm leading-7 text-zinc-300">
            Create stays clean on purpose. Generate here, then review and organize everything from Library / My Images.
          </div>
        </Surface>
      </AppPage>
    )
  }

  const ToolIcon = toolContent.icon

  return (
    <>
      <AppPage className="max-w-[1360px] gap-5 py-5">
        <PageHeader
          eyebrow="Create"
          title="Create"
          description="Generate here. Review results in Library."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link to="/library/images" className="inline-flex">
                <ButtonChip>My Images</ButtonChip>
              </Link>
              {projectTitle && sessionProjectId ? (
                <Link to={`/projects/${sessionProjectId}`} className="inline-flex">
                  <ButtonChip>{projectTitle}</ButtonChip>
                </Link>
              ) : null}
              <StatusPill tone="brand">{auth?.credits.remaining ?? 0} credits</StatusPill>
              {runningJobs ? <StatusPill tone="brand">{runningJobs} running</StatusPill> : null}
              {submittingCount ? <StatusPill tone="neutral">{submittingCount} starting</StatusPill> : null}
            </div>
          }
        />

        <div className="min-w-0">
          <Surface tone="raised" className="mx-auto max-w-[1040px]">
              <SurfaceHeader
                eyebrow={toolContent.label}
                title={toolContent.title}
                description="Write your prompt, choose a model, and generate."
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {projectTitle && sessionProjectId ? (
                      <Link to={`/projects/${sessionProjectId}`} className="inline-flex">
                        <ButtonChip>Open project</ButtonChip>
                      </Link>
                    ) : null}
                  </div>
                }
              />

              <div className="mt-6 rounded-[28px] bg-[#0f1013] p-5 ring-1 ring-white/[0.08]">
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-200 ring-1 ring-white/[0.08]">
                    <ToolIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      rows={6}
                      placeholder={toolContent.promptPlaceholder}
                      className="w-full resize-none bg-transparent text-base leading-8 text-white outline-none placeholder:text-zinc-500"
                    />
                    <div className="mt-4 border-t border-white/[0.06] pt-4">
                      <input
                        value={negativePrompt}
                        onChange={(event) => setNegativePrompt(event.target.value)}
                        placeholder="Negative prompt"
                        className="w-full bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-600">Model</div>
                    <div className="relative">
                      <button
                        onClick={() => setModelOpen((value) => !value)}
                        className="flex w-full items-center justify-between rounded-[22px] bg-black/20 px-4 py-4 text-left ring-1 ring-white/[0.08] transition hover:bg-black/30"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{selectedModel?.label ?? 'Select model'}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {selectedModel?.runtime === 'local' ? 'Local checkpoint' : selectedModel?.description ?? 'Cloud model'}
                          </div>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-zinc-500 transition ${modelOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {modelOpen ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[22px] bg-[#111216] shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.08]">
                          {availableModels.map((entry) => (
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
                              <div className="mt-1 text-xs text-zinc-500">{entry.runtime === 'local' ? 'Local runtime' : entry.description}</div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-600">Format</div>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(aspectPresets) as Array<[keyof typeof aspectPresets, (typeof aspectPresets)[keyof typeof aspectPresets]]>).map(([ratio, config]) => (
                          <button
                            key={ratio}
                            onClick={() => {
                              setAspectRatio(ratio)
                              setWidth(config.width)
                              setHeight(config.height)
                            }}
                          >
                            <div className={`rounded-[20px] px-4 py-3 text-left transition ${aspectRatio === ratio ? 'bg-white text-black' : 'bg-black/20 text-zinc-300 ring-1 ring-white/[0.08]'}`}>
                              <div className="text-sm font-semibold">{ratio}</div>
                              <div className={`mt-1 text-xs ${aspectRatio === ratio ? 'text-black/60' : 'text-zinc-500'}`}>{config.label}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-600">Variations</div>
                      <div className="flex flex-wrap gap-2">
                        {outputCountOptions.map((count) => (
                          <button key={count} onClick={() => setOutputCount(count)}>
                            <ButtonChip active={outputCount === count}>
                              {count} output{count > 1 ? 's' : ''}
                            </ButtonChip>
                          </button>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                        <div className="rounded-[20px] bg-black/20 px-3 py-3 ring-1 ring-white/[0.08]">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Steps</div>
                          <div className="mt-2 text-white">{steps}</div>
                        </div>
                        <div className="rounded-[20px] bg-black/20 px-3 py-3 ring-1 ring-white/[0.08]">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">CFG</div>
                          <div className="mt-2 text-white">{cfgScale.toFixed(1)}</div>
                        </div>
                        <div className="rounded-[20px] bg-black/20 px-3 py-3 ring-1 ring-white/[0.08]">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Seed</div>
                          <div className="mt-2 truncate text-white">{seed}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] bg-black/20 p-4 ring-1 ring-white/[0.08]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Saved to</div>
                  <div className="mt-3 text-sm font-medium text-white">Library / My Images</div>

                  <div className="mt-4 space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span>Tool</span>
                      <span>{toolContent.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Variations</span>
                      <span>{outputCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Credit cost</span>
                      <span>{totalCredits}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || !selectedModel}
                    className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingCount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {submittingCount ? 'Starting...' : toolContent.actionLabel}
                    <span className="inline-flex items-center gap-1 text-black/65">
                      <Zap className="h-4 w-4" />
                      {totalCredits}
                    </span>
                  </button>
                </div>
              </div>

              {createError ? (
                <div className="mt-4 rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{createError}</div>
              ) : null}
          </Surface>
        </div>
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
                <StatusPill tone="neutral">{job.model}</StatusPill>
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
