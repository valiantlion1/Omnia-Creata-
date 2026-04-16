import { clearStudioAccessToken, getStudioAccessToken } from '@/lib/studioSession'

const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
const API_BASE_URL = import.meta.env.DEV ? '' : CONFIGURED_API_BASE_URL

function buildApiUrl(path: string) {
  if (!import.meta.env.DEV && !API_BASE_URL) {
    throw new Error('Studio deployment is incomplete right now. API base URL is not configured.')
  }
  return `${API_BASE_URL}/v1${path}`
}

export type IdentityPlan = 'guest' | 'free' | 'creator' | 'pro'
export type CommercialPlanId = 'free_account' | 'creator' | 'pro' | 'credit_packs'
export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'retryable_failed'
  | 'cancelled'
  | 'timed_out'
  | 'pending'
  | 'processing'
  | 'completed'
export type CheckoutKind = 'creator_monthly' | 'pro_monthly' | 'credit_pack_small' | 'credit_pack_large'
export type Visibility = 'public' | 'private'
export type ProjectSurface = 'compose' | 'chat'

export type PlanInfo = {
  id: IdentityPlan
  label: string
  monthly_credits: number
  queue_priority: string
  max_resolution: string
  share_links: boolean
  can_generate: boolean
  can_access_chat: boolean
}

export type CreditSummary = {
  remaining: number
  monthly_remaining: number
  extra_credits: number
}

export type IdentityPayload = {
  id: string
  email: string
  display_name: string
  username?: string | null
  plan: IdentityPlan
  workspace_id: string | null
  guest?: boolean
  owner_mode?: boolean
  root_admin?: boolean
  local_access?: boolean
  accepted_terms?: boolean
  accepted_privacy?: boolean
  accepted_usage_policy?: boolean
  marketing_opt_in?: boolean
  bio?: string
  avatar_url?: string | null
  default_visibility?: Visibility
  temp_block_until?: string | null
  manual_review_state?: 'none' | 'required' | 'approved'
}

export type AuthMeResponse = {
  guest: boolean
  identity: IdentityPayload
  credits: CreditSummary
  plan: PlanInfo
  entitlements?: BillingSummary['entitlements']
  feature_entitlements?: BillingSummary['entitlements']
  wallet_balance?: number
  wallet?: BillingSummary['wallet']
  account_tier?: Exclude<IdentityPlan, 'guest'>
  subscription_tier?: Extract<IdentityPlan, 'creator' | 'pro'> | null
  usage_caps?: {
    can_generate: boolean
    can_share_links: boolean
    can_clean_export: boolean
    chat_message_limit: number
    max_chat_attachments: number
    max_incomplete_generations: number
  }
}

export type DemoLoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  identity: AuthMeResponse
}

export type PasswordAuthPayload = {
  email: string
  password: string
  captcha_token?: string
}

export type SignupPayload = PasswordAuthPayload & {
  display_name?: string
  username: string
  accepted_terms: boolean
  accepted_privacy: boolean
  accepted_usage_policy: boolean
  marketing_opt_in: boolean
}

export type PublicPlansPayload = {
  operating_mode: string
  free_account: Omit<PlanInfo, 'id'> & {
    id: 'free_account'
    entitlement_plan: 'free'
    summary: string
    feature_summary: string[]
    price_usd: number | null
    billing_period: 'month' | null
    checkout_kind: null
    recommended: false
    availability: 'included' | 'self_serve'
  }
  subscriptions: Array<Omit<PlanInfo, 'id'> & {
    id: 'creator' | 'pro'
    entitlement_plan: Extract<IdentityPlan, 'creator' | 'pro'>
    summary: string
    feature_summary: string[]
    price_usd: number | null
    billing_period: 'month' | null
    checkout_kind: CheckoutKind | null
    recommended: boolean
    availability: 'included' | 'self_serve'
  }>
  credit_packs: Array<{
    kind: CheckoutKind
    label: string
    credits: number
    price_usd: number
    plan: IdentityPlan | null
    billing_provider?: string
    kind_group?: string
  }>
  wallet: {
    contract: string
    free_account_can_buy_credit_packs: boolean
    image_generation_requires_credits_or_included_allowance: boolean
    spend_order: string
    free_image_generation_included: boolean
  }
  entitlements: Record<string, {
    can_generate: boolean
    can_share_links: boolean
    can_clean_export: boolean
    chat_message_limit: number
    max_chat_attachments: number
    max_incomplete_generations: number
  }>
  usage_caps: {
    verified_account_required_for_generation: boolean
    captcha_required_for_sensitive_flows: boolean
    free_ai_chat_limited: boolean
    free_image_generation_included: boolean
    wallet_credit_purchase_allowed: boolean
    credit_reserve_required_before_generation: boolean
  }
  featured_subscription: 'creator' | 'pro'
  plans?: Array<Omit<PlanInfo, 'id'> & {
    id: 'free_account' | 'creator' | 'pro'
    entitlement_plan: Exclude<IdentityPlan, 'guest'>
    summary: string
    feature_summary: string[]
    price_usd: number | null
    billing_period: 'month' | null
    checkout_kind: CheckoutKind | null
    recommended: boolean
    availability: 'included' | 'self_serve'
  }>
  top_up?: {
    id: 'credit_packs'
    label: string
    summary: string
    feature_summary: string[]
    options: Array<{
      kind: CheckoutKind
      label: string
      credits: number
      price_usd: number
      plan: IdentityPlan | null
      billing_provider?: string
      kind_group?: string
    }>
  }
  featured_plan?: 'creator' | 'pro'
}

export type ImprovedPromptResponse = {
  prompt: string
  provider: string
  used_llm: boolean
}

export type Project = {
  id: string
  workspace_id: string
  identity_id: string
  title: string
  description: string
  surface: ProjectSurface
  system_managed?: boolean
  cover_asset_id: string | null
  last_generation_id: string | null
  created_at: string
  updated_at: string
}

export type PromptSnapshot = {
  prompt: string
  negative_prompt: string
  model: string
  workflow: string
  reference_asset_id: string | null
  width: number
  height: number
  steps: number
  cfg_scale: number
  seed: number
  aspect_ratio: string
}

export type GenerationOutput = {
  asset_id: string
  url: string
  thumbnail_url: string | null
  mime_type: string
  width: number
  height: number
  variation_index: number
}

export type GenerationPricingLane = 'draft' | 'standard' | 'final' | 'fallback' | 'degraded'
export type EstimatedCostSource = 'provider_quote' | 'catalog_fallback'

export type Generation = {
  job_id: string
  title: string
  display_title?: string
  status: JobStatus
  library_state?: 'generating' | 'ready' | 'failed' | 'blocked'
  project_id: string
  provider: string
  provider_rollout_tier?: string | null
  provider_billable?: boolean | null
  model: string
  display_model_label?: string | null
  prompt_snapshot: PromptSnapshot
  pricing_lane: GenerationPricingLane
  estimated_cost: number
  estimated_cost_source: EstimatedCostSource
  actual_cost_usd?: number | null
  credit_cost: number
  reserved_credit_cost: number
  final_credit_cost?: number | null
  output_count: number
  outputs: GenerationOutput[]
  error: string | null
  attempt_count?: number
  created_at: string
  started_at?: string | null
  last_heartbeat_at?: string | null
  completed_at: string | null
}

export function normalizeJobStatus(status: JobStatus): Exclude<JobStatus, 'pending' | 'processing' | 'completed'> {
  switch (status) {
    case 'pending':
      return 'queued'
    case 'processing':
      return 'running'
    case 'completed':
      return 'succeeded'
    default:
      return status
  }
}

export function isTerminalJobStatus(status: JobStatus) {
  const normalized = normalizeJobStatus(status)
  return normalized === 'succeeded' || normalized === 'failed' || normalized === 'retryable_failed' || normalized === 'cancelled' || normalized === 'timed_out'
}

type CreativeProfileKey = 'fast' | 'standard' | 'premium' | 'signature' | 'studio-default'

function cleanCreativeProfileLabel(value: string) {
  return value
    .split(/[\/_-]/g)
    .filter(Boolean)
    .map((segment) => {
      const upper = segment.toUpperCase()
      if (upper === 'SDXL') return 'SDXL'
      if (upper === 'XL') return 'XL'
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
    })
    .join(' ')
}

export function getCreativeProfileKey(modelId: string | null | undefined): CreativeProfileKey {
  const normalized = modelId?.trim().toLowerCase() ?? ''
  if (normalized.includes('flux-schnell') || normalized.includes('flux.1-schnell')) return 'fast'
  if (normalized.includes('sdxl') || normalized.includes('stable-diffusion-xl')) return 'standard'
  if (normalized.includes('realvis')) return 'premium'
  if (normalized.includes('juggernaut')) return 'signature'
  return 'studio-default'
}

export function getCreativeProfileLabel(modelId: string | null | undefined, fallbackLabel?: string | null) {
  switch (getCreativeProfileKey(modelId)) {
    case 'fast':
      return 'Fast'
    case 'standard':
      return 'Standard'
    case 'premium':
      return 'Premium'
    case 'signature':
      return 'Signature'
    default:
      if (fallbackLabel?.trim()) return cleanCreativeProfileLabel(fallbackLabel)
      if (modelId?.trim()) return cleanCreativeProfileLabel(modelId)
      return 'Studio'
  }
}

export function getCreativeProfileDescription(
  modelId: string | null | undefined,
  fallbackDescription?: string | null,
) {
  switch (getCreativeProfileKey(modelId)) {
    case 'fast':
      return 'Quick starts for ideas, composition tests, and fast variations.'
    case 'standard':
      return 'Balanced quality for everyday work when you want clean, dependable detail.'
    case 'premium':
      return 'A richer finish with cleaner lighting, better texture, and more polish.'
    case 'signature':
      return 'An internal advanced finish reserved for special high-detail runs.'
    default:
      return fallbackDescription?.trim() || 'A Studio image quality lane matched to your current plan.'
  }
}

export function getCreativeProfileBadge(modelId: string | null | undefined) {
  switch (getCreativeProfileKey(modelId)) {
    case 'fast':
      return 'Quick starts'
    case 'standard':
      return 'Everyday detail'
    case 'premium':
      return 'Presentation ready'
    case 'signature':
      return 'Internal advanced'
    default:
      return 'Studio'
  }
}

export function formatGenerationPricingLane(lane: GenerationPricingLane | string | null | undefined) {
  switch (lane) {
    case 'draft':
      return 'Fast'
    case 'standard':
      return 'Standard'
    case 'final':
      return 'Premium'
    case 'fallback':
      return 'Preview'
    case 'degraded':
      return 'Limited'
    default:
      return 'Standard'
  }
}

export function formatGenerationEstimateSource(source: EstimatedCostSource | string | null | undefined) {
  switch (source) {
    case 'provider_quote':
      return 'live estimate'
    case 'catalog_fallback':
      return 'reference estimate'
    default:
      return 'estimate unavailable'
  }
}

export function formatUsdEstimate(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return 'USD n/a'
  if (value === 0) return '$0'
  if (value < 0.001) return `$${value.toFixed(5)}`
  if (value < 0.01) return `$${value.toFixed(4)}`
  if (value < 1) return `$${value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`
  return `$${value.toFixed(2)}`
}

export function formatGenerationEstimateSummary(
  estimatedCost: number | null | undefined,
  estimatedCostSource: EstimatedCostSource | string | null | undefined,
) {
  return `${formatUsdEstimate(estimatedCost)} ${formatGenerationEstimateSource(estimatedCostSource)}`
}

export function formatGenerationStartCapacity(maxStartableJobsNow: number | null, startStatus: string) {
  if (startStatus === 'unlimited') return 'Unlimited capacity'
  if (startStatus === 'no_hold') return 'No credits held remotely'
  if (maxStartableJobsNow === 0) return 'Insufficent credits'
  if (maxStartableJobsNow === 1) return '1 start remaining'
  if (maxStartableJobsNow == null) return 'Capacity syncing'
  return `${maxStartableJobsNow} starts remaining`
}

export function formatGenerationGuideSummary(entry: Pick<
  GenerationCreditGuideEntry,
  | 'pricing_lane'
  | 'planned_provider'
  | 'reserved_credit_cost'
  | 'settlement_credit_cost'
  | 'max_startable_jobs_now'
  | 'start_status'
  | 'estimated_cost'
  | 'estimated_cost_source'
>) {
  if (entry.reserved_credit_cost === entry.settlement_credit_cost) {
    return `${entry.settlement_credit_cost} credits per generation`
  }
  return `Up to ${entry.reserved_credit_cost} credits held (usually ${entry.settlement_credit_cost} per generation)`
}

export function describeGenerationLaneTrust(
  lane: GenerationPricingLane | string | null | undefined,
  _provider?: string | null,
) {
  switch (lane) {
    case 'draft':
      return 'Studio uses minimal compute for rapid exploration and layout planning.'
    case 'final':
      return 'Studio devotes extended compute time for premium rendering and fine details.'
    case 'fallback':
      return 'Premium connections are offline so reference models are active.'
    case 'degraded':
      return 'Studio capacity is limited so premium features are temporarily unavailable.'
    default:
      return 'Studio balances speed and quality for professional everyday rendering.'
  }
}

export function describePendingGenerationState(
  status: JobStatus,
  lane: GenerationPricingLane | string | null | undefined,
  provider?: string | null,
) {
  const normalized = normalizeJobStatus(status)
  if (normalized === 'running') {
    return `Rendering now. ${describeGenerationLaneTrust(lane, provider)}`
  }
  return `Lined up to render next. ${describeGenerationLaneTrust(lane, provider)}`
}

export function formatGenerationCreditState(generation: Generation) {
  const normalized = normalizeJobStatus(generation.status)
  if (normalized === 'queued' || normalized === 'running') {
    if ((generation.reserved_credit_cost ?? 0) > 0) {
      return `${generation.reserved_credit_cost} credits held while rendering`
    }
    return `${generation.credit_cost} credits listed`
  }
  if (generation.final_credit_cost != null) {
    return `${generation.final_credit_cost} credits used`
  }
  return `${generation.credit_cost} credits listed`
}
export type MediaAsset = {
  id: string
  workspace_id: string
  project_id: string
  identity_id: string
  title: string
  prompt: string
  url: string
  thumbnail_url: string | null
  preview_url?: string | null
  blocked_preview_url?: string | null
  display_title?: string | null
  derived_tags?: string[]
  library_state?: 'generating' | 'ready' | 'failed' | 'blocked'
  protection_state?: 'protected' | 'blocked'
  can_open?: boolean
  can_export_clean?: boolean
  visibility?: Visibility
  metadata: Record<string, unknown>
  created_at: string
  deleted_at: string | null
}

export type StudioStyle = {
  id: string
  identity_id: string
  title: string
  prompt_modifier: string
  description: string
  category: string
  preview_image_url?: string | null
  source_kind: string
  source_style_id?: string | null
  favorite: boolean
  created_at: string
  updated_at: string
}

export type StyleCatalogEntry = {
  id: string
  title: string
  description: string
  prompt_modifier: string
  image: string
  category: string
  likes: number
  is_omnia: boolean
  saved_style_id?: string | null
  saved: boolean
  favorite: boolean
}

export type StylesPayload = {
  catalog: StyleCatalogEntry[]
  my_styles: StudioStyle[]
  favorites: string[]
}

export type PromptMemoryProfile = {
  id: string
  identity_id: string
  topic_tags: string[]
  aesthetic_tags: string[]
  repeated_phrases: string[]
  preferred_model_ids: string[]
  preferred_aspect_ratios: string[]
  negative_prompt_terms: string[]
  tone: string
  generation_count: number
  improve_count: number
  flagged_generation_count: number
  hourly_burst_peak: number
  governance_hints: string[]
  recent_prompt_examples: string[]
  context_summary: string
  created_at: string
  updated_at: string
}

export type UsageSummary = {
  plan_label: string
  credits_remaining: number
  allowance: number
  reset_at: string | null
  progress_percent: number
}

export type PublicPost = {
  id: string
  owner_username: string
  owner_display_name: string
  title: string
  prompt: string
  cover_asset: MediaAsset | null
  preview_assets: MediaAsset[]
  visibility: Visibility
  like_count: number
  viewer_has_liked: boolean
  created_at: string
  project_id: string
  style_tags: string[]
}

export type ProfileSummary = {
  display_name: string
  username: string
  avatar_url: string | null
  bio: string
  plan: IdentityPlan
  default_visibility: Visibility
  usage_summary: UsageSummary | null
  public_post_count: number
}

export type ProfilePayload = {
  profile: ProfileSummary
  posts: PublicPost[]
  own_profile: boolean
  can_edit: boolean
}

export type ChatAttachment = {
  kind: string
  url: string
  asset_id: string | null
  label: string
}

export type ChatGenerationBlueprint = {
  workflow: string
  prompt: string
  negative_prompt: string
  reference_asset_id?: string | null
  model: string
  width: number
  height: number
  steps: number
  cfg_scale: number
  aspect_ratio: string
  output_count: number
  reference_mode: string
}

export type ChatGenerationBridge = {
  workflow: string
  prompt: string
  negative_prompt: string
  reference_asset_id?: string | null
  blueprint: ChatGenerationBlueprint
}

export type ChatSuggestedActionPayload = {
  intent?: string
  mode?: string
  prompt_profile?: string
  target_surface?: string
  generation_bridge?: ChatGenerationBridge
}

export type ChatSuggestedAction = {
  id: string
  label: string
  action: string
  value: string | null
  payload?: ChatSuggestedActionPayload
}

export type ChatFeedback = 'like' | 'dislike' | null

export type ChatConversation = {
  id: string
  workspace_id: string
  identity_id: string
  title: string
  model: string
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  conversation_id: string
  identity_id: string
  role: 'user' | 'assistant'
  content: string
  parent_message_id?: string | null
  attachments: ChatAttachment[]
  suggested_actions: ChatSuggestedAction[]
  feedback?: ChatFeedback
  metadata?: Record<string, unknown>
  version?: number
  created_at: string
  edited_at?: string | null
}

export type ModelCatalogEntry = {
  id: string
  label: string
  description: string
  min_plan: IdentityPlan
  credit_cost: number
  estimated_cost: number
  max_width: number
  max_height: number
  featured: boolean
  runtime: 'cloud' | 'local'
  owner_only: boolean
  provider_hint: string | null
  source_id?: string | null
  license_reference?: string | null
}

export type LocalRuntimeSummary = {
  enabled: boolean
  available: boolean
  status: string
  detail: string
  url?: string
  model_directory?: string
  discovered_models: number
  models?: string[]
}

export type OwnerLocalLabBootstrap = {
  runtime: LocalRuntimeSummary
  models: ModelCatalogEntry[]
}

export type HealthProvider = {
  name: string
  status: string
  detail?: string
  model_directory?: string
  discovered_models?: number
  url?: string
}

export type HealthResponse = {
  status: string
  providers: HealthProvider[]
  local_runtime?: LocalRuntimeSummary
  counts?: Record<string, number>
}

export type PresetEntry = {
  id: string
  label: string
  description: string
  defaults: {
    steps: number
    cfg_scale: number
    aspect_ratio: string
  }
}

export type GenerationCreditGuideEntry = {
  model_id: string
  label: string
  pricing_lane: GenerationPricingLane
  planned_provider: string | null
  estimated_cost: number
  estimated_cost_source: EstimatedCostSource
  quoted_credit_cost: number
  reserved_credit_cost: number
  settlement_credit_cost: number
  settlement_policy: string
  affordable_now: boolean
  max_startable_jobs_now: number | null
  start_status: string
}

export type BillingSummary = {
  plan: PlanInfo
  subscription_status: string
  entitlements: {
    can_access_chat: boolean
    premium_chat: boolean
    allowed_chat_modes: string[]
    chat_message_limit: number
    max_chat_attachments: number
    can_clean_export: boolean
    can_share_links: boolean
    can_generate: boolean
  }
  feature_entitlements?: {
    can_access_chat: boolean
    premium_chat: boolean
    allowed_chat_modes: string[]
    chat_message_limit: number
    max_chat_attachments: number
    can_clean_export: boolean
    can_share_links: boolean
    can_generate: boolean
  }
  credits: {
    remaining: number
    gross_remaining: number
    monthly_remaining: number
    monthly_allowance: number
    extra_credits: number
    reserved_total: number
    available_to_spend: number
    spend_order: string
    unlimited: boolean
  }
  wallet: {
    balance: number
    wallet_balance: number
    included_monthly_allowance: number
    included_monthly_remaining: number
    reserved_total: number
    available_to_spend: number
    spend_order: string
    unlimited: boolean
  }
  wallet_balance: number
  account_tier: Exclude<IdentityPlan, 'guest'>
  subscription_tier: Extract<IdentityPlan, 'creator' | 'pro'> | null
  generation_credit_guide: {
    available_to_spend: number
    reserved_total: number
    unlimited: boolean
    lane_highlights: Array<GenerationCreditGuideEntry>
    models: Array<GenerationCreditGuideEntry>
  }
  checkout_options: Array<{
    kind: CheckoutKind
    label: string
    credits: number
    price_usd: number
    plan: IdentityPlan | null
    billing_provider?: string
    kind_group?: string
  }>
  recent_activity: Array<{
    id: string
    amount: number
    entry_type: string
    description: string
    created_at: string
  }>
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetchWithToken<T>(path, getStudioAccessToken(), init)
}

async function apiFetchWithToken<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const url = buildApiUrl(path)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
    })
  } catch {
    throw new Error('Studio service is offline right now. Try again in a moment.')
  }

  if (!response.ok) {
    if (response.status === 401 && token && path === '/auth/me') {
      clearStudioAccessToken()
    }
    const payload = await response.json().catch(() => ({ error: 'Request failed' }))
    const detailMessage = typeof payload.detail === 'string'
      ? payload.detail
      : Array.isArray(payload.detail)
        ? payload.detail
            .map((item: { msg?: unknown; message?: unknown }) => (typeof item?.msg === 'string' ? item.msg : typeof item?.message === 'string' ? item.message : ''))
            .filter(Boolean)
            .join(' · ')
        : null
    throw new Error(payload.error ?? detailMessage ?? `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const studioApi = {
  getMe: () => apiFetch<AuthMeResponse>('/auth/me'),
  getMeWithToken: (accessToken: string) => apiFetchWithToken<AuthMeResponse>('/auth/me', accessToken),
  signUp: (payload: SignupPayload) =>
    apiFetch<DemoLoginResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signIn: (payload: PasswordAuthPayload) =>
    apiFetch<DemoLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  improvePrompt: (payload: { prompt: string }) =>
    apiFetch<ImprovedPromptResponse>('/prompts/improve', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  demoLogin: (plan: IdentityPlan = 'free', displayName = 'Creator') =>
    apiFetch<DemoLoginResponse>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({
        email: `${displayName.replace(/\s+/g, '.').toLowerCase() || 'creator'}@omnia.local`,
        display_name: displayName,
        plan,
      }),
    }),
  listProjects: () => apiFetch<{ projects: Project[] }>('/projects'),
  createProject: (payload: { title: string; description?: string; surface?: ProjectSurface }) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  getProject: (projectId: string) => apiFetch<{ project: Project; recent_generations: Generation[]; recent_assets: MediaAsset[] }>(`/projects/${projectId}`),
  listConversations: () => apiFetch<{ conversations: ChatConversation[] }>('/conversations'),
  createConversation: (payload?: { title?: string; model?: string }) =>
    apiFetch<ChatConversation>('/conversations', { method: 'POST', body: JSON.stringify(payload ?? {}) }),
  getConversation: (conversationId: string) =>
    apiFetch<{ conversation: ChatConversation; messages: ChatMessage[] }>(`/conversations/${conversationId}`),
  deleteConversation: (conversationId: string) =>
    apiFetch<{ status: string }>(`/conversations/${conversationId}`, { method: 'DELETE' }),
  sendConversationMessage: (conversationId: string, payload: { content: string; model?: string; attachments?: ChatAttachment[] }) =>
    apiFetch<{ conversation: ChatConversation; user_message: ChatMessage; assistant_message: ChatMessage }>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  editConversationMessage: (
    conversationId: string,
    messageId: string,
    payload: { content: string; model?: string; attachments?: ChatAttachment[] },
  ) =>
    apiFetch<{ conversation: ChatConversation; user_message: ChatMessage; assistant_message: ChatMessage }>(
      `/conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    ),
  regenerateConversationMessage: (conversationId: string, messageId: string) =>
    apiFetch<{ conversation: ChatConversation; user_message: ChatMessage; assistant_message: ChatMessage }>(
      `/conversations/${conversationId}/messages/${messageId}/regenerate`,
      {
        method: 'POST',
      },
    ),
  revertConversationMessage: (conversationId: string, messageId: string) =>
    apiFetch<{ conversation: ChatConversation; user_message: ChatMessage; assistant_message: ChatMessage }>(
      `/conversations/${conversationId}/messages/${messageId}/revert`,
      {
        method: 'POST',
      },
    ),
  setConversationMessageFeedback: (conversationId: string, messageId: string, feedback: ChatFeedback) =>
    apiFetch<ChatMessage>(`/conversations/${conversationId}/messages/${messageId}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({ feedback }),
    }),
  listGenerations: (projectId?: string) =>
    apiFetch<{ generations: Generation[] }>(projectId ? `/generations?project_id=${encodeURIComponent(projectId)}` : '/generations'),
  createGeneration: (payload: {
    project_id: string
    prompt: string
    negative_prompt: string
    reference_asset_id?: string | null
    model: string
    width?: number
    height?: number
    steps: number
    cfg_scale: number
    seed: number
    aspect_ratio: string
    output_count: number
  }) => apiFetch<Generation>('/generations', { method: 'POST', body: JSON.stringify(payload) }),
  getGeneration: (generationId: string) => apiFetch<Generation>(`/generations/${generationId}`),
  listAssets: (projectId?: string, includeDeleted = false) => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    if (includeDeleted) params.set('include_deleted', 'true')
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return apiFetch<{ assets: MediaAsset[] }>(`/assets${suffix}`)
  },
  importAsset: (payload: { project_id: string; data_url: string; title: string }) =>
    apiFetch<MediaAsset>('/assets/import', { method: 'POST', body: JSON.stringify(payload) }),
  renameAsset: (assetId: string, payload: { title: string }) =>
    apiFetch<MediaAsset>(`/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  trashAsset: (assetId: string) => apiFetch<MediaAsset>(`/assets/${assetId}`, { method: 'DELETE' }),
  restoreAsset: (assetId: string) => apiFetch<MediaAsset>(`/assets/${assetId}/restore`, { method: 'POST' }),
  permanentlyDeleteAsset: (assetId: string) =>
    apiFetch<{ asset_id: string; status: string }>(`/assets/${assetId}/permanent`, { method: 'DELETE' }),
  emptyTrash: () => apiFetch<{ status: string; deleted_count: number }>('/assets/trash/empty', { method: 'POST' }),
  updateProject: (projectId: string, payload: { title: string; description?: string }) =>
    apiFetch<Project>(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (projectId: string) =>
    apiFetch<{ project_id: string; status: string }>(`/projects/${projectId}`, { method: 'DELETE' }),
  listModels: () => apiFetch<{ models: ModelCatalogEntry[] }>('/models'),
  listPresets: () => apiFetch<{ presets: PresetEntry[] }>('/presets'),
  getBillingSummary: () => apiFetch<BillingSummary>('/billing/summary'),
  checkout: (kind: CheckoutKind) =>
    apiFetch<{
      status: string
      provider: string
      kind: CheckoutKind
      identity?: AuthMeResponse
      checkout_url?: string | null
    }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ kind }),
    }),
  createShare: (payload: { project_id?: string; asset_id?: string }) =>
    apiFetch<{ share_id: string; token: string; url: string }>('/shares', { method: 'POST', body: JSON.stringify(payload) }),
  getPublicShare: (token: string) => apiFetch<Record<string, unknown>>(`/shares/public/${token}`),
  getSettingsBootstrap: () =>
    apiFetch<{
      identity: AuthMeResponse
      plans: PlanInfo[]
      models: ModelCatalogEntry[]
      presets: PresetEntry[]
      local_runtime: LocalRuntimeSummary
      draft_projects: {
        compose: string
        chat: string
      }
      styles: StylesPayload
      prompt_memory: PromptMemoryProfile
    }>('/settings/bootstrap'),
  exportProject: (projectId: string) =>
    apiFetchBlob(`/projects/${projectId}/export`, { method: 'POST' }),
  listStyles: () => apiFetch<StylesPayload>('/styles'),
  saveStyle: (payload: {
    title: string
    prompt_modifier: string
    description?: string
    category?: string
    preview_image_url?: string | null
    source_kind?: string
    source_style_id?: string | null
    favorite?: boolean
  }) => apiFetch<StudioStyle>('/styles', { method: 'POST', body: JSON.stringify(payload) }),
  updateStyle: (styleId: string, payload: { favorite?: boolean }) =>
    apiFetch<StudioStyle>(`/styles/${styleId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  saveStyleFromPrompt: (payload: { prompt: string; title?: string; category?: string }) =>
    apiFetch<StudioStyle>('/styles/from-prompt', { method: 'POST', body: JSON.stringify(payload) }),
  getPromptMemory: () => apiFetch<PromptMemoryProfile>('/prompt-memory'),
  getOwnerLocalLabBootstrap: () => apiFetch<OwnerLocalLabBootstrap>('/owner/local-lab/bootstrap'),
  getHealth: () => apiFetch<HealthResponse>('/healthz'),
  getHealthDetail: () => apiFetch<HealthResponse>('/healthz/detail'),
  getPublicPlans: () => apiFetch<PublicPlansPayload>('/public/plans'),
  listPublicPosts: (sort: 'trending' | 'newest' | 'top' | 'styles' = 'trending') =>
    apiFetch<{ posts: PublicPost[] }>(`/public/posts?sort=${encodeURIComponent(sort)}`),
  likePost: (postId: string) => apiFetch<{ post: PublicPost }>(`/posts/${postId}/like`, { method: 'POST' }),
  unlikePost: (postId: string) => apiFetch<{ post: PublicPost }>(`/posts/${postId}/like`, { method: 'DELETE' }),
  updatePost: (postId: string, payload: { title?: string; visibility?: Visibility }) =>
    apiFetch<{ post: PublicPost }>(`/posts/${postId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  movePost: (postId: string, payload: { project_id: string }) =>
    apiFetch<{ post: PublicPost }>(`/posts/${postId}/move`, { method: 'POST', body: JSON.stringify(payload) }),
  trashPost: (postId: string) =>
    apiFetch<{ post_id: string; trashed_count: number }>(`/posts/${postId}/trash`, { method: 'POST' }),
  getProfile: (username: string) => apiFetch<ProfilePayload>(`/profiles/${encodeURIComponent(username)}`),
  getMyProfile: () => apiFetch<ProfilePayload>('/profiles/me'),
  exportProfile: () => apiFetch<Record<string, unknown>>('/profiles/me/export'),
  deleteProfile: () => apiFetch<{ status: string }>('/profiles/me', { method: 'DELETE' }),
  updateMyProfile: (payload: { display_name?: string; bio?: string; default_visibility?: Visibility }) =>
    apiFetch<ProfilePayload>('/profiles/me', { method: 'PATCH', body: JSON.stringify(payload) }),
}

async function apiFetchBlob(path: string, init?: RequestInit): Promise<Blob> {
  const headers = new Headers(init?.headers)
  if (getStudioAccessToken()) headers.set('Authorization', `Bearer ${getStudioAccessToken()}`)
  const url = buildApiUrl(path)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
    })
  } catch {
    throw new Error('Studio service is offline right now. Try again in a moment.')
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(payload.error ?? payload.detail ?? `Request failed with ${response.status}`)
  }

  return response.blob()
}
