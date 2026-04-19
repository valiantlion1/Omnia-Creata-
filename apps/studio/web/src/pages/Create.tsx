import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Dices, RefreshCw, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { useToast } from '@/components/Toast'
import {
  getCreativeProfileKey,
  describeGenerationLaneTrust,
  formatGenerationGuideSummary,
  getStudioModelDisplayName,
  isTerminalJobStatus,
  normalizeJobStatus,
  studioApi,
  type Generation,
  type GenerationCreditGuideEntry,
  type IdentityPlan,
  type JobStatus,
  type ModelCatalogEntry,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageVisibility } from '@/lib/usePageVisibility'

/* ─── Prompt history ──────────────────────────────── */

const LEGACY_PROMPT_HISTORY_KEY = 'omnia-prompt-history'
const PROMPT_HISTORY_KEY_PREFIX = 'omnia-prompt-history:'

function buildPromptHistoryStorageKey(scope: string) {
  return `${PROMPT_HISTORY_KEY_PREFIX}${scope}`
}

function readPromptHistory(storageKey: string, { allowLegacyFallback = false }: { allowLegacyFallback?: boolean } = {}) {
  try {
    const scopedHistory = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as string[]
    if (Array.isArray(scopedHistory) && scopedHistory.length > 0) {
      return scopedHistory
    }
    if (allowLegacyFallback) {
      const legacyHistory = JSON.parse(localStorage.getItem(LEGACY_PROMPT_HISTORY_KEY) ?? '[]') as string[]
      if (Array.isArray(legacyHistory)) {
        return legacyHistory
      }
    }
  } catch {
    return []
  }
  return []
}

function usePromptHistory(storageKey: string, { allowLegacyFallback = false }: { allowLegacyFallback?: boolean } = {}) {
  const [history, setHistory] = useState<string[]>(() => readPromptHistory(storageKey, { allowLegacyFallback }))

  useEffect(() => {
    setHistory(readPromptHistory(storageKey, { allowLegacyFallback }))
  }, [allowLegacyFallback, storageKey])

  const push = useCallback((prompt: string) => {
    if (!prompt.trim()) return
    setHistory((prev) => {
      const next = [prompt.trim(), ...prev.filter((p) => p !== prompt.trim())].slice(0, 12)
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { history, push }
}

/* ─── Prompt templates ─────────────────────────────── */

const PROMPT_TEMPLATES = [
  {
    category: 'Portrait',
    prompts: [
      'Quiet studio portrait, soft side light, deep charcoal backdrop, restrained contrast',
      'Three-quarter portrait, natural skin texture, clean catchlights, editorial framing',
      'Close portrait with shallow depth of field, muted palette, calm expression, polished finish',
    ],
  },
  {
    category: 'Interiors',
    prompts: [
      'Sunlit reading room, oak shelves, linen curtains, warm shadows, tactile detail',
      'Minimal hotel lobby, polished stone floor, reflected evening light, quiet luxury',
      'Modern kitchen with brushed metal accents, soft daylight, lived-in styling, clean composition',
    ],
  },
  {
    category: 'Architecture',
    prompts: [
      'Concrete gallery facade, long shadows, pale sky, crisp material contrast',
      'Glass tower at blue hour, restrained reflections, precise lines, atmospheric city edge',
      'Stone courtyard after rain, soft sunset, weathered surfaces, balanced perspective',
    ],
  },
  {
    category: 'Editorial',
    prompts: [
      'Editorial still life, folded paper, brushed metal, controlled highlights, matte shadows',
      'Street editorial at blue hour, tailored coat, wet pavement reflections, calm motion blur',
      'Product study on smoked glass, soft overhead light, tactile materials, commercial finish',
    ],
  },
  {
    category: 'Materials',
    prompts: [
      'Brushed aluminum surface, subtle wear, cool reflections, macro detail',
      'Folded silk in low light, soft gradients, tactile weave, close crop',
      'Handmade ceramic glaze, hairline cracks, warm neutral tones, macro study',
    ],
  },
] as const

/* ─── Placeholder prompts ──────────────────────────── */

const LEGACY_PLACEHOLDER_PROMPTS = [
  'A neon-lit Tokyo alley at midnight, rain-soaked reflections, cinematic mood…',
  'Minimalist perfume bottle on dark marble, studio lighting, product photography…',
  'Ancient dragon perched on crystal ruins, aurora borealis, fantasy concept art…',
  'Fashion editorial, model in flowing silk, golden hour, soft bokeh background…',
  'Futuristic architecture overlooking the ocean, glass and concrete, sunset…',
]

/* ─── Aspect presets ───────────────────────────────── */

void LEGACY_PLACEHOLDER_PROMPTS

const PLACEHOLDER_PROMPTS = [
  'Rain-soaked side street at blue hour, reflected shop lights, restrained contrast...',
  'Perfume bottle on dark stone, soft overhead light, clean commercial framing...',
  'Ancient watchtower above a frozen lake, wind-cut snow, pale sunrise...',
  'Tailored coat in motion, quiet street, soft daylight, editorial finish...',
  'Coastal house in poured concrete and glass, sea haze, late afternoon light...',
]

const aspectPresets = {
  '1:1':  { aspect: 'aspect-square' },
  '16:9': { aspect: 'aspect-video' },
  '9:16': { aspect: 'aspect-[9/16]' },
  '4:5':  { aspect: 'aspect-[4/5]' },
  '3:4':  { aspect: 'aspect-[3/4]' },
  '2:3':  { aspect: 'aspect-[2/3]' },
} as const

const aspectOrder: Array<keyof typeof aspectPresets> = ['1:1', '16:9', '9:16', '4:5', '3:4', '2:3']
const DEFAULT_CREATE_STEPS = 28
const DEFAULT_CFG_SCALE = 6.5
const DEFAULT_OUTPUT_COUNT = 1

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
  if (normalized === 'running' || normalized === 'queued') return 'Creating your image…'
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

function getPlanRank(plan: IdentityPlan | null | undefined) {
  switch (plan) {
    case 'guest':
      return 0
    case 'creator':
      return 2
    case 'pro':
      return 3
    case 'free':
    default:
      return 1
  }
}

function formatPlanLabel(plan: IdentityPlan | null | undefined) {
  switch (plan) {
    case 'creator':
      return 'Creator'
    case 'pro':
      return 'Pro'
    case 'guest':
      return 'Guest'
    case 'free':
    default:
      return 'Free'
  }
}

function resolveDisplayedCreditCost(
  model: Pick<ModelCatalogEntry, 'credit_cost'>,
  guide?: Pick<GenerationCreditGuideEntry, 'reserved_credit_cost' | 'quoted_credit_cost' | 'settlement_credit_cost'>,
) {
  const candidates = [
    guide?.reserved_credit_cost,
    guide?.quoted_credit_cost,
    guide?.settlement_credit_cost,
    model.credit_cost,
  ]
  return candidates.find((value) => typeof value === 'number' && value > 0) ?? 0
}

function isModelLockedForPlan(
  model: ModelCatalogEntry,
  activePlan: IdentityPlan | null | undefined,
  canAccessAllModels: boolean,
) {
  if (canAccessAllModels) return false
  return getPlanRank(activePlan) < getPlanRank(model.min_plan)
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
  const { addToast } = useToast()
  const { projectId: routeProjectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()

  const requestedProjectId = routeProjectId ?? searchParams.get('projectId')
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const canUseLocalModels = Boolean(auth?.identity.owner_mode && auth?.identity.local_access)
  const isPageVisible = usePageVisibility()

  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModelId, setSelectedModelId] = useState('flux-2-klein')
  const [aspectRatio, setAspectRatio] = useState<keyof typeof aspectPresets>('1:1')
  const [steps, setSteps] = useState(DEFAULT_CREATE_STEPS)
  const [cfgScale, setCfgScale] = useState(DEFAULT_CFG_SCALE)
  const [outputCount, setOutputCount] = useState(DEFAULT_OUTPUT_COUNT)
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
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplateCategory, setActiveTemplateCategory] = useState(0)
  const [sharingToastId, setSharingToastId] = useState<string | null>(null)
  const promptHistoryStorageKey = useMemo(() => {
    if (auth?.identity?.id) {
      return buildPromptHistoryStorageKey(auth.identity.id)
    }
    return buildPromptHistoryStorageKey('guest-browser')
  }, [auth?.identity?.id])
  const { history: promptHistory, push: pushPromptHistory } = usePromptHistory(promptHistoryStorageKey, {
    allowLegacyFallback: !auth?.identity?.id,
  })

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
  const visibleModels = useMemo(
    () => models.filter((entry) => getCreativeProfileKey(entry.id) !== 'signature'),
    [models],
  )
  const creditGuideByModelId = useMemo(
    () =>
      new Map(
        (billingQuery.data?.generation_credit_guide?.models ?? []).map((entry) => [entry.model_id, entry] as const),
      ),
    [billingQuery.data],
  )
  const activeAccountTier = billingQuery.data?.account_tier ?? auth?.identity?.plan ?? 'free'
  const canAccessAllModels = Boolean(auth?.identity.owner_mode || auth?.identity.root_admin)
  const accessibleModels = useMemo(
    () => visibleModels.filter((entry) => !isModelLockedForPlan(entry, activeAccountTier, canAccessAllModels)),
    [activeAccountTier, canAccessAllModels, visibleModels],
  )
  const selectedModel = useMemo(
    () => visibleModels.find((entry) => entry.id === selectedModelId) ?? accessibleModels[0] ?? visibleModels[0],
    [accessibleModels, selectedModelId, visibleModels],
  )
  const selectedModelCreditGuide = useMemo(
    () => billingQuery.data?.generation_credit_guide?.models?.find((entry) => entry.model_id === selectedModel?.id) ?? null,
    [billingQuery.data, selectedModel],
  )
  const selectedModelCreditCost = useMemo(
    () => (selectedModel ? resolveDisplayedCreditCost(selectedModel, selectedModelCreditGuide ?? undefined) : 0),
    [selectedModel, selectedModelCreditGuide],
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
  const isOutOfCredits = !hasUnlimitedCredits && runtimeCredits <= 0
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
    if (!accessibleModels.length) return
    if (!accessibleModels.some((entry) => entry.id === selectedModelId)) {
      setSelectedModelId(accessibleModels[0].id)
    }
  }, [accessibleModels, selectedModelId])

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
    setSteps(parseBoundedInt(searchParams.get('steps'), DEFAULT_CREATE_STEPS, 1, 50))
    setCfgScale(parseBoundedFloat(searchParams.get('cfg_scale'), DEFAULT_CFG_SCALE, 1, 20))
    setOutputCount(parseBoundedInt(searchParams.get('output_count'), DEFAULT_OUTPUT_COUNT, 1, 4))
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
    const estimatedHeight = Math.min(Math.max(visibleModels.slice(0, 6).length * 82 + 16, 180), 360)
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    setModelPickerDirection(spaceBelow < estimatedHeight && spaceAbove > spaceBelow ? 'up' : 'down')
  }, [modelPickerOpen, visibleModels])

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
    mutationFn: () =>
      studioApi.saveStyleFromPrompt({
        prompt,
        negative_prompt: negativePrompt,
        preferred_model_id: selectedModelId,
        preferred_aspect_ratio: aspectRatio,
        preferred_steps: steps,
        preferred_cfg_scale: cfgScale,
        preferred_output_count: outputCount,
      }),
    onSuccess: async (style) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['styles'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
      addToast('success', `"${style.title}" saved to My Styles.`)
    },
    onError: (error) => {
      addToast('error', error instanceof Error ? error.message : 'Style could not be saved.')
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
  }, [aspectRatio, blockedByCurrentCredits, cfgScale, ensureProjectId, missingRequiredReference, negativePrompt, outputCount, prompt, pushPromptHistory, queryClient, referenceAssetId, selectedModel, selectedModelCreditGuide, steps])

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
            Create is Studio&apos;s direct image workspace. Start here when you know what you want to make.
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
            <p className="mt-1 text-sm text-zinc-500">
              {isOutOfCredits
                ? 'Shape the prompt now, then top up when you are ready to run it.'
                : 'Describe the image, pick the model, then run it.'}
            </p>
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
          <div className="relative z-10 flex flex-col rounded-[18px] bg-[#0c0d12]/40 p-6 pb-14 transition-all duration-500 focus-within:bg-[#0c0d12]/80 focus-within:ring-1 focus-within:ring-white/[0.08] focus-within:shadow-[0_20px_80px_-20px_rgba(255,255,255,0.06)]">
            
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
                      className={`flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                        activeTemplateCategory === i
                          ? 'bg-white/[0.1] text-white ring-1 ring-white/[0.15]'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
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
              className={`w-full resize-none bg-transparent text-[1.1rem] md:text-[1.25rem] font-normal leading-[1.6] tracking-[-0.01em] text-zinc-200 outline-none transition-all placeholder:text-zinc-600 focus:text-white ${runningJobs > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '140px' }}
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
                Save style
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
                title="Refine prompt"
                className="group flex h-9 items-center gap-1.5 rounded-full bg-[rgb(var(--primary-light)/0.05)] px-4 text-[12px] font-semibold tracking-wide text-[rgb(var(--primary-light))] ring-1 ring-[rgb(var(--primary-light)/0.2)] shadow-[0_0_15px_rgba(var(--primary-light),0.1)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[rgb(var(--primary-light)/0.1)] hover:ring-[rgb(var(--primary-light)/0.4)] hover:shadow-[0_0_20px_rgba(var(--primary-light),0.2)] hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {improveState === 'working' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-[rgb(var(--primary-light))]" />}
                {improveState === 'done' ? 'Refined' : improveState === 'fallback' ? 'Refined' : 'Refine prompt'}
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
                {(negativePrompt || cfgScale !== DEFAULT_CFG_SCALE || outputCount !== DEFAULT_OUTPUT_COUNT) && (
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
                      placeholder="Things to avoid: blur, oversharpening, extra fingers..."
                      className="w-full resize-none rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 transition focus:border-white/[0.12] focus:bg-white/[0.04]"
                      style={{ maxHeight: '80px' }}
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


          {/* Controls bar */}
          <div className="relative z-20 flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between bg-transparent">
            {/* Left: aspect ratio picker and model picker */}
            <div className="flex flex-wrap items-center gap-2">
              <div ref={ratioPickerRef} className="relative">
                <button
                  ref={ratioPickerButtonRef}
                  onClick={() => setRatioPickerOpen((value) => !value)}
                  className="group flex h-11 items-center gap-3 rounded-[14px] bg-white/[0.02] px-4 text-left ring-1 ring-white/[0.05] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.06] hover:ring-white/[0.1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <div className="flex h-[22px] w-[22px] items-center justify-center opacity-90">
                    <div className={`border-2 ${activeAspect.aspect} w-full rounded-sm border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light)/0.18)]`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Format</div>
                    <div className="mt-0.5 text-[13px] font-semibold text-white">{aspectRatio}</div>
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
                            <div className="min-w-0 text-[13px] font-semibold tracking-wide">{option.ratio}</div>
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
                  className="group flex h-11 items-center gap-3 rounded-[14px] bg-white/[0.02] px-4 text-left ring-1 ring-white/[0.05] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.06] hover:ring-white/[0.1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Model</div>
                    <div className="truncate text-[13px] font-semibold text-white">
                      {selectedModel ? getStudioModelDisplayName(selectedModel.id, selectedModel.label) : 'FLUX.2'}
                    </div>
                  </div>
                  <ChevronDown className={`ml-2 h-4 w-4 shrink-0 text-zinc-500 transition-transform ${modelPickerOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {modelPickerOpen ? (
                  <div className={`${modelPickerDirection === 'up' ? 'bottom-[calc(100%+8px)] origin-bottom' : 'top-[calc(100%+8px)] origin-top'} absolute left-0 z-50 w-[min(320px,calc(100vw-48px))] overflow-y-auto rounded-[20px] border border-white/[0.08] bg-[#0c0d11] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.8)] backdrop-blur-3xl`} style={{ maxHeight: 'min(360px, calc(100vh - 48px))' }}>
                    {visibleModels.slice(0, 6).map((entry) => {
                      const active = entry.id === selectedModel?.id
                      const locked = isModelLockedForPlan(entry, activeAccountTier, canAccessAllModels)
                      const guide = creditGuideByModelId.get(entry.id)
                      const displayedCreditCost = resolveDisplayedCreditCost(entry, guide)
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={locked}
                          onClick={() => { setSelectedModelId(entry.id); setModelPickerOpen(false); }}
                          aria-label={`${getStudioModelDisplayName(entry.id, entry.label)} model, ${displayedCreditCost} credits${entry.min_plan !== 'free' ? `, ${formatPlanLabel(entry.min_plan)}` : ''}`}
                          className={`flex w-full items-start justify-between gap-3 rounded-[16px] px-3.5 py-3 text-left transition ${
                            active
                              ? 'bg-white/[0.08] text-white'
                              : locked
                                ? 'cursor-not-allowed text-zinc-600'
                                : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide">
                              {active ? <Check className="h-3.5 w-3.5 text-white" /> : <span className="h-3.5 w-3.5" />}
                              <span className="truncate">{getStudioModelDisplayName(entry.id, entry.label)}</span>
                            </div>
                            <div className="mt-1 pl-[1.3rem] flex flex-wrap items-center gap-2 text-[11px] leading-5 text-zinc-500">
                              <span>{displayedCreditCost.toLocaleString()} credits</span>
                              {entry.min_plan !== 'free' ? (
                                <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                                  {formatPlanLabel(entry.min_plan)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {locked ? (
                            <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              Locked
                            </span>
                          ) : null}
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
                    {selectedModelCreditCost} Credits
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Per Image</div>
                </div>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedModel || submittingCount > 0 || missingRequiredReference || blockedByCurrentCredits}
                className="group relative flex h-12 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-[14px] px-10 text-[14px] font-bold text-black bg-white transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:bg-white hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none shadow-[0_0_24px_rgba(255,255,255,0.15)]"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {submittingCount ? <RefreshCw className="h-4.5 w-4.5 animate-spin text-black/80" /> : <Wand2 className="h-4.5 w-4.5 text-black" />}
                  {submittingCount ? 'Creating…' : 'Generate'}
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
                      {sharingToastId === job.id ? 'Copying…' : 'Copy share link'}
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
