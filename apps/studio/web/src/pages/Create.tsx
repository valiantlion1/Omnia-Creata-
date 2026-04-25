import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, Dices, RefreshCw, SlidersHorizontal, Sparkles, Wand2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { useToast } from '@/components/Toast'
import { useLightbox } from '@/components/Lightbox'
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
import { toUserFacingErrorMessage } from '@/lib/uiError'
import { usePageVisibility } from '@/lib/usePageVisibility'
import alpineLake from '@/assets/landing/studio/alpine-lake.png'
import atelierInterior from '@/assets/landing/studio/atelier-interior.png'
import coralFlower from '@/assets/landing/studio/coral-flower.png'
import heroRiviera from '@/assets/landing/studio/hero-riviera.png'

/* ─── Prompt history ──────────────────────────────── */

const LEGACY_PROMPT_HISTORY_KEY = 'omnia-prompt-history'
const PROMPT_HISTORY_KEY_PREFIX = 'omnia-prompt-history:'
const ACTIVE_CREATE_SESSION_KEY_PREFIX = 'omnia-create-active-session:'

function buildPromptHistoryStorageKey(scope: string) {
  return `${PROMPT_HISTORY_KEY_PREFIX}${scope}`
}

function buildActiveCreateSessionStorageKey(scope: string) {
  return `${ACTIVE_CREATE_SESSION_KEY_PREFIX}${scope}`
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

function writeStoredSessionId(storageKey: string, value: string | null) {
  try {
    if (value) {
      localStorage.setItem(storageKey, value)
      return
    }
    localStorage.removeItem(storageKey)
  } catch {
    /* noop */
  }
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

const STARTER_DIRECTIONS = [
  {
    label: 'Editorial portrait',
    prompt: 'Editorial portrait, calm expression, soft side light, tactile wardrobe detail, restrained charcoal backdrop',
  },
  {
    label: 'Product study',
    prompt: 'Premium product study on dark stone, soft overhead light, precise reflections, clean commercial finish',
  },
  {
    label: 'World mood',
    prompt: 'Cinematic landscape moodboard, layered mountain light, atmospheric depth, quiet luxury color grade',
  },
] as const

const CREATE_STUDIO_SAMPLES = [
  {
    label: '01',
    title: 'Coastal villa',
    image: heroRiviera,
    prompt: 'Cinematic coastal villa at golden hour, Italian Riviera, soft sunlight, bougainvillea, fine art photography',
  },
  {
    label: '02',
    title: 'Atelier interior',
    image: atelierInterior,
    prompt: 'Quiet creative atelier, warm window light, tactile surfaces, editorial interior composition',
  },
  {
    label: '03',
    title: 'Alpine light',
    image: alpineLake,
    prompt: 'Alpine lake at first light, atmospheric depth, painterly realism, polished editorial finish',
  },
  {
    label: '04',
    title: 'Coral study',
    image: coralFlower,
    prompt: 'Coral floral macro study, sculptural detail, soft dramatic light, premium material texture',
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
  errorCode: string | null
  dismissed: boolean
  notice: string | null
}

type CreatePreviewItem = {
  key: string
  label: string
  title: string
  prompt: string
  imageUrl: string | null
  modelLabel: string
  status: JobStatus | 'sample'
  slotIndex: number
  canOpen: boolean
  source: 'session' | 'sample'
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

function getPreviewStateLabel(status: CreatePreviewItem['status']) {
  if (status === 'sample') return 'Starter'
  return getToastLabel(status)
}

function normalizePreviewSlotStatus(status: string): JobStatus {
  if (status === 'claimed') return 'running'
  return normalizeJobStatus(status as JobStatus)
}

function humanizeGenerationError(error: string | null, errorCode?: string | null) {
  const normalizedCode = (errorCode ?? '').trim().toLowerCase()
  const normalizedError = (error ?? '').trim().toLowerCase()

  if (normalizedCode === 'provider_auth' || normalizedError.includes('returned 401') || normalizedError.includes('returned 403')) {
    return 'This render lane is temporarily unavailable.'
  }
  if (normalizedCode === 'provider_timeout') {
    return 'This render took too long to finish.'
  }
  if (normalizedCode === 'provider_network') {
    return 'The render lane could not be reached.'
  }
  if (normalizedCode === 'provider_not_configured') {
    return 'This render lane is not available right now.'
  }
  if (normalizedCode === 'safety_block') {
    return 'This request could not be rendered under current safety rules.'
  }
  if (normalizedCode === 'provider_spend_guardrail') {
    return 'This render lane is paused until billing is healthy again.'
  }
  if (normalizedCode === 'generation_timed_out' || normalizedCode === 'orphaned_job_timeout') {
    return 'This render stalled before it could finish.'
  }
  if (normalizedCode === 'retry_budget_exhausted') {
    return 'This render failed too many times to finish safely.'
  }
  if (normalizedError.includes('pollinations')) {
    return 'The fallback image lane is unavailable right now.'
  }

  if (!error) return 'This image could not be created.'
  return error
}

function getToastDescription(job: GenerationToast) {
  const normalized = normalizeJobStatus(job.status)
  if (normalized === 'succeeded') return 'Your image is ready! Check your Library.'
  if (normalized === 'running' || normalized === 'queued') return 'Creating your image…'
  return humanizeGenerationError(job.error, job.errorCode)
}

function mapGenerationToToast(generation: Generation, projectId: string): GenerationToast {
  return {
    id: generation.job_id,
    title: generation.display_title || generation.title,
    status: generation.status,
    outputCount: generation.output_count,
    projectId,
    error: generation.error,
    errorCode: generation.error_code ?? null,
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
  const { addToast } = useToast()
  const { openLightbox } = useLightbox()
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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeTemplateCategory, setActiveTemplateCategory] = useState(0)
  const [sharingToastId, setSharingToastId] = useState<string | null>(null)
  const [selectedPreviewSlotIndex, setSelectedPreviewSlotIndex] = useState(0)
  const activeSessionStorageKey = useMemo(() => {
    if (auth?.identity?.id) {
      return buildActiveCreateSessionStorageKey(auth.identity.id)
    }
    return buildActiveCreateSessionStorageKey('guest-browser')
  }, [auth?.identity?.id])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
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
  const recentSessionsQuery = useQuery({
    queryKey: ['generations', 'create', 'history'],
    queryFn: () => studioApi.listGenerations(undefined, { limit: 12, sort: 'newest' }),
    enabled: canLoadPrivate,
    refetchInterval: isPageVisible ? 5000 : false,
  })
  const activeSessionQuery = useQuery({
    queryKey: ['generation', 'create', activeSessionId],
    queryFn: () => studioApi.getGeneration(activeSessionId ?? ''),
    enabled: canLoadPrivate && Boolean(activeSessionId),
    refetchInterval: (query) => {
      const session = query.state.data as Generation | undefined
      if (!session || !isPageVisible) return false
      return isTerminalJobStatus(session.status) ? false : 2500
    },
  })

  const models = useMemo(
    () => sortModels(modelsQuery.data?.models ?? [], canUseLocalModels),
    [canUseLocalModels, modelsQuery.data],
  )
  const visibleModels = useMemo(
    () => models.filter((entry) => getCreativeProfileKey(entry.id) !== 'signature'),
    [models],
  )
  const recentSessions = recentSessionsQuery.data?.generations ?? []
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
  const activeSession = useMemo(() => {
    if (activeSessionQuery.data) return activeSessionQuery.data
    if (!activeSessionId) return null
    return recentSessions.find((session) => session.job_id === activeSessionId) ?? null
  }, [activeSessionId, activeSessionQuery.data, recentSessions])
  const recentSessionById = useMemo(
    () => new Map(recentSessions.map((session) => [session.job_id, session] as const)),
    [recentSessions],
  )
  const historyEntries = useMemo(() => {
    const seen = new Set<string>()
    const entries: Array<{ id: string; prompt: string; sessionId: string | null }> = []

    recentSessions.forEach((session) => {
      const sessionPrompt = session.prompt_snapshot.prompt.trim()
      if (!sessionPrompt || seen.has(sessionPrompt)) return
      seen.add(sessionPrompt)
      entries.push({
        id: `session:${session.job_id}`,
        prompt: sessionPrompt,
        sessionId: session.job_id,
      })
    })

    promptHistory.forEach((entry, index) => {
      const historyPrompt = entry.trim()
      if (!historyPrompt || seen.has(historyPrompt)) return
      seen.add(historyPrompt)
      entries.push({
        id: `prompt:${index}:${historyPrompt.slice(0, 18)}`,
        prompt: historyPrompt,
        sessionId: null,
      })
    })

    return entries.slice(0, 12)
  }, [promptHistory, recentSessions])
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
  const runtimeCreditLabel = hasUnlimitedCredits ? 'Unlimited' : runtimeCredits.toLocaleString()
  const isOutOfCredits = !hasUnlimitedCredits && runtimeCredits <= 0
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
  const estimatedReserve = useMemo(
    () => selectedModelCreditCost * Math.max(outputCount, 1),
    [outputCount, selectedModelCreditCost],
  )
  const activeSessionAspectRatio = useMemo(() => {
    const ratio = activeSession?.prompt_snapshot.aspect_ratio
    return ratio && ratio in aspectPresets ? (ratio as keyof typeof aspectPresets) : null
  }, [activeSession?.prompt_snapshot.aspect_ratio])
  const previewMatchesDraft = Boolean(
    activeSession
    && (activeSession.output_count ?? activeSession.slots?.length ?? 0) === outputCount
    && (!activeSessionAspectRatio || activeSessionAspectRatio === aspectRatio),
  )
  const previewSession = previewMatchesDraft ? activeSession : null
  const previewSessionSlots = useMemo(
    () => previewSession?.slots ?? [],
    [previewSession?.slots],
  )
  const hasPreviewSurface = previewSessionSlots.length > 0
  const previewItems = useMemo<CreatePreviewItem[]>(() => {
    if (previewSessionSlots.length > 0) {
      return previewSessionSlots.map((slot) => {
        const imageUrl = slot.output?.thumbnail_url ?? slot.output?.url ?? null
        const title = previewSession?.display_title || previewSession?.title || `Variation ${slot.slot_index + 1}`
        return {
          key: `${previewSession?.job_id ?? 'session'}:${slot.slot_index}`,
          label: String(slot.slot_index + 1).padStart(2, '0'),
          title,
          prompt: previewSession?.prompt_snapshot.prompt ?? prompt,
          imageUrl,
          modelLabel: getStudioModelDisplayName(
            previewSession?.model ?? selectedModel?.id,
            previewSession?.display_model_label ?? selectedModel?.label,
          ),
          status: normalizePreviewSlotStatus(slot.slot_status),
          slotIndex: slot.slot_index,
          canOpen: Boolean(imageUrl) && slot.slot_status === 'succeeded',
          source: 'session',
        }
      })
    }

    return CREATE_STUDIO_SAMPLES.map((sample, index) => ({
      key: `sample:${sample.label}`,
      label: sample.label,
      title: sample.title,
      prompt: sample.prompt,
      imageUrl: sample.image,
      modelLabel: selectedModel ? getStudioModelDisplayName(selectedModel.id, selectedModel.label) : 'Omnia Model',
      status: 'sample',
      slotIndex: index,
      canOpen: false,
      source: 'sample',
    }))
  }, [previewSession, previewSessionSlots, prompt, selectedModel])
  const selectedPreviewItem = previewItems.find((item) => item.slotIndex === selectedPreviewSlotIndex) ?? previewItems[0] ?? null
  const leftPreviewItems = previewItems.slice(0, 2)
  const rightPreviewItems = previewItems.slice(2, 4)

  /* ─── Effects ─────────────────────────────────── */

  useEffect(() => {
    if (previewItems.some((item) => item.slotIndex === selectedPreviewSlotIndex)) return
    setSelectedPreviewSlotIndex(previewItems[0]?.slotIndex ?? 0)
  }, [previewItems, selectedPreviewSlotIndex])

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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /* ─── Auto-resize textarea ────────────────────── */

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 82)}px`
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

            if (
              job.status !== snapshot.status
              || job.outputCount !== snapshot.output_count
              || job.error !== snapshot.error
              || job.errorCode !== (snapshot.error_code ?? null)
            ) {
              hasChanges = true
              return {
                ...job,
                title: snapshot.title,
                status: snapshot.status,
                outputCount: snapshot.output_count,
                error: snapshot.error,
                errorCode: snapshot.error_code ?? null,
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

  const rememberActiveSession = useCallback((sessionId: string | null) => {
    setActiveSessionId(sessionId)
    writeStoredSessionId(activeSessionStorageKey, sessionId)
  }, [activeSessionStorageKey])

  const applySessionToDraft = useCallback((session: Generation | null) => {
    if (!session) return
    setPrompt(session.prompt_snapshot.prompt ?? '')
    setNegativePrompt(session.prompt_snapshot.negative_prompt ?? '')
    setSelectedModelId(session.prompt_snapshot.model ?? session.model)
    const nextAspect = session.prompt_snapshot.aspect_ratio
    if (nextAspect && nextAspect in aspectPresets) {
      setAspectRatio(nextAspect as keyof typeof aspectPresets)
    }
    setReferenceAssetId(session.prompt_snapshot.reference_asset_id ?? null)
    setSteps(parseBoundedInt(String(session.prompt_snapshot.steps ?? DEFAULT_CREATE_STEPS), DEFAULT_CREATE_STEPS, 1, 50))
    setCfgScale(parseBoundedFloat(String(session.prompt_snapshot.cfg_scale ?? DEFAULT_CFG_SCALE), DEFAULT_CFG_SCALE, 1, 20))
    setOutputCount(parseBoundedInt(String(session.output_count ?? DEFAULT_OUTPUT_COUNT), DEFAULT_OUTPUT_COUNT, 1, 4))
    setImproveState('idle')
  }, [])

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
    rememberActiveSession(job.id)
  }, [rememberActiveSession])

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
      setToastNotice(job.id, toUserFacingErrorMessage(error, 'Unable to copy project share link.'))
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
      setCreateError(toUserFacingErrorMessage(error, 'Prompt could not be improved.'))
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
      addToast('error', toUserFacingErrorMessage(error, 'Style could not be saved.'))
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
      queryClient.setQueryData(['generation', 'create', generation.job_id], generation)
      rememberActiveSession(generation.job_id)
      setGenerationToasts((current) => [mapGenerationToToast(generation, generation.project_id || projectId), ...current.filter((job) => job.id !== generation.job_id)])
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    } catch (error) {
      setCreateError(toUserFacingErrorMessage(error, 'Generation could not be started.'))
    } finally {
      setSubmittingCount((value) => Math.max(0, value - 1))
    }
  }, [aspectRatio, blockedByCurrentCredits, cfgScale, ensureProjectId, missingRequiredReference, negativePrompt, outputCount, prompt, pushPromptHistory, queryClient, referenceAssetId, selectedModel, selectedModelCreditGuide, steps])

  const handleOpenSelectedPreview = useCallback(() => {
    if (!selectedPreviewItem?.canOpen || !selectedPreviewItem.imageUrl) return
    openLightbox(selectedPreviewItem.imageUrl, selectedPreviewItem.title, {
      title: selectedPreviewItem.title,
      prompt: selectedPreviewItem.prompt,
      authorName: auth?.identity.display_name ?? 'You',
      authorUsername: auth?.identity.username ?? 'creator',
      aspectRatio: previewSession?.prompt_snapshot.aspect_ratio ?? aspectRatio,
      model: selectedPreviewItem.modelLabel,
    })
  }, [aspectRatio, auth?.identity.display_name, auth?.identity.username, openLightbox, previewSession?.prompt_snapshot.aspect_ratio, selectedPreviewItem])

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
      <AppPage className="min-h-[calc(100svh-72px)] max-w-[1800px] gap-0 py-4 md:py-7">
        <div className="min-w-0">

        {/* ── Header ─────────────────────────────── */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-sm font-semibold tracking-[-0.01em]">
              <span className="text-[#f2be62]">Create</span>
              <span className="text-white/22">/</span>
              <span className="text-white/82">New image</span>
            </div>
            <p className="mt-1 text-[12px] text-zinc-500">
              {isOutOfCredits ? 'Shape the image now; run it after credits are ready.' : 'Prompt, preview, and generate from one focused workspace.'}
            </p>
            {missingRequiredReference ? (
              <p className="mt-2 text-[12px] text-amber-300">Upload a reference image to continue</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <div className="rounded-full border border-[#f2be62]/16 bg-[#f2be62]/8 px-3 py-1.5 font-semibold text-[#f2be62]">
              {runtimeCreditLabel} credits
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 font-medium text-white/70">
              <span className={`h-2 w-2 rounded-full ${runningJobs ? 'bg-[#f2be62]' : isOutOfCredits ? 'bg-amber-300' : 'bg-emerald-400'}`} />
              {runningJobs ? `${runningJobs} creating` : isOutOfCredits ? 'Need credits' : 'Ready'}
            </div>
          </div>
        </div>


        {/* ── Result theater ─────────────────────── */}
        <section
          data-testid="create-preview-surface"
          className="mb-5 overflow-hidden rounded-[34px] border border-[#e0a94f]/15 bg-[radial-gradient(circle_at_50%_0%,rgba(224,169,79,0.12),transparent_32%),linear-gradient(180deg,rgba(18,19,17,0.98),rgba(8,10,9,0.98))] p-3 shadow-[0_34px_110px_rgba(0,0,0,0.42)] sm:p-5"
        >
          <div className="grid items-start gap-4 xl:grid-cols-[190px_minmax(0,1fr)_190px] 2xl:grid-cols-[220px_minmax(0,1fr)_220px]">
            <div className="order-2 grid grid-cols-2 gap-3 xl:order-none xl:grid-cols-1">
              {leftPreviewItems.map((item) => {
                const selected = item.slotIndex === selectedPreviewItem?.slotIndex
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedPreviewSlotIndex(item.slotIndex)}
                    className={`group relative h-[150px] overflow-hidden rounded-[24px] border bg-[#11120f] text-left transition duration-500 sm:h-[158px] xl:h-[162px] ${
                      selected
                        ? 'border-[#f2be62] shadow-[0_0_0_1px_rgba(242,190,98,0.22),0_18px_44px_rgba(0,0,0,0.36)]'
                        : 'border-white/[0.08] hover:border-[#f2be62]/45 hover:-translate-y-0.5'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(242,190,98,0.12),transparent_34%),linear-gradient(135deg,#171814,#0c0d0c)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-black/10" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/42 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/78 backdrop-blur-md">
                      {item.label}
                    </div>
                    <div className="absolute inset-x-3 bottom-3">
                      <div className="line-clamp-1 text-[12px] font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#f2be62]/75">{getPreviewStateLabel(item.status)}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleOpenSelectedPreview}
              disabled={!selectedPreviewItem?.canOpen}
              className={`order-1 group relative self-start overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#10110f] text-left shadow-[0_24px_80px_rgba(0,0,0,0.38)] transition duration-500 xl:order-none ${
                selectedPreviewItem?.canOpen ? 'cursor-zoom-in hover:border-[#f2be62]/45' : 'cursor-default'
              }`}
            >
              <div className="relative h-[280px] overflow-hidden sm:h-[320px] xl:h-[340px]">
                {selectedPreviewItem?.imageUrl ? (
                  <img
                    src={selectedPreviewItem.imageUrl}
                    alt={selectedPreviewItem.title}
                    className={`h-full w-full object-cover transition duration-700 ${
                      selectedPreviewItem.source === 'session' && selectedPreviewItem.status !== 'succeeded'
                        ? 'scale-[1.035] blur-[14px] brightness-[0.72] saturate-75'
                        : 'group-hover:scale-[1.018]'
                    }`}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_22%,rgba(242,190,98,0.18),transparent_34%),linear-gradient(135deg,#1c1d19,#0a0c0b)]" />
                )}
                <div className="absolute inset-0 create-preview-shell" />
                {selectedPreviewItem?.source === 'session' && selectedPreviewItem.status !== 'succeeded' ? (
                  <>
                    <div className="create-preview-cloud create-preview-cloud-a" />
                    <div className="create-preview-cloud create-preview-cloud-b" />
                    <div className="create-preview-sheen" />
                    <div className="create-preview-orbit-ring" />
                    <div className="create-preview-orbit-ring create-preview-orbit-ring-delayed" />
                    <div className="create-preview-orbit"><div className="create-preview-orbit-dot" /></div>
                    <div className="create-preview-core" />
                  </>
                ) : null}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 bg-gradient-to-b from-black/62 via-black/24 to-transparent px-5 py-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78">
                      <span className={`h-2 w-2 rounded-full ${hasPreviewSurface ? 'bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.55)]' : 'bg-[#f2be62] shadow-[0_0_16px_rgba(242,190,98,0.5)]'}`} />
                      {hasPreviewSurface ? 'Live result' : 'Studio preview'}
                    </div>
                    <div className="mt-1 text-[12px] text-white/48">{selectedPreviewItem?.modelLabel}</div>
                  </div>
                  <div className="rounded-full border border-white/[0.1] bg-black/28 px-3 py-1 text-[11px] font-semibold text-white/72 backdrop-blur-md">
                    {aspectRatio}
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/78 via-black/28 to-transparent px-5 pb-5 pt-20">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f2be62]">{selectedPreviewItem?.label ?? '01'} selected</div>
                      <div className="mt-1 line-clamp-2 text-[18px] font-semibold tracking-[-0.03em] text-white sm:text-[22px]">
                        {selectedPreviewItem?.title ?? 'Select a variation'}
                      </div>
                      <div className="mt-2 line-clamp-2 text-[12px] leading-5 text-white/58">{selectedPreviewItem?.prompt}</div>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/74">
                        {selectedPreviewItem?.canOpen ? 'Click to inspect' : hasPreviewSurface ? 'Rendering details' : 'Starter reference'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>

            <div className="order-3 grid grid-cols-2 gap-3 xl:order-none xl:grid-cols-1">
              {rightPreviewItems.map((item) => {
                const selected = item.slotIndex === selectedPreviewItem?.slotIndex
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedPreviewSlotIndex(item.slotIndex)}
                    className={`group relative h-[150px] overflow-hidden rounded-[24px] border bg-[#11120f] text-left transition duration-500 sm:h-[158px] xl:h-[162px] ${
                      selected
                        ? 'border-[#f2be62] shadow-[0_0_0_1px_rgba(242,190,98,0.22),0_18px_44px_rgba(0,0,0,0.36)]'
                        : 'border-white/[0.08] hover:border-[#f2be62]/45 hover:-translate-y-0.5'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(242,190,98,0.12),transparent_34%),linear-gradient(135deg,#171814,#0c0d0c)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/8 to-black/10" />
                    <div className="absolute left-3 top-3 rounded-full bg-black/42 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/78 backdrop-blur-md">
                      {item.label}
                    </div>
                    <div className="absolute inset-x-3 bottom-3">
                      <div className="line-clamp-1 text-[12px] font-semibold text-white">{item.title}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#f2be62]/75">{getPreviewStateLabel(item.status)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Prompt Area ────────────────────────── */}
        <div className="grid gap-3 overflow-visible rounded-[34px] border border-[rgba(124,90,43,0.55)] bg-[radial-gradient(circle_at_30%_0%,rgba(224,169,79,0.08),transparent_30%),linear-gradient(180deg,rgba(18,17,14,0.98),rgba(8,9,8,0.98))] p-3 shadow-[0_24px_86px_rgba(0,0,0,0.4)] sm:p-4 xl:grid-cols-[minmax(0,1fr)_410px] xl:items-stretch">
          
          {/* Prompt Box */}
          <div className="relative z-10 order-1 flex h-full flex-col rounded-[28px] border border-[rgba(124,90,43,0.28)] bg-[linear-gradient(180deg,rgba(17,17,14,0.94),rgba(10,11,10,0.9))] px-4 pb-4 pt-4 shadow-[0_18px_58px_rgba(0,0,0,0.26)] transition-all duration-500 focus-within:border-[rgba(242,190,98,0.28)] sm:px-5 xl:order-none xl:col-start-1">

            <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#f2be62]/75" /> Describe your image</span>
              <div className="flex items-center gap-2">
                {historyEntries.length > 0 && (
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
                        <div className="max-h-[320px] overflow-y-auto py-2">
                          {historyEntries.map((entry) => (
                            <button
                              key={entry.id}
                              onClick={() => {
                                if (entry.sessionId) {
                                  const session = recentSessionById.get(entry.sessionId) ?? null
                                  if (session) {
                                    applySessionToDraft(session)
                                  } else {
                                    setPrompt(entry.prompt)
                                  }
                                  rememberActiveSession(entry.sessionId)
                                } else {
                                  setPrompt(entry.prompt)
                                  rememberActiveSession(null)
                                }
                                setShowHistory(false)
                              }}
                              className={`block w-full px-4 py-3 text-left transition ${
                                entry.sessionId && activeSession?.job_id === entry.sessionId
                                  ? 'bg-white/[0.06]'
                                  : 'hover:bg-white/[0.05]'
                              }`}
                            >
                              <span className="line-clamp-2 text-[13px] leading-6 text-zinc-300 transition group-hover:text-white">
                                {entry.prompt}
                              </span>
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
              className={`w-full resize-none rounded-[18px] border border-white/[0.1] bg-[#171711] px-4 py-3 text-[0.98rem] font-normal leading-[1.5] tracking-[-0.012em] text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-[#f2be62]/34 focus:bg-[#1b1a13] focus:text-white md:text-[1rem] ${runningJobs > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ minHeight: '78px' }}
            />

            {/* ✨ Improve & Random buttons */}
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => saveStyleMutation.mutate()}
                disabled={!prompt.trim() || saveStyleMutation.isPending}
                title="Save this prompt as a reusable style"
                className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.03] px-3.5 text-[11px] font-semibold tracking-wide text-zinc-300 ring-1 ring-white/[0.08] transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
                className="group flex h-8 items-center gap-1.5 rounded-full bg-[#f2be62]/7 px-3.5 text-[11px] font-semibold tracking-wide text-[#f2be62] ring-1 ring-[#f2be62]/18 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#f2be62]/12 hover:ring-[#f2be62]/32 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
              >
                {improveState === 'working' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-[rgb(var(--primary-light))]" />}
                {improveState === 'done' ? 'Refined' : improveState === 'fallback' ? 'Polished' : 'Refine prompt'}
              </button>
            </div>

            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Aspect ratio</div>
              <div className="flex flex-wrap overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/18">
                {orderedAspectOptions.map((option) => {
                  const active = option.ratio === aspectRatio
                  return (
                    <button
                      key={option.ratio}
                      type="button"
                      onClick={() => {
                        setAspectRatio(option.ratio)
                      }}
                      className={`min-h-10 flex-1 border-r border-white/[0.07] px-3 text-[12px] font-semibold transition last:border-r-0 ${
                        active
                          ? 'bg-[#f2be62]/14 text-[#f2be62] shadow-[inset_0_0_0_1px_rgba(242,190,98,0.42)]'
                          : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                      }`}
                    >
                      {option.ratio}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="relative z-20 order-2 flex flex-col gap-4 rounded-[28px] border border-[rgba(124,90,43,0.28)] bg-[linear-gradient(180deg,rgba(17,17,14,0.9),rgba(10,11,10,0.88))] p-4 shadow-[0_18px_58px_rgba(0,0,0,0.22)] xl:order-none xl:col-start-2 xl:row-start-1">
            {/* Style and model picker */}
            <div className="flex flex-col gap-2">
              <div>
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Style</div>
                <div className="grid grid-cols-3 gap-2">
                  {STARTER_DIRECTIONS.map((direction, index) => {
                    const sample = CREATE_STUDIO_SAMPLES[index]
                    return (
                      <button
                        key={direction.label}
                        type="button"
                        onClick={() => {
                          setPrompt(direction.prompt)
                          if (improveState !== 'idle') setImproveState('idle')
                        }}
                        className="group relative h-[70px] overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#11110f] text-left transition hover:-translate-y-0.5 hover:border-[#f2be62]/45"
                      >
                        {sample ? <img src={sample.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" /> : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/22 to-black/4" />
                        <div className="absolute inset-x-2 bottom-2 line-clamp-1 text-[10px] font-semibold text-white/88">{direction.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div ref={modelPickerRef} className="relative">
                <button
                  ref={modelPickerButtonRef}
                  onClick={() => setModelPickerOpen((value) => !value)}
                  className="group flex h-12 w-full items-center justify-between gap-3 rounded-[16px] bg-[#171711] px-4 text-left ring-1 ring-white/[0.08] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#1b1a13] hover:ring-[#f2be62]/22 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
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
            <div className="mt-auto flex w-full items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
              {selectedModel && selectedModel.runtime !== 'local' && (
                <div className="flex flex-col">
                  <div className="text-[12px] font-bold text-white tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[rgb(var(--baseline))]" style={{ color: 'rgb(var(--primary-light))' }} />
                    {estimatedReserve} Credits
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                    {outputCount} variation{outputCount === 1 ? '' : 's'} reserve
                  </div>
                </div>
              )}
              
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedModel || submittingCount > 0 || missingRequiredReference || blockedByCurrentCredits}
                className="group relative flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[16px] bg-[#f2be62] px-8 text-[14px] font-bold text-black shadow-[0_0_30px_rgba(242,190,98,0.22)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] hover:bg-[#ffd27a] hover:shadow-[0_0_44px_rgba(242,190,98,0.34)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:scale-100 disabled:hover:shadow-none sm:w-auto"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {submittingCount ? <RefreshCw className="h-4.5 w-4.5 animate-spin text-black/80" /> : <Wand2 className="h-4.5 w-4.5 text-black" />}
                  {submittingCount ? 'Creating…' : 'Generate image'}
                </span>
              </button>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex w-full items-center justify-between gap-2 rounded-[18px] border border-white/[0.07] bg-[#11110f]/72 px-4 py-3 text-[12px] font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-300"
            >
              <span className="text-[10px] text-zinc-600">Optional controls</span>
              <span className="relative flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Advanced
                {(negativePrompt || cfgScale !== DEFAULT_CFG_SCALE || outputCount !== DEFAULT_OUTPUT_COUNT) && (
                  <span className="absolute -right-2.5 -top-0.5 h-[6px] w-[6px] rounded-full bg-[rgb(var(--primary-light))] shadow-[0_0_6px_rgb(var(--primary-light))]" />
                )}
              </span>
            </button>
          </div>

          {showAdvanced ? (
            <div className="order-3 rounded-[24px] border border-white/[0.07] bg-[#11110f]/72 px-5 py-5 xl:col-span-2">
              <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

                  <div>
                    <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Guidance</span>
                      <span className="tabular-nums text-zinc-300">{cfgScale}</span>
                    </label>
                    <input
                      aria-label="Guidance"
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      className="accent-[rgb(var(--primary-light))] w-full h-2 rounded-full appearance-none bg-white/[0.06] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(var(--primary-light),0.5)]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      <span>Variations</span>
                      <span className="tabular-nums text-zinc-300">{outputCount}</span>
                    </label>
                    <input
                      aria-label="Variations"
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
            </div>
          ) : null}

          {/* Feedback row — only errors, no technical billing info */}
          {createError ? (
            <div className="order-4 border-t border-white/[0.04] px-5 py-3 xl:col-span-2">
              <div className="text-sm text-amber-200/80">{createError}</div>
            </div>
          ) : null}
        </div>

        </div>
      </AppPage>

      {/* ── Toast stack ──────────────────────────── */}
      {visibleToasts.length ? (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 hidden w-[320px] max-w-[calc(100vw-20px)] flex-col gap-2.5">
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
                    View session
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
