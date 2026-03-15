import { getStudioAccessToken } from '@/lib/studioSession'

export type IdentityPlan = 'guest' | 'free' | 'pro'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retryable_failed'
export type CheckoutKind = 'pro_monthly' | 'top_up_small' | 'top_up_large'

export type PlanInfo = {
  id: IdentityPlan
  label: string
  monthly_credits: number
  queue_priority: string
  max_resolution: string
  share_links: boolean
  can_generate: boolean
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
  plan: IdentityPlan
  workspace_id: string | null
  guest?: boolean
}

export type AuthMeResponse = {
  guest: boolean
  identity: IdentityPayload
  credits: CreditSummary
  plan: PlanInfo
}

export type DemoLoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  identity: AuthMeResponse
}

export type Project = {
  id: string
  workspace_id: string
  identity_id: string
  title: string
  description: string
  cover_asset_id: string | null
  last_generation_id: string | null
  created_at: string
  updated_at: string
}

export type PromptSnapshot = {
  prompt: string
  negative_prompt: string
  model: string
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
}

export type Generation = {
  job_id: string
  status: JobStatus
  project_id: string
  provider: string
  model: string
  prompt_snapshot: PromptSnapshot
  estimated_cost: number
  credit_cost: number
  outputs: GenerationOutput[]
  error: string | null
  created_at: string
  completed_at: string | null
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
  local_path: string
  metadata: Record<string, unknown>
  created_at: string
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

export type BillingSummary = {
  plan: PlanInfo
  subscription_status: string
  credits: {
    remaining: number
    monthly_remaining: number
    monthly_allowance: number
    extra_credits: number
  }
  checkout_options: Array<{
    kind: CheckoutKind
    label: string
    credits: number
    price_usd: number
    plan: IdentityPlan | null
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
  const token = getStudioAccessToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/v1${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(payload.error ?? `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const studioApi = {
  getMe: () => apiFetch<AuthMeResponse>('/auth/me'),
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
  createProject: (payload: { title: string; description?: string }) =>
    apiFetch<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  getProject: (projectId: string) => apiFetch<{ project: Project; recent_generations: Generation[]; recent_assets: MediaAsset[] }>(`/projects/${projectId}`),
  listGenerations: (projectId?: string) =>
    apiFetch<{ generations: Generation[] }>(projectId ? `/generations?project_id=${encodeURIComponent(projectId)}` : '/generations'),
  createGeneration: (payload: {
    project_id: string
    prompt: string
    negative_prompt: string
    model: string
    width: number
    height: number
    steps: number
    cfg_scale: number
    seed: number
    aspect_ratio: string
  }) => apiFetch<Generation>('/generations', { method: 'POST', body: JSON.stringify(payload) }),
  getGeneration: (generationId: string) => apiFetch<Generation>(`/generations/${generationId}`),
  listAssets: (projectId?: string) =>
    apiFetch<{ assets: MediaAsset[] }>(projectId ? `/assets?project_id=${encodeURIComponent(projectId)}` : '/assets'),
  listModels: () => apiFetch<{ models: ModelCatalogEntry[] }>('/models'),
  listPresets: () => apiFetch<{ presets: PresetEntry[] }>('/presets'),
  getBillingSummary: () => apiFetch<BillingSummary>('/billing/summary'),
  checkout: (kind: CheckoutKind) =>
    apiFetch<{ status: string; provider: string; kind: CheckoutKind; identity: AuthMeResponse }>('/billing/checkout', {
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
    }>('/settings/bootstrap'),
  getHealth: () => apiFetch<Record<string, unknown>>('/healthz'),
}
