import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronDown, Dices, RefreshCw, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import {
  getCreativeProfileDescription,
  getCreativeProfileLabel,
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
import { usePageVisibility } from '@/lib/usePageVisibility'

/* ─── Prompt history ──────────────────────────────── */

const PROMPT_HISTORY_KEY = 'omnia-prompt-history'

function usePromptHistory() {
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PROMPT_HISTORY_KEY) ?? '[]') as string[] } catch { return [] }
  })

  const push = useCallback((prompt: string) => {
    if (!prompt.trim()) return
    setHistory((prev) => {
      const next = [prompt.trim(), ...prev.filter((p) => p !== prompt.trim())].slice(0, 12)
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { history, push }
}

/* ─── Prompt templates ─────────────────────────────── */

const PROMPT_TEMPLATES = [
  {
    category: 'Cinematic',
    icon: '🎬',
    prompts: [
      'Cinematic still, golden hour light, 35mm film grain, dramatic lens flare, hyperrealistic',
      'Aerial establishing shot, volumetric fog, epic landscape, cinematic color grade',
      'Close-up portrait, shallow depth of field, creamy bokeh, soft studio lighting',
    ],
  },
  {
    category: 'Nature',
    icon: '🌿',
    prompts: [
      'Misty forest at dawn, god rays through ancient trees, macro detail, 8k nature photography',
      'Ocean at golden hour, long exposure, silky water, dramatic storm clouds on horizon',
      'Cherry blossoms in gentle wind, soft pastel tones, Japanese garden, dreamy atmosphere',
    ],
  },
  {
    category: 'Architecture',
    icon: '🏛️',
    prompts: [
      'Brutalist concrete architecture, dramatic shadow play, black and white fine art photography',
      'Futuristic glass tower facade, reflections of city at dusk, blue hour, cyberpunk aesthetic',
      'Ancient stone ruins at sunset, warm amber light, rich textures, cinematic depth of field',
    ],
  },
  {
    category: 'Fashion',
    icon: '👗',
    prompts: [
      'High fashion editorial, avant-garde styling, dramatic studio lighting, Vogue aesthetic',
      'Street style photography, urban backdrop, candid moment, fashion week crowd behind',
      'Luxury product shot, dark marble surface, studio light, commercial grade photography',
    ],
  },
  {
    category: 'Abstract',
    icon: '✨',
    prompts: [
      'Fluid liquid metal textures, iridescent surfaces, macro photography, dark background',
      'Bioluminescent deep sea creatures, ethereal glow, dark ocean, otherworldly beauty',
      'Sacred geometry patterns, vibrant neon colors, mathematical precision, digital art',
    ],
  },
] as const

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
  '1:1':  { width: 1024, height: 1024, label: 'Square', aspect: 'aspect-square' },
  '16:9': { width: 1280, height: 720, label: 'Landscape', aspect: 'aspect-video' },
  '9:16': { width: 720, height: 1280, label: 'Story', aspect: 'aspect-[9/16]' },
  '4:5':  { width: 1024, height: 1280, label: 'Portrait', aspect: 'aspect-[4/5]' },
  '3:4':  { width: 960, height: 1280, label: 'Editorial portrait', aspect: 'aspect-[3/4]' },
  '2:3':  { width: 1024, height: 1536, label: 'Poster', aspect: 'aspect-[2/3]' },
} as const

const aspectOrder: Array<keyof typeof aspectPresets> = ['1:1', '16:9', '9:16', '4:5', '3:4', '2:3']

/* ─── Toast types ──────────────────────────────────── */

type GenerationToast = {
  id: string
  title: string
  status: JobStatus
  outputCount: number
  projectId: string
  error: string | null
  dismissed: boolean
  notice: string | null
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
  if (normalized === 'succeeded') return 'Your image is ready! Check your Library.'
  if (normalized === 'running' || normalized === 'queued') return 'Creating your image...'
  return job.error || 'This image could not be created. Try again?'
}

function mapGenerationToToast(generation: Generation, projectId: string): GenerationToast {
  return {
    id: generation.job_id,
    title: generation.display_title || generation.title,
    status: generation.status,
    outputCount: generation.output_count,
    projectId,
    error: generation.error,
    dismissed: false,
    notice: null,
  }
}

function sortModels(models: ModelCatalogEntry[], canUseLocal: boolean) {
  return [...models]
    .filter((entry) => !entry.owner_only || canUseLocal)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.credit_cost - b.credit_cost)
}

function getProprietaryModelName(id: string, originalLabel: string): string {
  return getCreativeProfileLabel(id, originalLabel)
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
  const navigate = useNavigate()
  const { projectId: routeProjectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()

  const requestedProjectId = routeProjectId ?? searchParams.get('projectId')
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const canUseLocalModels = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)
  const isPageVisible = usePageVisibility()

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
  const [ratioPickerOpen, setRatioPickerOpen] = useState(false)
  const [ratioPickerDirection, setRatioPickerDirection] = useState<'down' | 'up'>('down')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [seed, setSeed] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplateCategory, setActiveTemplateCategory] = useState(0)
  const [sharingToastId, setSharingToastId] = useState<string | null>(null)
  const { history: promptHistory, push: pushPromptHistory } = usePromptHistory()

  const projectPromiseRef = useRef<Promise<string> | null>(null)
  const modelPickerRef = useRef<HTMLDivElement | null>(null)
  const modelPickerButtonRef = useRef<HTMLButtonElement | null>(null)
  const ratioPickerRef = useRef<HTMLDivElement | null>(null)
  const ratioPickerButtonRef = useRef<HTMLButtonElement | null>(null)
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
  const settingsQuery = useQuery({
    queryKey: ['settings-bootstrap', 'create'],
    queryFn: () => studioApi.getSettingsBootstrap(),
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
  const draftProjectId = settingsQuery.data?.draft_projects?.compose ?? null
  const runningJobs = useMemo(
    () => generationToasts.filter((job) => {
      const normalized = normalizeJobStatus(job.status)
      return normalized === 'queued' || normalized === 'running'
    }).length,
    [generationToasts],
  )
  const pendingGenerationJobs = useMemo(
    () => generationToasts.filter((job) => !isTerminalStatus(job.status)),
    [generationToasts],
  )
  const pendingGenerationPollKey = useMemo(
    () => pendingGenerationJobs.map((job) => `${job.id}:${normalizeJobStatus(job.status)}`).join('|'),
    [pendingGenerationJobs],
  )
  const runtimeCredits = billingQuery.data?.credits.available_to_spend ?? auth?.credits.remaining ?? 0
  const hasUnlimitedCredits = Boolean(billingQuery.data?.credits.unlimited || ((auth?.identity.owner_mode || auth?.identity.root_admin) && auth?.plan.can_generate))
  const activeAspect = aspectPresets[aspectRatio]
  const orderedAspectOptions = useMemo(
    () =>
      aspectOrder.map((ratio) => ({
        ratio,
        ...aspectPresets[ratio],
      })),
    [],
  )
  const prefillSource = searchParams.get('source')
  const prefillReferenceMode = searchParams.get('reference_mode')
  const requiresChatReference = prefillSource === 'chat' && prefillReferenceMode === 'required'
  const missingRequiredReference = requiresChatReference && !referenceAssetId
  const blockedByCurrentCredits = Boolean(selectedModelCreditGuide && !selectedModelCreditGuide.affordable_now)

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
    const nextStyleModifier = searchParams.get('style_modifier')
    const nextModel = searchParams.get('model')
    const nextAspect = searchParams.get('aspect_ratio') as keyof typeof aspectPresets | null
    const combinedPrompt = nextStyleModifier
      ? [nextPrompt, nextStyleModifier].filter(Boolean).join(', ')
      : nextPrompt
    if (combinedPrompt) setPrompt(combinedPrompt)
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
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setModelPickerOpen(false)
      }
      if (ratioPickerRef.current && !ratioPickerRef.current.contains(event.target as Node)) {
        setRatioPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!ratioPickerOpen) return
    const trigger = ratioPickerButtonRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const estimatedHeight = Math.min(Math.max(orderedAspectOptions.length * 68 + 16, 180), 380)
    setRatioPickerDirection(window.innerHeight - rect.bottom < estimatedHeight + 24 ? 'up' : 'down')
  }, [orderedAspectOptions.length, ratioPickerOpen])

  /* ─── Auto-resize textarea ────────────────────── */

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`
  }, [prompt])

  /* ─── Poll running jobs for status ────────────── */

  useEffect(() => {
    if (!canLoadPrivate || !isPageVisible || !pendingGenerationJobs.length) return

    const pollPendingJobs = async () => {
      const snapshots = await Promise.all(
        pendingGenerationJobs.map(async (job) => {
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

      setGenerationToasts((current) => {
        let hasChanges = false
        const nextState = current
          .map((job) => {
            const snapshot = snapshotMap.get(job.id)
            if (!snapshot) return job
            if (!isTerminalStatus(job.status) && isTerminalStatus(snapshot.status)) invalidate = true

            if (job.status !== snapshot.status || job.outputCount !== snapshot.output_count || job.error !== snapshot.error) {
              hasChanges = true
              return {
                ...job,
                title: snapshot.title,
                status: snapshot.status,
                outputCount: snapshot.output_count,
                error: snapshot.error,
              }
            }
            return job
          })
          .filter((job) => {
            const keep = !(job.dismissed && isTerminalStatus(job.status))
            if (!keep) hasChanges = true
            return keep
          })

        return hasChanges ? nextState : current
      })

      if (invalidate) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['assets'] }),
          queryClient.invalidateQueries({ queryKey: ['generations'] }),
          queryClient.invalidateQueries({ queryKey: ['projects'] }),
        ])
      }
    }

    void pollPendingJobs()
    const interval = window.setInterval(() => {
      void pollPendingJobs()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [canLoadPrivate, isPageVisible, pendingGenerationJobs, pendingGenerationPollKey, queryClient])

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
    if (draftProjectId) {
      setResolvedProjectId(draftProjectId)
      return draftProjectId
    }
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
  }, [draftProjectId, resolvedProjectId])

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

  const setToastNotice = useCallback((jobId: string, notice: string | null) => {
    setGenerationToasts((current) =>
      current.map((job) => (job.id === jobId ? { ...job, notice } : job)),
    )
  }, [])

  const openToastDestination = useCallback((job: GenerationToast) => {
    if (job.projectId) {
      navigate(`/projects/${job.projectId}`)
      return
    }
    navigate('/library/images')
  }, [navigate])

  const handleCopyProjectShareLink = useCallback(async (job: GenerationToast) => {
    if (!job.projectId) return
    setSharingToastId(job.id)
    setToastNotice(job.id, null)
    try {
      const response = await studioApi.createShare({ project_id: job.projectId })
      const shareUrl = `${window.location.origin}${response.url}`
      await navigator.clipboard.writeText(shareUrl)
      setToastNotice(job.id, 'Project share link copied.')
    } catch (error) {
      setToastNotice(job.id, error instanceof Error ? error.message : 'Unable to copy project share link.')
    } finally {
      setSharingToastId((current) => (current === job.id ? null : current))
    }
  }, [setToastNotice])

  useEffect(() => {
    if (!visibleToasts.length) return
    const completed = visibleToasts.filter((job) => isTerminalStatus(job.status))
    if (!completed.length) return

    const timers = completed.map((job) =>
      window.setTimeout(() => {
        dismissToast(job.id)
      }, 4000),
    )
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [dismissToast, visibleToasts])

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

  const saveStyleMutation = useMutation({
    mutationFn: () => studioApi.saveStyleFromPrompt({ prompt }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] })
    },
  })

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
      pushPromptHistory(prompt)
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
      setGenerationToasts((current) => [mapGenerationToToast(generation, generation.project_id || projectId), ...current.filter((job) => job.id !== generation.job_id)])
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
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--primary-light)/0.2)]" />
            <div className="relative h-3 w-3 rounded-full bg-[rgb(var(--primary-light))]" style={{ boxShadow: '0 0 12px rgb(var(--primary-light)/0.6)' }} />
          </div>
          <p className="text-sm text-zinc-500">Getting your studio ready…</p>
        </div>
      </div>
    )
  }

  /* ─── Render: Guest ───────────────────────────── */

  if (!isAuthenticated || auth?.guest) {
    return (
      <AppPage className="max-w-[860px] py-16">
        <section className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/[0.08]">
            <Wand2 className="h-7 w-7 text-cyan-300" />
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white md:text-5xl">Create</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-zinc-400">
            Write a prompt, pick a creative profile, choose a ratio, and generate. Create is the direct image workspace inside Studio.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90">
              Create account
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
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">Create</h1>
            <p className="mt-1 text-sm text-zinc-500">Describe what you'd like to create.</p>
            {missingRequiredReference ? (
              <p className="mt-2 text-[12px] text-amber-300">Upload a reference image to continue</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {runningJobs ? <StatusPill tone="neutral">{runningJobs} creating</StatusPill> : null}
          </div>
        </div>

        {/* ── Prompt Area ────────────────────────── */}
        <div className="glass-card overflow-visible p-[2px]">
          
          {/* Prompt Box */}
          <div className="relative z-10 flex flex-col rounded-[18px] bg-[#0c0d12]/40 p-6 pb-14 transition-all duration-500 focus-within:bg-[#0c0d12]/80">
            
            {/* Subtle bottom border line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

            <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-zinc-400" /> Your idea</span>
              <div className="flex items-center gap-2">
                {promptHistory.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowHistory((v) => !v); setShowTemplates(false) }}
                      className="flex items-center gap-1 text-zinc-500 transition hover:text-zinc-300"
                      title="Recent prompts"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}><circle cx="8" cy="8" r="6.5" /><path strokeLinecap="round" d="M8 5v3.5l2 2" /></svg>
                      <span>History</span>
                    </button>
                    {showHistory && (
                      <div className="absolute right-0 top-6 z-50 w-[min(420px,calc(100vw-48px))] overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#0d0e14] shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                        <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Recent prompts</div>
                        <div className="max-h-[280px] overflow-y-auto">
                          {promptHistory.map((entry, i) => (
                            <button
                              key={i}
                              onClick={() => { setPrompt(entry); setShowHistory(false) }}
                              className="block w-full px-4 py-2.5 text-left text-[13px] leading-5 text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <span className="line-clamp-2">{entry}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => { setShowTemplates((v) => !v); setShowHistory(false) }}
                  className="flex items-center gap-1 text-zinc-500 transition hover:text-zinc-300"
                  title="Prompt templates"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>
                  <span>Templates</span>
                </button>
              </div>
            </div>

            {/* Templates panel */}
            {showTemplates && (
              <div className="mb-4 overflow-hidden rounded-[16px] border border-white/[0.07] bg-black/30">
                <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] p-2">
                  {PROMPT_TEMPLATES.map((cat, i) => (
                    <button
                      key={cat.category}
                      onClick={() => setActiveTemplateCategory(i)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        activeTemplateCategory === i
                          ? 'bg-white/[0.1] text-white ring-1 ring-white/[0.15]'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.category}</span>
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {PROMPT_TEMPLATES[activeTemplateCategory].prompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => { setPrompt(p); setShowTemplates(false) }}
                      className="block w-full px-4 py-3 text-left text-[13px] leading-5 text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              id="studio-create-prompt"
              name="prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                if (improveState !== 'idle') setImproveState('idle')
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={runningJobs > 0}
              placeholder={PLACEHOLDER_PROMPTS[Math.floor(Date.now() / 60000) % PLACEHOLDER_PROMPTS.length]}
              className={`w-full resize-none bg-transparent text-[1.1rem] font-medium leading-[1.8] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:text-white ${runningJobs > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '120px' }}
            />

            {/* ✨ Improve & Random buttons */}
            <div className="absolute bottom-5 right-6 flex items-center gap-2">
              <button
                onClick={() => saveStyleMutation.mutate()}
                disabled={!prompt.trim() || saveStyleMutation.isPending}
                title="Save this prompt as a reusable style"
                className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.03] px-3.5 text-[12px] font-semibold tracking-wide text-zinc-300 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveStyleMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--primary-light))]" />}
                Save Style
              </button>
              <button
                onClick={() => {
                  const randomPrompt = PLACEHOLDER_PROMPTS[Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length)]
                  setPrompt(randomPrompt)
                  if (improveState !== 'idle') setImproveState('idle')
                }}
                title="Random prompt"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.02] text-zinc-400 ring-1 ring-white/[0.06] transition hover:bg-white/[0.06] hover:text-white"
              >
                <Dices className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleImprovePrompt}
                disabled={!prompt.trim() || improveState === 'working'}
                title="Improve prompt with AI"
                className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.04] px-4 text-[12px] font-semibold tracking-wide text-zinc-300 ring-1 ring-white/[0.1] shadow-lg transition hover:bg-white/[0.08] hover:text-white hover:ring-white/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {improveState === 'working' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-[rgb(var(--primary-light))]" />}
                {improveState === 'done' ? 'Improved ✓' : improveState === 'fallback' ? 'Improved' : 'Improve Prompt'}
              </button>
            </div>
          </div>

          {/* ── Advanced Drawer ──────────────────── */}
          <div className="relative z-10 border-t border-white/[0.04]">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-end gap-2 px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <span className="relative flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced
                {(negativePrompt || steps !== 28 || cfgScale !== 6.5) && (
                  <span className="absolute -right-2.5 -top-0.5 h-[6px] w-[6px] rounded-full bg-[rgb(var(--primary-light))] shadow-[0_0_6px_rgb(var(--primary-light))]" />
                )}
              </span>
            </button>

            {showAdvanced && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-300 px-6 pb-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Negative Prompt */}
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-zinc-500">Negative Prompt</label>
                    <textarea
                      id="studio-create-negative-prompt"
                      name="negativePrompt"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                      placeholder="Things to avoid: blurry, low quality, deformed hands..."
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 transition focus:border-white/[0.12] focus:bg-white/[0.04]"
                      style={{ maxHeight: '80px' }}
                    />
                  </div>

                  {/* Seed */}
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-zinc-500">Seed</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={seed ?? ''}
                        onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : null)}
                        placeholder="Random"
                        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 transition focus:border-white/[0.12] focus:bg-white/[0.04] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setSeed(Math.floor(Math.random() * 1_000_000_000))}
                        title="Randomize seed"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        <Dices className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Steps</span>
                      <span className="tabular-nums text-zinc-300">{steps}</span>
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={50}
                      step={1}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="accent-[rgb(var(--primary-light))] w-full h-2 rounded-full appearance-none bg-white/[0.06] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary-light),0.5)]"
                    />
                  </div>

                  {/* Guidance */}
                  <div>
                    <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Guidance</span>
                      <span className="tabular-nums text-zinc-300">{cfgScale}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="accent-[rgb(var(--primary-light))] w-full h-2 rounded-full appearance-none bg-white/[0.06] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary-light),0.5)]"
                    />
                  </div>

                  {/* Variations */}
                  <div>
                    <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Variations</span>
                      <span className="tabular-nums text-zinc-300">{outputCount}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={1}
                      value={outputCount}
                      onChange={(e) => setOutputCount(Number(e.target.value))}
                      className="accent-[rgb(var(--primary-light))] w-full h-2 rounded-full appearance-none bg-white/[0.06] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary-light),0.5)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Credit Warning */}
          {!hasUnlimitedCredits && runtimeCredits < 10 && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-xl bg-amber-400/10 px-4 py-2.5 text-[12px] font-semibold text-amber-400 ring-1 ring-amber-400/20">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Only {runtimeCredits} credits remaining.
              <Link to="/subscription" className="ml-auto whitespace-nowrap text-amber-300 underline underline-offset-2 transition hover:text-white">Upgrade Plan →</Link>
            </div>
          )}

          {/* Controls bar */}
          <div className="relative z-20 flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-transparent">
            {/* Left: aspect ratio picker and model picker */}
            <div className="flex flex-wrap items-center gap-2">
              <div ref={ratioPickerRef} className="relative">
                <button
                  ref={ratioPickerButtonRef}
                  onClick={() => setRatioPickerOpen((value) => !value)}
                  className="flex h-11 items-center gap-3 rounded-[14px] bg-white/[0.03] px-4 text-left ring-1 ring-white/[0.04] transition hover:bg-white/[0.06]"
                >
                  <div className="flex h-[22px] w-[22px] items-center justify-center opacity-90">
                    <div className={`border-2 ${activeAspect.aspect} w-full rounded-sm border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light)/0.18)]`} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-white">
                      {aspectRatio} · {activeAspect.label}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500">
                      {activeAspect.width} × {activeAspect.height}
                    </div>
                  </div>
                  <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${ratioPickerOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {ratioPickerOpen ? (
                  <div className={`${ratioPickerDirection === 'up' ? 'bottom-[calc(100%+8px)] origin-bottom' : 'top-[calc(100%+8px)] origin-top'} absolute left-0 z-50 w-[min(320px,calc(100vw-48px))] overflow-y-auto rounded-[20px] border border-white/[0.08] bg-[#0c0d11] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl`} style={{ maxHeight: 'min(380px, calc(100vh - 48px))' }}>
                    {orderedAspectOptions.map((option) => {
                      const active = option.ratio === aspectRatio
                      return (
                        <button
                          key={option.ratio}
                          onClick={() => {
                            setAspectRatio(option.ratio)
                            setRatioPickerOpen(false)
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-[16px] px-3.5 py-3 text-left transition ${
                            active ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/[0.04]">
                              <div className={`border-2 ${option.aspect} w-5 rounded-sm ${active ? 'border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light)/0.2)]' : 'border-zinc-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold tracking-wide">
                                {option.ratio} · {option.label}
                              </div>
                              <div className="mt-1 text-[11px] leading-5 text-zinc-500">
                                {option.width} × {option.height}
                              </div>
                            </div>
                          </div>
                          {active ? <Check className="h-4 w-4 text-white" /> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="mx-2 hidden h-6 w-px bg-white/[0.06] sm:block" />

              <div ref={modelPickerRef} className="relative">
                <button
                  ref={modelPickerButtonRef}
                  onClick={() => setModelPickerOpen((value) => !value)}
                  className="flex h-11 items-center gap-3 rounded-[14px] bg-white/[0.03] px-4 text-left ring-1 ring-white/[0.04] transition hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-white">
                      {selectedModel ? getProprietaryModelName(selectedModel.id, selectedModel.label) : 'Select creative profile'}
                    </div>
                  </div>
                  <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${modelPickerOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {modelPickerOpen ? (
                  <div className={`${modelPickerDirection === 'up' ? 'bottom-[calc(100%+8px)] origin-bottom' : 'top-[calc(100%+8px)] origin-top'} absolute left-0 z-50 w-[min(320px,calc(100vw-48px))] overflow-y-auto rounded-[20px] border border-white/[0.08] bg-[#0c0d11] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl`} style={{ maxHeight: 'min(360px, calc(100vh - 48px))' }}>
                    {models.slice(0, 6).map((entry) => {
                      const active = entry.id === selectedModel?.id
                      return (
                        <button
                          key={entry.id}
                          onClick={() => { setSelectedModelId(entry.id); setModelPickerOpen(false); }}
                          className={`flex w-full items-start justify-between gap-3 rounded-[16px] px-3.5 py-3 text-left transition ${
                            active ? 'bg-white/[0.08] text-white' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
                              {active ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="h-3.5 w-3.5" />}
                              <span className="truncate">{getProprietaryModelName(entry.id, entry.label)}</span>
                            </div>
                            <div className="mt-1 pl-[1.3rem] text-[11px] leading-5 text-zinc-500">
                              {getCreativeProfileDescription(entry.id, entry.description)}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: generate button + credit cost */}
            <div className="flex w-full sm:w-auto items-center justify-end gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-white/[0.04] sm:border-t-0">
              {selectedModel && selectedModel.runtime !== 'local' && (
                <div className="flex flex-col items-end mr-2">
                  <div className="text-[12px] font-bold text-white tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[rgb(var(--baseline))]" style={{ color: 'rgb(var(--primary-light))' }} />
                    {selectedModelCreditGuide ? selectedModelCreditGuide.reserved_credit_cost : selectedModel.credit_cost} Credits
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Per Image</div>
                </div>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedModel || submittingCount > 0 || missingRequiredReference || blockedByCurrentCredits}
                className="group relative flex h-12 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl px-8 text-[14px] font-bold text-black bg-white transition hover:scale-[1.02] hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_24px_rgba(255,255,255,0.2)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {submittingCount ? <RefreshCw className="h-4 w-4 animate-spin text-black/80" /> : <Wand2 className="h-4.5 w-4.5 text-black" />}
                  {submittingCount ? 'Creating...' : 'Generate Image'}
                </span>
              </button>
            </div>
          </div>

          {/* Feedback row — only errors, no technical billing info */}
          {createError ? (
            <div className="border-t border-white/[0.04] px-5 py-3">
              <div className="text-sm text-amber-200/80">{createError}</div>
            </div>
          ) : null}
          {improveState === 'done' ? (
            <div className="border-t border-white/[0.04] px-5 py-3">
              <div className="text-xs text-emerald-300">✓ Prompt improved</div>
            </div>
          ) : null}
        </div>

        {/* ── Shortcut hint ──────────────────────── */}
      </AppPage>

      {/* ── Toast stack ──────────────────────────── */}
      {visibleToasts.length ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[320px] max-w-[calc(100vw-20px)] flex-col gap-2.5">
          {visibleToasts.slice(0, 5).map((job) => (
            <div
              key={job.id}
              role="button"
              tabIndex={0}
              onClick={() => openToastDestination(job)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                openToastDestination(job)
              }}
              className="pointer-events-auto animate-toast cursor-pointer overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#17181d]/95 shadow-[0_18px_56px_rgba(0,0,0,0.38)] backdrop-blur-xl"
            >
              {/* Progress bar for running jobs */}
              {!isTerminalStatus(job.status) ? (
                <div className="h-[3px] w-full overflow-hidden bg-white/[0.03]">
                  <div className="h-full animate-pulse rounded-full transition-all" style={{ width: '60%', background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))' }} />
                </div>
              ) : null}

              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusPill tone={getToastTone(job.status)}>{getToastLabel(job.status)}</StatusPill>
                      <span className="text-[10px] text-zinc-600">{job.outputCount} output{job.outputCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-1 text-[13px] font-medium text-white">{job.title}</div>
                  </div>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      dismissToast(job.id)
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-1.5 text-[12px] leading-5 text-zinc-400">{getToastDescription(job)}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      openToastDestination(job)
                    }}
                    className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {job.projectId ? 'Open project' : 'Open library'}
                  </button>
                  {normalizeJobStatus(job.status) === 'succeeded' && job.projectId && auth?.plan.share_links ? (
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleCopyProjectShareLink(job)
                      }}
                      disabled={sharingToastId === job.id}
                      className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sharingToastId === job.id ? 'Copying...' : 'Copy share link'}
                    </button>
                  ) : null}
                </div>
                {job.notice ? (
                  <div className="mt-2 text-[11px] leading-5 text-zinc-500">{job.notice}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  )
}
