import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Image as ImageIcon, Monitor, RefreshCw, RectangleVertical, Smartphone, Sparkles, Square, Wand2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import {
  describeGenerationLaneTrust,
  formatGenerationGuideSummary,
  isTerminalJobStatus,
  normalizeJobStatus,
  studioApi,
  type Generation,
  type JobStatus,
  type ModelCatalogEntry,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

/* ─── Placeholder prompts ──────────────────────────── */

const PLACEHOLDER_PROMPTS = [
  'A neon-lit Tokyo alley at midnight, rain-soaked reflections, cinematic mood...',
  'Minimalist perfume bottle on dark marble, studio lighting, product photography...',
  'Ancient dragon perched on crystal ruins, aurora borealis, fantasy concept art...',
  'Fashion editorial, model in flowing silk, golden hour, soft bokeh background...',
  'Futuristic architecture overlooking the ocean, glass and concrete, sunset...',
]

/* ─── Aspect presets ───────────────────────────────── */

const aspectPresets = {
  '1:1':  { width: 1024, height: 1024, label: 'Square',    icon: Square },
  '16:9': { width: 1280, height: 720,  label: 'Landscape', icon: Monitor },
  '4:5':  { width: 1024, height: 1280, label: 'Portrait',  icon: Smartphone },
  '3:4':  { width: 960,  height: 1280, label: 'Vertical',  icon: RectangleVertical },
} as const

/* ─── Toast types ──────────────────────────────────── */

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
  return isTerminalJobStatus(status)
}

function getToastTone(status: JobStatus): 'brand' | 'success' | 'warning' | 'danger' {
  const normalized = normalizeJobStatus(status)
  if (normalized === 'succeeded') return 'success'
  if (normalized === 'retryable_failed') return 'warning'
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'timed_out') return 'danger'
  return 'brand'
}

function getToastLabel(status: JobStatus) {
  switch (normalizeJobStatus(status)) {
    case 'queued': return 'Queued'
    case 'running': return 'Generating'
    case 'succeeded': return 'Done'
    case 'retryable_failed': return 'Retry needed'
    case 'failed': return 'Failed'
    case 'cancelled': return 'Cancelled'
    case 'timed_out': return 'Timed out'
    default: return 'Queued'
  }
}

function getToastDescription(job: GenerationToast) {
  const normalized = normalizeJobStatus(job.status)
  if (normalized === 'succeeded') return 'Saved to Library / My Images.'
  if (normalized === 'running' || normalized === 'queued') return 'Your image is being rendered...'
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

function getProprietaryModelName(id: string, originalLabel: string): string {
  const lower = id.toLowerCase()
  
  // Sektör standardı: Provider ismi (fal-ai, runware) gizlenir. Gerçek orijinal model ismi "Temiz" bir formatla verilir.
  if (lower.includes('flux-schnell') || lower.includes('flux.1-schnell')) return 'FLUX.1 Schnell'
  if (lower.includes('flux-dev') || lower.includes('flux.1-dev')) return 'FLUX.1 Dev'
  if (lower.includes('flux-pro') || lower.includes('flux.1-pro')) return 'FLUX.1 Pro'
  if (lower.includes('sdxl') || lower.includes('stable-diffusion-xl')) return 'SDXL 1.0'
  if (lower.includes('stable-diffusion-3') || lower.includes('sd3')) return 'Stable Diffusion 3'
  if (lower.includes('kandinsky')) return 'Kandinsky 3'
  if (lower.includes('playground')) return 'Playground v2.5'
  
  // Eğer bilinmeyen bir şey gelirse, "fal-ai/" veya "runware/" kısımlarını kesip atar, sadece modelin ismini temizler.
  const withoutProvider = originalLabel.split('/').pop() || originalLabel
  
  return withoutProvider
    .split(/[-_ ]/)
    .filter(Boolean)
    .map(word => {
      // API kısaltmaları için küçük bir harf dokunuşu
      if (word.toUpperCase() === 'SDXL') return 'SDXL'
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function parseBoundedInt(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function parseBoundedFloat(value: string | null, fallback: number, min: number, max: number) {
  if (!value) return fallback
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

/* ─── Main page ────────────────────────────────────── */

export default function CreatePage() {
  const queryClient = useQueryClient()
  const { projectId: routeProjectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()

  const requestedProjectId = routeProjectId ?? searchParams.get('projectId')
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const canUseLocalModels = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('')
  const [aspectRatio, setAspectRatio] = useState<keyof typeof aspectPresets>('1:1')
  const [steps, setSteps] = useState(28)
  const [cfgScale, setCfgScale] = useState(6.5)
  const [outputCount, setOutputCount] = useState(1)
  const [referenceAssetId, setReferenceAssetId] = useState<string | null>(null)
  const [submittingCount, setSubmittingCount] = useState(0)
  const [createError, setCreateError] = useState<string | null>(null)
  const [improveState, setImproveState] = useState<'idle' | 'working' | 'done' | 'fallback'>('idle')
  const [generationToasts, setGenerationToasts] = useState<GenerationToast[]>([])
  const [resolvedProjectId, setResolvedProjectId] = useState<string | null>(requestedProjectId ?? null)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [modelPickerDirection, setModelPickerDirection] = useState<'down' | 'up'>('down')

  const projectPromiseRef = useRef<Promise<string> | null>(null)
  const modelPickerRef = useRef<HTMLDivElement | null>(null)
  const modelPickerButtonRef = useRef<HTMLButtonElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  /* ─── Queries ─────────────────────────────────── */

  const modelsQuery = useQuery({
    queryKey: ['models', 'create'],
    queryFn: () => studioApi.listModels(),
    enabled: canLoadPrivate,
  })
  const billingQuery = useQuery({
    queryKey: ['billing-summary', 'create'],
    queryFn: () => studioApi.getBillingSummary(),
    enabled: canLoadPrivate,
  })

  const models = useMemo(
    () => sortModels(modelsQuery.data?.models ?? [], canUseLocalModels),
    [canUseLocalModels, modelsQuery.data],
  )
  const selectedModel = useMemo(() => models.find((entry) => entry.id === selectedModelId) ?? models[0], [models, selectedModelId])
  const selectedModelCreditGuide = useMemo(
    () => billingQuery.data?.generation_credit_guide?.models?.find((entry) => entry.model_id === selectedModel?.id) ?? null,
    [billingQuery.data, selectedModel],
  )
  const visibleToasts = useMemo(() => generationToasts.filter((job) => !job.dismissed), [generationToasts])
  const runningJobs = useMemo(
    () => generationToasts.filter((job) => {
      const normalized = normalizeJobStatus(job.status)
      return normalized === 'queued' || normalized === 'running'
    }).length,
    [generationToasts],
  )
  const runtimeCredits = billingQuery.data?.credits.available_to_spend ?? auth?.credits.remaining ?? 0
  const activeAspect = aspectPresets[aspectRatio]
  const prefillSource = searchParams.get('source')
  const prefillReferenceMode = searchParams.get('reference_mode')
  const requiresChatReference = prefillSource === 'chat' && prefillReferenceMode === 'required'
  const missingRequiredReference = requiresChatReference && !referenceAssetId
  const blockedByCurrentCredits = Boolean(selectedModelCreditGuide && !selectedModelCreditGuide.affordable_now)
  const selectedLaneTrustLabel = selectedModelCreditGuide
    ? describeGenerationLaneTrust(selectedModelCreditGuide.pricing_lane, selectedModelCreditGuide.planned_provider)
    : null

  /* ─── Effects ─────────────────────────────────── */

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
    setNegativePrompt(searchParams.get('negative_prompt') ?? '')
    if (nextModel) setSelectedModelId(nextModel)
    if (nextAspect && nextAspect in aspectPresets) setAspectRatio(nextAspect)
    setReferenceAssetId(searchParams.get('reference_asset_id'))
    setSteps(parseBoundedInt(searchParams.get('steps'), 28, 1, 50))
    setCfgScale(parseBoundedFloat(searchParams.get('cfg_scale'), 6.5, 1, 20))
    setOutputCount(parseBoundedInt(searchParams.get('output_count'), 1, 1, 4))
  }, [searchParams])

  useEffect(() => {
    if (!missingRequiredReference && createError?.includes('reference image')) {
      setCreateError(null)
    }
  }, [createError, missingRequiredReference])

  useEffect(() => {
    if (!blockedByCurrentCredits && createError?.includes('blocked on the current balance')) {
      setCreateError(null)
    }
  }, [blockedByCurrentCredits, createError])

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

  /* ─── Auto-resize textarea ────────────────────── */

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
  }, [prompt])

  /* ─── Poll running jobs for status ────────────── */

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
            if (!isTerminalStatus(job.status) && isTerminalStatus(snapshot.status)) invalidate = true
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

  useEffect(() => {
    if (!modelPickerOpen) return
    const trigger = modelPickerButtonRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const estimatedHeight = Math.min(Math.max(models.slice(0, 6).length * 82 + 16, 180), 360)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setModelPickerDirection(spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? 'up' : 'down')
  }, [modelPickerOpen, models])

  /* ─── Handlers ────────────────────────────────── */

  const ensureProjectId = useCallback(async () => {
    if (resolvedProjectId) return resolvedProjectId
    if (!projectPromiseRef.current) {
      projectPromiseRef.current = studioApi
        .createProject({ title: 'New image set', description: 'Created from Studio Create', surface: 'compose' })
        .then((project) => {
          setResolvedProjectId(project.id)
          return project.id
        })
        .finally(() => { projectPromiseRef.current = null })
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
    if (missingRequiredReference) {
      setCreateError('This chat handoff needs its reference image. Go back to Chat and reopen Create from the image-guided turn.')
      return
    }
    if (blockedByCurrentCredits && selectedModelCreditGuide) {
      setCreateError(
        `This start is blocked on the current balance. ${formatGenerationGuideSummary(selectedModelCreditGuide)}. ` +
        `${describeGenerationLaneTrust(selectedModelCreditGuide.pricing_lane, selectedModelCreditGuide.planned_provider)}`,
      )
      return
    }
    setCreateError(null)
    setSubmittingCount((value) => value + 1)
    try {
      const projectId = await ensureProjectId()
      const generation = await studioApi.createGeneration({
        project_id: projectId,
        prompt,
        negative_prompt: negativePrompt,
        reference_asset_id: referenceAssetId,
        model: selectedModel.id,
        width: activeAspect.width,
        height: activeAspect.height,
        steps,
        cfg_scale: cfgScale,
        seed: Math.floor(Math.random() * 1_000_000_000),
        aspect_ratio: aspectRatio,
        output_count: outputCount,
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
  }, [activeAspect.height, activeAspect.width, aspectRatio, blockedByCurrentCredits, cfgScale, ensureProjectId, missingRequiredReference, negativePrompt, outputCount, prompt, queryClient, referenceAssetId, selectedModel, selectedModelCreditGuide, steps])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleGenerate()
    }
  }

  /* ─── Render: Loading ─────────────────────────── */

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading compose...</div>
  }

  /* ─── Render: Guest ───────────────────────────── */

  if (!isAuthenticated || auth?.guest) {
    return (
      <AppPage className="max-w-[860px] py-16">
        <section className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/[0.08]">
            <Wand2 className="h-7 w-7 text-cyan-300" />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Compose</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-400">
            Write a prompt, pick a model, choose a ratio, and generate. Your creations land straight in your Library.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90">
              Start free
            </Link>
            <Link to="/login" className="rounded-full bg-white/[0.05] px-6 py-3 text-sm font-medium text-white ring-1 ring-white/[0.08] transition hover:bg-white/[0.08]">
              Log in
            </Link>
          </div>
        </section>
      </AppPage>
    )
  }

  /* ─── Render: Main ────────────────────────────── */

  return (
    <>
      <AppPage className="max-w-[860px] gap-0 py-6 md:py-10">

        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">Compose</h1>
            <p className="mt-1 text-sm text-zinc-500">Describe your vision and generate.</p>
            {prefillSource === 'chat' ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[rgb(var(--primary-light))]">
                  Prefilled from chat direction
                </p>
                {prefillReferenceMode === 'required' ? (
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                    Reference-guided handoff{referenceAssetId ? ' attached' : ' pending'}
                  </p>
                ) : null}
                {missingRequiredReference ? (
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-300">
                    Return to chat to keep the source image attached
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="brand">{runtimeCredits} credits</StatusPill>
            {runningJobs ? <StatusPill tone="neutral">{runningJobs} running</StatusPill> : null}
          </div>
        </div>

        {/* ── Prompt Area ────────────────────────── */}
        <div className="glass-card overflow-visible p-[2px]">
          
          {/* Prompt Box */}
          <div className="relative flex flex-col rounded-[18px] bg-[#0c0d12]/40 p-6 pb-14 transition-all duration-500 focus-within:bg-[#0c0d12]/80">
            
            {/* Subtle bottom border line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

            <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-zinc-400" /> Direction</span>
            </div>

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                if (improveState !== 'idle') setImproveState('idle')
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={PLACEHOLDER_PROMPTS[Math.floor(Date.now() / 60000) % PLACEHOLDER_PROMPTS.length]}
              className="w-full resize-none bg-transparent text-[1.1rem] font-medium leading-[1.8] text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:text-white"
              style={{ minHeight: '120px' }}
            />

            {/* ✨ Improve button */}
            <button
              onClick={handleImprovePrompt}
              disabled={!prompt.trim() || improveState === 'working'}
              title="Improve prompt with AI"
              className="absolute bottom-5 right-6 flex items-center gap-1.5 rounded-full bg-white/[0.02] px-4 py-2 text-[11px] font-semibold tracking-wide text-zinc-400 ring-1 ring-white/[0.06] transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {improveState === 'working' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {improveState === 'done' ? 'IMPROVED ✓' : improveState === 'fallback' ? 'TIGHTENED' : 'IMPROVE'}
            </button>
          </div>

          {/* Controls bar */}
          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-transparent">

            {/* Left: aspect ratio + model */}
            <div className="flex flex-wrap items-center gap-2">

              {/* Aspect ratio buttons */}
              {(Object.entries(aspectPresets) as Array<[keyof typeof aspectPresets, (typeof aspectPresets)[keyof typeof aspectPresets]]>).map(([ratio, config]) => {
                const Icon = config.icon
                const active = aspectRatio === ratio
                return (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    title={`${ratio} — ${config.label}`}
                    className={`group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-all duration-300 ${
                      active
                        ? 'bg-[rgb(var(--primary-light)/0.1)] text-white shadow-[0_0_15px_rgb(var(--primary-light)/0.1)] ring-1 ring-[rgb(var(--primary-light)/0.2)]'
                        : 'bg-white/[0.03] text-zinc-500 ring-1 ring-white/[0.04] hover:bg-white/[0.06] hover:text-zinc-300'
                    }`}
                  >
                    <Icon className={`h-[22px] w-[22px] ${active ? 'opacity-100 drop-shadow-sm' : 'opacity-60 transition-opacity group-hover:opacity-100'}`} />
                  </button>
                )
              })}

              {/* Divider */}
              <div className="mx-1 hidden h-6 w-px bg-white/[0.06] sm:block" />

              {/* Model picker */}
              <div ref={modelPickerRef} className="relative">
                <button
                  ref={modelPickerButtonRef}
                  onClick={() => setModelPickerOpen((value) => !value)}
                  className="flex h-11 items-center gap-3 rounded-[14px] bg-white/[0.03] px-4 text-left ring-1 ring-white/[0.04] transition hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-white">
                      {selectedModel ? getProprietaryModelName(selectedModel.id, selectedModel.label) : 'Select model'}
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-zinc-500">
                      {selectedModel
                        ? (
                            selectedModel.runtime === 'local'
                              ? 'Running locally'
                              : selectedModelCreditGuide
                                ? `${selectedModelCreditGuide.reserved_credit_cost} credits reserved`
                                : `${selectedModel.credit_cost} credits`
                          )
                        : ''}
                    </div>
                  </div>
                  <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${modelPickerOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {modelPickerOpen ? (
                  <div className={`${modelPickerDirection === 'up' ? 'bottom-[calc(100%+8px)] origin-bottom' : 'top-[calc(100%+8px)] origin-top'} absolute left-0 z-30 w-[min(400px,calc(100vw-48px))] overflow-y-auto rounded-[20px] border border-white/[0.08] bg-[#111216]/98 p-2 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl`} style={{ maxHeight: 'min(360px, calc(100vh - 48px))' }}>
                    {models.slice(0, 6).map((entry) => {
                      const active = entry.id === selectedModel?.id
                      const entryGuide = billingQuery.data?.generation_credit_guide?.models?.find((guide) => guide.model_id === entry.id) ?? null
                      return (
                        <button
                          key={entry.id}
                          onClick={() => setSelectedModelId(entry.id)}
                          className={`flex w-full items-start justify-between gap-3 rounded-[16px] px-3.5 py-3 text-left transition ${
                            active ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
                              {active ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="h-3.5 w-3.5" />}
                              <span className="truncate">{getProprietaryModelName(entry.id, entry.label)}</span>
                            </div>
                            <div className="mt-1 pl-[1.3rem] text-[11px] leading-5 text-zinc-500">{entry.description}</div>
                          </div>
                          <div className="shrink-0 text-right text-[11px] font-medium text-zinc-500">
                            {entry.runtime === 'local'
                              ? 'Local'
                              : entryGuide
                                ? `${entryGuide.reserved_credit_cost} rsv`
                                : `${entry.credit_cost} cr`}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: generate button */}
            <div className="flex items-center gap-4">
              <div className="text-right text-[11px] font-medium text-zinc-500">
                <div className="mb-0.5">{selectedModel ? `${activeAspect.width} × ${activeAspect.height}` : ''}</div>
                <div>
                  {selectedModel && selectedModel.runtime !== 'local'
                    ? selectedModelCreditGuide
                      ? `${selectedModelCreditGuide.reserved_credit_cost} credits held`
                      : `${selectedModel.credit_cost} credits`
                    : ''}
                </div>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedModel || submittingCount > 0 || missingRequiredReference || blockedByCurrentCredits}
                className="group relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-8 text-[13px] font-semibold text-black bg-white transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                {/* Content */}
                <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
                  {submittingCount ? <RefreshCw className="h-4 w-4 animate-spin text-black/90" /> : <Wand2 className="h-4 w-4 text-black/90" />}
                  {submittingCount ? 'Starting' : 'Generate'}
                </span>
              </button>
            </div>
          </div>

          {/* Feedback row */}
          {(createError || improveState === 'done' || improveState === 'fallback' || selectedModelCreditGuide) ? (
            <div className="border-t border-white/[0.04] px-5 py-3">
              {createError ? <div className="text-sm text-rose-300">{createError}</div> : null}
              {!createError && selectedModelCreditGuide ? (
                <div className={`text-xs ${blockedByCurrentCredits ? 'text-amber-300' : 'text-zinc-400'}`}>
                  {formatGenerationGuideSummary(selectedModelCreditGuide)}
                </div>
              ) : null}
              {!createError && selectedLaneTrustLabel ? (
                <div className="mt-1 text-[11px] text-zinc-500">{selectedLaneTrustLabel}</div>
              ) : null}
              {improveState === 'done' ? <div className="text-xs text-emerald-300">✓ Prompt improved by AI</div> : null}
              {improveState === 'fallback' ? <div className="text-xs text-zinc-400">Prompt tightened (offline mode)</div> : null}
            </div>
          ) : null}
        </div>

        {/* ── Shortcut hint ──────────────────────── */}
        <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-600">
          <span>{navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to generate{prompt.length > 0 ? ` · ${prompt.length} chars` : ''}</span>
          <Link to="/library/images" className="flex items-center gap-1.5 text-zinc-400 transition hover:text-white">
            <ImageIcon className="h-3.5 w-3.5" />
            Open My Images
          </Link>
        </div>

      </AppPage>

      {/* ── Toast stack ──────────────────────────── */}
      {visibleToasts.length ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[380px] max-w-[calc(100vw-24px)] flex-col gap-3">
          {visibleToasts.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="pointer-events-auto animate-toast overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#17181d]/95 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
              {/* Progress bar for running jobs */}
              {!isTerminalStatus(job.status) ? (
                <div className="h-[3px] w-full overflow-hidden bg-white/[0.03]">
                  <div className="h-full animate-pulse rounded-full transition-all" style={{ width: '60%', background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))' }} />
                </div>
              ) : null}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusPill tone={getToastTone(job.status)}>{getToastLabel(job.status)}</StatusPill>
                      <span className="text-[10px] text-zinc-600">{job.outputCount} output{job.outputCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-medium text-white">{job.title}</div>
                  </div>
                  <button
                    onClick={() => dismissToast(job.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 text-[13px] leading-6 text-zinc-400">{getToastDescription(job)}</div>

                {normalizeJobStatus(job.status) === 'succeeded' ? (
                  <div className="mt-3 flex items-center gap-3">
                    <Link to="/library/images" className="text-[13px] font-medium text-white transition hover:text-zinc-200">
                      Open My Images
                    </Link>
                    <Link to={`/projects/${job.projectId}`} className="text-[13px] text-zinc-400 transition hover:text-white">
                      Open project
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
