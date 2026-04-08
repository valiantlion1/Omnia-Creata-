import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageOff, Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react'

import { LightboxTrigger } from '@/components/ImageLightbox'
import { useLightbox } from '@/components/Lightbox'
import { AppPage } from '@/components/StudioPrimitives'
import { ChatBubble } from '@/components/ChatBubble'
import { isTerminalJobStatus, normalizeJobStatus, studioApi, type ChatAttachment, type ChatConversation, type ChatMessage, type ChatSuggestedAction, type GenerationOutput, type JobStatus } from '@/lib/studioApi'
import {
  parseChatSuggestedActionPayload,
  resolveComposeModeFromSuggestion,
  resolveCreatePrefillFromSuggestion,
  resolveSuggestedActionAttachments,
  resolveSuggestedActionReferenceAssetId,
  resolveSuggestedDraft,
} from '@/lib/chatActionBridge'
import { useStudioAuth } from '@/lib/studioAuth'

/* ─── Constants ────────────────────────────────────── */

const CHAT_VISUAL_STORAGE_KEY = 'oc-chat-visual-messages-v1'
const CHAT_PROJECT_STORAGE_KEY = 'oc-chat-project-map-v1'

const composeModes = ['Think', 'Vision', 'Edit'] as const
type ComposeMode = (typeof composeModes)[number]

type PendingAttachment = {
  id: string
  kind: string
  asset_id: string | null
  label: string
  previewUrl: string
  file: File | null
}

type ChatVisualMessage = {
  id: string
  conversationId: string
  projectId: string | null
  jobId: string | null
  title: string
  prompt: string
  mode: ComposeMode
  model: string | null
  aspectRatio: string | null
  workflow: string | null
  referenceAssetId: string | null
  status: JobStatus
  outputs: GenerationOutput[]
  error: string | null
  createdAt: string
  updatedAt: string
}

type ChatTimelineItem =
  | { kind: 'message'; id: string; createdAt: string; message: ChatMessage }
  | { kind: 'visual'; id: string; createdAt: string; visual: ChatVisualMessage }

type ChatConversationDetail = Awaited<ReturnType<typeof studioApi.getConversation>>

/* ─── Helpers ──────────────────────────────────────── */

function titleFromDraft(input: string) {
  return input.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 72) || 'New chat'
}

function buildOptimisticUserMessage(
  conversation: ChatConversation,
  content: string,
  attachments: ChatAttachment[],
): ChatMessage {
  return {
    id: `optimistic-${crypto.randomUUID()}`,
    conversation_id: conversation.id,
    identity_id: conversation.identity_id,
    role: 'user',
    content,
    attachments,
    suggested_actions: [],
    metadata: { optimistic: true },
    created_at: new Date().toISOString(),
  }
}

function mergeMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>()
  const merged: ChatMessage[] = []
  for (const message of messages) {
    if (seen.has(message.id)) continue
    seen.add(message.id)
    merged.push(message)
  }
  return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

function upsertConversationSummary(
  conversations: ChatConversation[],
  conversation: ChatConversation,
  lastMessageAt: string,
  messageCountFloor?: number,
): ChatConversation[] {
  const next = conversations.filter((item) => item.id !== conversation.id)
  next.unshift({
    ...conversation,
    last_message_at: lastMessageAt,
    updated_at: lastMessageAt,
    message_count: Math.max(messageCountFloor ?? conversation.message_count, conversation.message_count),
  })
  return next
}

function recreatePendingAttachment(attachment: PendingAttachment): PendingAttachment {
  if (!attachment.file) {
    return { ...attachment, id: crypto.randomUUID() }
  }
  return {
    ...attachment,
    id: crypto.randomUUID(),
    previewUrl: URL.createObjectURL(attachment.file),
  }
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

function toPendingAttachment(file: File): PendingAttachment {
  return {
    id: crypto.randomUUID(),
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    asset_id: null,
    label: file.name,
    previewUrl: URL.createObjectURL(file),
    file,
  }
}

function toPendingAttachmentFromChat(attachment: ChatAttachment): PendingAttachment {
  return {
    id: crypto.randomUUID(),
    kind: attachment.kind,
    asset_id: attachment.asset_id,
    label: attachment.label,
    previewUrl: attachment.url,
    file: null,
  }
}

async function toChatAttachmentPayload(attachment: PendingAttachment): Promise<ChatAttachment> {
  return {
    kind: attachment.kind,
    url: attachment.file ? await readAsDataUrl(attachment.file) : attachment.previewUrl,
    asset_id: attachment.asset_id,
    label: attachment.label,
  }
}

function releasePendingAttachment(attachment: PendingAttachment) {
  if (attachment.previewUrl.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.previewUrl)
  }
}

function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function normalizeStoredChatVisualMessage(value: ChatVisualMessage): ChatVisualMessage {
  return {
    ...value,
    model: typeof value.model === 'string' && value.model.trim() ? value.model : null,
    aspectRatio: typeof value.aspectRatio === 'string' && value.aspectRatio.trim() ? value.aspectRatio : null,
    workflow: typeof value.workflow === 'string' && value.workflow.trim() ? value.workflow : null,
    referenceAssetId: typeof value.referenceAssetId === 'string' && value.referenceAssetId.trim() ? value.referenceAssetId : null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

type ChatVisualExecutionPlan = {
  workflow?: string
  prompt: string
  negativePrompt: string
  referenceAssetId: string | null
  referenceMode: string
  model: string
  width: number
  height: number
  steps: number
  cfgScale: number
  aspectRatio: string
  outputCount: number
}

function resolveAssistantGenerationBridge(message: ChatMessage | null | undefined) {
  if (!isRecord(message?.metadata)) return null
  const generationBridge = message.metadata.generation_bridge
  if (!isRecord(generationBridge)) return null
  return generationBridge
}

function resolveVisualExecutionPlan(
  message: ChatMessage | null | undefined,
  fallbackPrompt: string,
): ChatVisualExecutionPlan | null {
  const bridge = resolveAssistantGenerationBridge(message)
  if (!bridge) return null

  const blueprint = isRecord(bridge.blueprint) ? bridge.blueprint : null
  const prompt =
    asString(blueprint?.prompt) ||
    asString(bridge.prompt) ||
    fallbackPrompt

  if (!prompt) return null

  return {
    workflow: asString(blueprint?.workflow) || asString(bridge.workflow) || undefined,
    prompt,
    negativePrompt: asString(blueprint?.negative_prompt) || asString(bridge.negative_prompt) || '',
    referenceAssetId: asString(blueprint?.reference_asset_id) || asString(bridge.reference_asset_id),
    referenceMode: asString(blueprint?.reference_mode) || 'none',
    model: asString(blueprint?.model) || 'flux-schnell',
    width: asNumber(blueprint?.width) || 1024,
    height: asNumber(blueprint?.height) || 1024,
    steps: asNumber(blueprint?.steps) || 24,
    cfgScale: asNumber(blueprint?.cfg_scale) || 6,
    aspectRatio: asString(blueprint?.aspect_ratio) || '1:1',
    outputCount: asNumber(blueprint?.output_count) || 1,
  }
}

function resolveLatestConversationVisualReferenceAssetId(
  visualMessages: ChatVisualMessage[],
  conversationId: string,
) {
  const latestSuccessfulVisual = [...visualMessages]
    .filter((visual) => visual.conversationId === conversationId && normalizeJobStatus(visual.status) === 'succeeded')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

  if (!latestSuccessfulVisual) return null
  return latestSuccessfulVisual.outputs.find((output) => output.asset_id)?.asset_id ?? null
}

function formatChatVisualModelName(model: string | null, mode: ComposeMode) {
  if (!model) return mode === 'Vision' ? 'Flux Schnell' : 'Omnia'
  return model
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function summarizeGenerationFailure(error: string | null) {
  if (!error) return 'Studio could not finish this run, so no final image was returned.'

  const lower = error.toLowerCase()
  if (lower.includes('no real image provider')) {
    return 'No real image provider is available for this workflow right now.'
  }
  if (lower.includes('401') || lower.includes('expired') || lower.includes('token')) {
    return 'The image provider rejected this run before a final image could be returned.'
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'The image provider is rate-limited right now, so this run could not finish.'
  }
  if (lower.includes('timed out') || lower.includes('timeout')) {
    return 'This run took too long and timed out before a final image was ready.'
  }
  if (lower.includes('cancel')) {
    return 'This run was cancelled before a final image was returned.'
  }
  return error
}

function resolveGenerationFailureLabel(status: JobStatus) {
  switch (normalizeJobStatus(status)) {
    case 'retryable_failed':
      return 'Retry needed'
    case 'timed_out':
      return 'Timed out'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Generation blocked'
  }
}

function shouldStartAssistantVisualGeneration(
  message: ChatMessage | null | undefined,
  requestedMode: ComposeMode,
  clientSuggestedVisualRun: boolean,
) {
  const metadata = isRecord(message?.metadata) ? message.metadata : null
  const workflowIntent = asString(metadata?.workflow_intent)
  const canGenerateImage = metadata?.can_generate_image === true
  const hasGenerationBridge = resolveAssistantGenerationBridge(message) !== null

  if (workflowIntent === 'analyze_image' || workflowIntent === 'prompt_help' || workflowIntent === 'casual_chat' || workflowIntent === 'presence_check') {
    return false
  }
  if (hasGenerationBridge && canGenerateImage) {
    return true
  }
  if (requestedMode === 'Edit' && canGenerateImage) {
    return true
  }
  if (canGenerateImage === false) {
    return false
  }
  return clientSuggestedVisualRun
}

function buildChatVisualPrompt(mode: ComposeMode, content: string, attachments: Array<Pick<ChatAttachment, 'kind' | 'label'>>) {
  const cleaned = content.trim()
  const imageHint = attachments.find((a) => a.kind === 'image')?.label
  if (mode === 'Edit') return cleaned || (imageHint ? `Refine the uploaded reference based on ${imageHint}` : 'Refine this visual with a premium direction')
  if (mode === 'Vision') return cleaned || (imageHint ? `Create a visual inspired by ${imageHint}` : 'Create a strong visual with premium composition')
  return cleaned
}

function looksLikeAnalysisRequest(content: string) {
  return /(analyze|analyse|describe|caption|what do you see|explain|feedback|review|thoughts|yorumla|incele|analiz|açıkla|ne görüyorsun|nasıl olmuş|ne gibi düzeltme|yorumun ne)/.test(content)
}

function shouldStartVisualGeneration(
  mode: ComposeMode,
  content: string,
  attachments: Array<Pick<ChatAttachment, 'kind' | 'label'>>,
) {
  const lower = content.trim().toLowerCase()
  const hasImage = attachments.some((attachment) => attachment.kind === 'image')
  const asksForRender = /(generate|create|render|make|produce|design|visualize|illustrate|draw|variation|poster|cover|mockup|artwork|üret|oluştur|yarat|tasarla|çiz|varyasyon|render et|görsel üret|görsel oluştur)/.test(lower)
  const asksForEditOperation = /(edit|remove|replace|retouch|cleanup|clean up|background|mask|inpaint|erase|düzenle|arka plan|mask|sil|temizle)/.test(lower)

  if (mode === 'Edit') return hasImage || Boolean(lower)
  if (mode !== 'Vision') return false
  if (!lower) return hasImage
  if (asksForEditOperation) return true
  if (looksLikeAnalysisRequest(lower)) return false
  return asksForRender
}

function resolveComposeModeForMessage(mode: ComposeMode, content: string, attachments: PendingAttachment[]): ComposeMode {
  if (mode !== 'Think') return mode

  const lower = content.trim().toLowerCase()
  const hasImage = attachments.some((attachment) => attachment.kind === 'image')
  const asksForEdit = /(edit|remove|replace|retouch|cleanup|clean up|background|mask|inpaint|erase)/.test(lower)
  const asksForVisual = /(generate|create|render|make|image|photo|visual|illustration|poster|cover|artwork)/.test(lower)
  const asksForAnalysis = /(analyze|analyse|describe|caption|what do you see|explain this image)/.test(lower)

  if (hasImage && asksForEdit) return 'Edit'
  if (hasImage || asksForVisual || asksForAnalysis) return 'Vision'
  return mode
}

void shouldStartVisualGeneration
void resolveComposeModeForMessage

function looksLikeContextOnlyVisualRequest(content: string) {
  return /(analyze|analyse|describe|caption|what do you see|explain|feedback|review|thoughts|suggest|advice|comment|yorum|incele|analiz|açıkla|ne görüyorsun|nasıl olmuş|ne gibi düzelt|nasıl düzelt|iyileştir|ne yapabiliriz|öneri|sence)/.test(content)
}

function shouldStartVisualGenerationSafely(
  mode: ComposeMode,
  content: string,
  attachments: Array<Pick<ChatAttachment, 'kind' | 'label'>>,
) {
  const lower = content.trim().toLowerCase()
  const hasImage = attachments.some((attachment) => attachment.kind === 'image')
  const asksForRender = /(generate|create|render|make|produce|design|visualize|illustrate|draw|variation|poster|cover|mockup|artwork|üret|oluştur|yarat|tasarla|çiz|varyasyon|render et|görsel üret|görsel oluştur)/.test(lower)
  const asksForEditOperation = /(edit|remove|replace|retouch|cleanup|clean up|background|mask|inpaint|erase|düzenle|arka plan|sil|temizle|değiştir)/.test(lower)

  if (!lower) return false
  if (looksLikeContextOnlyVisualRequest(lower)) return false
  if (mode === 'Edit') return hasImage && (asksForEditOperation || asksForRender)
  if (mode !== 'Vision') return false
  return asksForEditOperation || asksForRender
}

function resolveComposeModeForMessageSafely(mode: ComposeMode, content: string, attachments: PendingAttachment[]): ComposeMode {
  if (mode !== 'Think') return mode

  const lower = content.trim().toLowerCase()
  const hasImage = attachments.some((attachment) => attachment.kind === 'image')
  const asksForEdit = /(edit|remove|replace|retouch|cleanup|clean up|background|mask|inpaint|erase|düzenle|arka plan|sil|temizle|değiştir)/.test(lower)
  const asksForVisual = /(generate|create|render|make|image|photo|visual|illustration|poster|cover|artwork|görsel|resim|fotoğraf|çizim)/.test(lower)
  const asksForAnalysis = /(analyze|analyse|describe|caption|what do you see|explain this image|yorumla|incele|analiz et|açıkla|ne görüyorsun)/.test(lower)

  if (hasImage && asksForEdit) return 'Edit'
  if (asksForVisual || asksForAnalysis) return 'Vision'
  return mode
}

function isTerminalStatus(status: JobStatus) {
  return isTerminalJobStatus(status)
}

/* ─── Subcomponents ────────────────────────────────── */

/** ChatGPT-style progressive image reveal */
function ProgressiveImage({ src, alt, onOpen }: { src: string; alt: string; onOpen?: () => void }) {
  const [loaded, setLoaded] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { setLoaded(false); setRevealed(false) }, [src])
  useEffect(() => {
    if (!loaded) return
    const timer = window.setTimeout(() => setRevealed(true), 100)
    return () => window.clearTimeout(timer)
  }, [loaded])

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-[#15161a] ${onOpen ? 'cursor-zoom-in' : ''}`}
      onClick={onOpen}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      } : undefined}
    >
      {/* Blurred background placeholder */}
      <img src={src} alt="" aria-hidden className="aspect-[4/5] w-full max-w-[360px] object-cover blur-xl saturate-110 scale-[1.08] opacity-40" />
      {/* Actual image with reveal animation */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-all duration-[1600ms] ease-out"
        style={{
          clipPath: revealed ? 'inset(0 0 0 0 round 16px)' : 'inset(0 0 100% 0 round 16px)',
          filter: loaded ? 'none' : 'blur(16px)',
          opacity: loaded ? 1 : 0.5,
        }}
      />
      {/* Shimmer sweep during reveal */}
      {!revealed ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/20 to-transparent transition-transform duration-[1600ms] ease-out"
          style={{ transform: revealed ? 'translateY(400px)' : 'translateY(0)' }}
        />
      ) : null}
      {onOpen ? <LightboxTrigger onClick={onOpen} /> : null}
    </div>
  )
}

/** Pending generation: blur + pulse placeholder */
function GenerationPending({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary-light))] animate-pulse" style={{ boxShadow: '0 0 10px rgb(var(--primary-light))' }} />
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[rgb(var(--primary-light))] animate-pulse">Generating...</div>
      </div>
      <div className="relative overflow-hidden rounded-[26px] bg-[#111216] border border-white/[0.04] shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="aspect-[4/5] w-full max-w-[360px] bg-gradient-to-br from-white/[0.05] via-transparent to-[rgb(var(--primary-light)/0.03)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(var(--primary-light)/0.15),transparent_60%)] opacity-50 animate-[oc-pulse_3s_ease-in-out_infinite]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--primary-light)/0.1),transparent_70%)] animate-[oc-pulse_4s_ease-in-out_infinite_reverse]" />
      </div>
      <div className="text-sm font-medium text-zinc-400 pl-1">{title}</div>
    </div>
  )
}

function GenerationBlocked({
  title,
  status,
  error,
  model,
  aspectRatio,
  mode,
}: {
  title: string
  status: JobStatus
  error: string | null
  model: string | null
  aspectRatio: string | null
  mode: ComposeMode
}) {
  const statusLabel = resolveGenerationFailureLabel(status)
  const summary = summarizeGenerationFailure(error)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-rose-400/25 bg-rose-400/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-200">
          {statusLabel}
        </div>
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          No final image
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#111216] shadow-[0_8px_30px_rgba(0,0,0,0.42)]">
        <div className="aspect-[4/5] w-full max-w-[360px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(244,63,94,0.18),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(139,92,246,0.18),transparent_40%),linear-gradient(135deg,#111216,#1a1c23)] blur-[1px]" />
        <div className="absolute inset-0 bg-black/35 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,63,94,0.18),transparent_45%,rgba(255,255,255,0.04))]" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/35 text-rose-100 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
            <ImageOff className="h-6 w-6" />
          </div>
          <div className="mt-4 text-lg font-semibold text-white">
            Studio did not get a real image back
          </div>
          <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-zinc-200">
            {summary}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-1">
        <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs font-medium text-zinc-200">
          {title}
        </div>
        <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-xs text-zinc-400">
          {formatChatVisualModelName(model, mode)}
        </div>
        {aspectRatio ? (
          <div className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-xs text-zinc-400">
            {aspectRatio}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-zinc-300">
        Studio is showing a blocked placeholder instead of pretending this run succeeded.
      </div>
    </div>
  )
}

/** Welcome / empty state when no messages */
function ChatWelcome({ onHint }: { onHint: (v: string) => void }) {
  const suggestions = [
    { title: 'Create starter', description: 'Start from a cinematic portrait prompt', value: 'Create a cinematic portrait with dramatic lighting, dark background, high detail' },
    { title: 'Edit starter', description: 'Prepare the chat for a photo edit flow', value: 'I want to edit a photo - let me upload it first' },
    { title: 'Prompt help', description: 'Ask for stronger prompt direction', value: 'Help me write a prompt for a futuristic city skyline at night' },
    { title: 'Image analysis', description: 'Ask Studio to read an uploaded image', value: 'Analyze this image and tell me what you see' },
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgb(var(--primary-light)/0.04),transparent_60%)] blur-[80px]" />
      </div>

      <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[28px] ring-1 ring-white/10 shadow-[0_0_60px_rgb(var(--primary-light)/0.15)] bg-gradient-to-br from-[#1c1e26] to-[#0b0c10] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--primary-light)/0.2)] to-[rgb(var(--accent)/0.05)] opacity-50" />
        <MessageCircle className="relative z-10 h-8 w-8 text-[rgb(var(--primary-light))] drop-shadow-[0_0_15px_rgb(var(--primary-light)/0.5)]" />
      </div>
      <h2 className="relative z-10 mt-8 text-3xl font-bold tracking-tight text-white md:text-5xl drop-shadow-sm">
        What would you like to
        <span className="ml-3 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--primary-light)), rgb(var(--accent)))' }}>create</span>?
      </h2>
      <p className="relative z-10 mt-4 max-w-xl text-center text-[15px] leading-relaxed text-zinc-400">
        Describe an image, upload a photo to edit, or ask for creative guidance.
        Images are generated organically right here.
      </p>
      <div className="relative z-10 mt-5 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-[11px] font-medium tracking-[0.02em] text-zinc-400">
        Quick starts below are static starter prompts, not live AI replies.
      </div>
      
      <div className="relative z-10 mt-10 grid max-w-2xl gap-3 sm:grid-cols-2 w-full">
        {suggestions.map((s) => (
          <button
            key={s.title}
            onClick={() => onHint(s.value)}
            className="group rounded-[20px] border border-white/[0.04] bg-[#111216]/60 backdrop-blur-xl px-5 py-4 text-left text-sm transition-all duration-300 hover:bg-[#1a1b23]/80 hover:border-[rgb(var(--primary-light)/0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgb(var(--primary-light)/0.1)]"
          >
            <div className="mb-1 font-semibold text-white/90 transition-colors drop-shadow-sm group-hover:text-[rgb(var(--primary-light))]">{s.title}</div>
            <div className="leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-300">{s.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Main Page ────────────────────────────────────── */

export default function ChatPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openLightbox } = useLightbox()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [searchParams] = useSearchParams()
  const requestedNewConversation = searchParams.get('new') === '1'
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const projectPromiseRef = useRef<Record<string, Promise<string>>>({})
  const autoCreateRequestRef = useRef<string | null>(null)
  const previousPendingAttachmentsRef = useRef<PendingAttachment[]>([])
  const shouldSnapToBottomRef = useRef(false)

  const [draft, setDraft] = useState('')
  const [composeMode, setComposeMode] = useState<ComposeMode>(composeModes[0])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [visualMessages, setVisualMessages] = useState<ChatVisualMessage[]>([])
  const [conversationProjects, setConversationProjects] = useState<Record<string, string>>({})

  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  /* ─── Lifecycle ───────────────────────────────── */

  useEffect(() => {
    const incoming = searchParams.get('draft')
    if (incoming) setDraft(incoming)
  }, [searchParams])

  useEffect(() => {
    const requestedConversation = searchParams.get('conversation')
    if (requestedConversation) setActiveConversationId(requestedConversation)
  }, [searchParams])

  useEffect(() => {
    if (!requestedNewConversation) return
    autoCreateRequestRef.current = null
    shouldSnapToBottomRef.current = false
    setActiveConversationId(null)
    setComposeMode('Think')
    setPendingAttachments([])
    if (!searchParams.get('draft')) {
      setDraft('')
    }
  }, [requestedNewConversation, searchParams])

  useEffect(() => {
    setVisualMessages(readStoredJson<ChatVisualMessage[]>(CHAT_VISUAL_STORAGE_KEY, []).map(normalizeStoredChatVisualMessage))
    setConversationProjects(readStoredJson<Record<string, string>>(CHAT_PROJECT_STORAGE_KEY, {}))
  }, [])

  useEffect(() => { window.localStorage.setItem(CHAT_VISUAL_STORAGE_KEY, JSON.stringify(visualMessages)) }, [visualMessages])
  useEffect(() => { window.localStorage.setItem(CHAT_PROJECT_STORAGE_KEY, JSON.stringify(conversationProjects)) }, [conversationProjects])
  useEffect(() => {
    const previous = previousPendingAttachmentsRef.current
    const activeIds = new Set(pendingAttachments.map((attachment) => attachment.id))
    previous.filter((attachment) => !activeIds.has(attachment.id)).forEach(releasePendingAttachment)
    previousPendingAttachmentsRef.current = pendingAttachments
  }, [pendingAttachments])
  useEffect(() => () => { previousPendingAttachmentsRef.current.forEach(releasePendingAttachment) }, [])

  /* ─── Auto-resize textarea ────────────────────── */

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [draft])

  /* ─── Auto-detect mode from attachments ───────── */

  useEffect(() => {
    if (!activeConversationId) return
    const viewport = scrollViewportRef.current
    if (!viewport) return
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeConversationId])

  /* ─── Queries ─────────────────────────────────── */

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => studioApi.listConversations(),
    enabled: canLoadPrivate,
    staleTime: 30_000,
  })

  useEffect(() => {
    const conversations = conversationsQuery.data?.conversations ?? []
    const requestedConversation = searchParams.get('conversation')
    if (!activeConversationId && conversations.length && !requestedConversation && !requestedNewConversation) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversationsQuery.data, requestedNewConversation, searchParams])

  const conversationDetailQuery = useQuery({
    queryKey: ['conversation', activeConversationId],
    queryFn: () => studioApi.getConversation(activeConversationId as string),
    enabled: canLoadPrivate && Boolean(activeConversationId) && !requestedNewConversation,
    staleTime: 10_000,
  })

  const createConversationMutation = useMutation({
    mutationFn: (payload?: { title?: string; model?: string }) => studioApi.createConversation(payload),
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; content: string; model?: string; attachments?: ChatAttachment[] }) =>
      studioApi.sendConversationMessage(payload.conversationId, { content: payload.content, model: payload.model, attachments: payload.attachments }),
  })
  
  const editMessageMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; messageId: string; content: string }) =>
      studioApi.editConversationMessage(payload.conversationId, payload.messageId, { content: payload.content }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', activeConversationId] })
  })

  const regenerateMessageMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; messageId: string }) =>
      studioApi.regenerateConversationMessage(payload.conversationId, payload.messageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversation', activeConversationId] })
  })

  const feedbackMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; messageId: string; feedback: 'like' | 'dislike' | null }) =>
      studioApi.setConversationMessageFeedback(payload.conversationId, payload.messageId, payload.feedback),
  })

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return
    await editMessageMutation.mutateAsync({ conversationId: activeConversationId as string, messageId, content: newContent })
  }

  const handleRegenerateMessage = async (messageId: string) => {
    if (!activeConversationId) return
    await regenerateMessageMutation.mutateAsync({ conversationId: activeConversationId as string, messageId })
  }

  const handleMessageFeedback = async (messageId: string, feedback: 'like' | 'dislike' | null) => {
    if (!activeConversationId) return
    await feedbackMutation.mutateAsync({ conversationId: activeConversationId as string, messageId, feedback })
  }

  const isConversationBootstrapPending = createConversationMutation.isPending && !activeConversationId

  /* ─── New conversation effect ─────────────────── */

  useEffect(() => {
    const requestKey = searchParams.toString()
    if (!requestedNewConversation) {
      autoCreateRequestRef.current = null
      if (activeConversationId && createConversationMutation.isPending) {
        createConversationMutation.reset()
      }
      return
    }
    if (!canLoadPrivate || createConversationMutation.isPending) return
    if (autoCreateRequestRef.current === requestKey) return
    autoCreateRequestRef.current = requestKey
    let cancelled = false
    const run = async () => {
      try {
        const conversation = await createConversationMutation.mutateAsync({})
        if (cancelled) return
        setActiveConversationId(conversation.id)
        setDraft('')
        navigate(`/chat?conversation=${conversation.id}`, { replace: true })
        await queryClient.invalidateQueries({ queryKey: ['conversations'] })
        createConversationMutation.reset()
      } catch {
        if (!cancelled) {
          createConversationMutation.reset()
          navigate('/chat', { replace: true })
        }
      }
    }
    void run()
    return () => { cancelled = true }
  }, [activeConversationId, canLoadPrivate, createConversationMutation, navigate, queryClient, requestedNewConversation, searchParams])

  /* ─── Data derivations ────────────────────────── */

  const conversationList = conversationsQuery.data?.conversations ?? []
  const messages = conversationDetailQuery.data?.messages ?? []
  const activeConversation = conversationDetailQuery.data?.conversation ?? conversationList.find((item) => item.id === activeConversationId) ?? null
  const conversationVisuals = useMemo(
    () => visualMessages.filter((v) => v.conversationId === activeConversationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activeConversationId, visualMessages],
  )
  const pendingVisuals = useMemo(
    () => visualMessages.filter((v) => v.jobId && !isTerminalStatus(v.status)).map((v) => ({ id: v.id, jobId: v.jobId as string })),
    [visualMessages],
  )
  const pendingVisualPollKey = useMemo(
    () => pendingVisuals.map((v) => `${v.id}:${v.jobId}`).join('|'),
    [pendingVisuals],
  )
  const timeline = useMemo<ChatTimelineItem[]>(() => {
    const messageItems: ChatTimelineItem[] = messages.map((m) => ({ kind: 'message', id: m.id, createdAt: m.created_at, message: m }))
    const visualItems: ChatTimelineItem[] = conversationVisuals.map((v) => ({ kind: 'visual', id: v.id, createdAt: v.createdAt, visual: v }))
    return [...messageItems, ...visualItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [conversationVisuals, messages])

  const lastTimelineMessageId = useMemo(() => {
    const msgItems = timeline.filter((t): t is Extract<ChatTimelineItem, { kind: 'message' }> => t.kind === 'message')
    return msgItems.length ? msgItems[msgItems.length - 1].id : null
  }, [timeline])

  const lastTimelineUserId = useMemo(() => {
    const msgItems = timeline.filter((t): t is Extract<ChatTimelineItem, { kind: 'message' }> => t.kind === 'message' && t.message.role === 'user')
    return msgItems.length ? msgItems[msgItems.length - 1].message.id : null
  }, [timeline])

  /* ─── Poll visual generation status ───────────── */

  useEffect(() => {
    if (!shouldSnapToBottomRef.current) return
    const viewport = scrollViewportRef.current
    if (!viewport || !timeline.length) return
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' })
      if (!sendMessageMutation.isPending) {
        shouldSnapToBottomRef.current = false
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [timeline.length, sendMessageMutation.isPending])

  const composerHint = useMemo(() => {
    if (composeMode === 'Think') {
      return pendingAttachments.some((attachment) => attachment.kind === 'image')
        ? 'Inspecting attachments in chat'
        : 'Text-only conversation'
    }
    if (composeMode === 'Vision') return 'Vision mode is ready for visual generation'
    return 'Edit mode is ready for image changes'
  }, [composeMode, pendingAttachments])

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  const handleSuggestionAction = useCallback((action: ChatSuggestedAction, message: ChatMessage) => {
    const nextDraft = resolveSuggestedDraft(action)
    const nextComposeMode = resolveComposeModeFromSuggestion(action)
    const payload = parseChatSuggestedActionPayload(action)

    if (action.action === 'open_create') {
      const prefill = resolveCreatePrefillFromSuggestion(action)
      const params = new URLSearchParams()
      if (prefill?.prompt) params.set('prompt', prefill.prompt)
      if (prefill?.model) params.set('model', prefill.model)
      if (prefill?.aspectRatio) params.set('aspect_ratio', prefill.aspectRatio)
      if (prefill?.steps) params.set('steps', String(prefill.steps))
      if (prefill?.cfgScale) params.set('cfg_scale', String(prefill.cfgScale))
      if (prefill?.outputCount) params.set('output_count', String(prefill.outputCount))
      if (prefill?.workflow) params.set('workflow', prefill.workflow)
      if (prefill?.negativePrompt) params.set('negative_prompt', prefill.negativePrompt)
      if (prefill?.referenceMode) params.set('reference_mode', prefill.referenceMode)
      const referenceAssetId = prefill?.referenceAssetId || resolveSuggestedActionReferenceAssetId(messages, message, action)
      if (referenceAssetId) params.set('reference_asset_id', referenceAssetId)
      params.set('source', 'chat')
      navigate(`/create?${params.toString()}`)
      return
    }

    const restoredAttachments =
      nextComposeMode === 'Edit' || payload?.generation_bridge?.workflow === 'image_to_image' || payload?.intent === 'analyze_image'
        ? resolveSuggestedActionAttachments(messages, message, action).map(toPendingAttachmentFromChat)
        : []

    if (restoredAttachments.length) {
      setPendingAttachments(restoredAttachments)
    }
    if (nextComposeMode) {
      setComposeMode(nextComposeMode)
    }
    setDraft(nextDraft)
    focusComposer()
  }, [focusComposer, messages, navigate])

  useEffect(() => {
    if (!canLoadPrivate) return
    if (!pendingVisuals.length) return

    const interval = window.setInterval(async () => {
      const snapshots = await Promise.all(
        pendingVisuals.map(async (v) => {
          try { const g = await studioApi.getGeneration(v.jobId as string); return [v.id, g] as const }
          catch { return null }
        }),
      )
      const snapshotMap = new Map(snapshots.filter(Boolean) as Array<readonly [string, Awaited<ReturnType<typeof studioApi.getGeneration>>]>)
      let invalidate = false
      startTransition(() => {
        setVisualMessages((current) =>
          current.map((v) => {
            const snap = snapshotMap.get(v.id)
            if (!snap) return v
            if (!isTerminalStatus(v.status) && isTerminalStatus(snap.status)) invalidate = true
            return {
              ...v,
              title: snap.title,
              prompt: snap.prompt_snapshot.prompt || v.prompt,
              model: snap.model || v.model,
              aspectRatio: snap.prompt_snapshot.aspect_ratio || v.aspectRatio,
              workflow: snap.prompt_snapshot.workflow || v.workflow,
              referenceAssetId: snap.prompt_snapshot.reference_asset_id || v.referenceAssetId,
              status: snap.status,
              outputs: snap.outputs,
              error: snap.error,
              updatedAt: new Date().toISOString(),
            }
          }),
        )
      })
      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: ['assets'] })
        await queryClient.invalidateQueries({ queryKey: ['generations'] })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }, 1500)
    return () => window.clearInterval(interval)
  }, [canLoadPrivate, pendingVisualPollKey, queryClient])


  /* ─── Handlers ────────────────────────────────── */

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleUploadChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    try {
      const next = files.slice(0, 4).map((file) => toPendingAttachment(file))
      setPendingAttachments((current) => {
        const combined = [...current, ...next]
        const kept = combined.slice(0, 4)
        combined.slice(4).forEach(releasePendingAttachment)
        return kept
      })
    } finally { 
      event.target.value = '' 
      textareaRef.current?.focus()
    }
  }

  const ensureConversationProjectId = useCallback(
    async (conversation: ChatConversation) => {
      const existing = conversationProjects[conversation.id]
      if (existing) return existing
      if (!projectPromiseRef.current[conversation.id]) {
        projectPromiseRef.current[conversation.id] = studioApi
          .createProject({ title: `Chat - ${conversation.title}`.slice(0, 60), description: 'Created from Studio Chat', surface: 'chat' })
          .then((p) => { setConversationProjects((c) => ({ ...c, [conversation.id]: p.id })); return p.id })
          .finally(() => { delete projectPromiseRef.current[conversation.id] })
      }
      return projectPromiseRef.current[conversation.id]
    },
    [conversationProjects],
  )

  const prepareChatAttachments = useCallback(
    async (conversation: ChatConversation, attachments: PendingAttachment[]) => {
      if (!attachments.length) return [] as ChatAttachment[]

      let chatProjectId: string | null = null
      return Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.kind !== 'image' || !attachment.file) {
            return toChatAttachmentPayload(attachment)
          }

          const dataUrl = await readAsDataUrl(attachment.file)
          chatProjectId = chatProjectId ?? await ensureConversationProjectId(conversation)
          const importedAsset = await studioApi.importAsset({
            project_id: chatProjectId,
            data_url: dataUrl,
            title: attachment.label || 'Chat reference',
          })

          return {
            kind: attachment.kind,
            url: importedAsset.url,
            asset_id: importedAsset.id,
            label: attachment.label,
          } satisfies ChatAttachment
        }),
      )
    },
    [ensureConversationProjectId],
  )
  void prepareChatAttachments

  const startVisualGeneration = useCallback(
    async (
      conversation: ChatConversation,
      content: string,
      attachments: ChatAttachment[],
      mode: ComposeMode,
      assistantMessage?: ChatMessage | null,
    ) => {
      const fallbackPrompt = buildChatVisualPrompt(mode, content, attachments)
      const executionPlan = resolveVisualExecutionPlan(assistantMessage, fallbackPrompt) ?? {
        prompt: fallbackPrompt,
        negativePrompt: '',
        referenceAssetId: null,
        referenceMode: 'none',
        model: 'flux-schnell',
        width: 1024,
        height: 1024,
        steps: 24,
        cfgScale: 6,
        aspectRatio: '1:1',
        outputCount: 1,
      }
      if (!executionPlan.prompt) return
      const projectId = await ensureConversationProjectId(conversation)
      const referenceAttachment = attachments.find((attachment) => attachment.kind === 'image')
      let referenceAssetId = executionPlan.referenceAssetId || referenceAttachment?.asset_id || null

      if (!referenceAssetId && referenceAttachment?.url.startsWith('data:image/')) {
        const importedAsset = await studioApi.importAsset({
          project_id: projectId,
          data_url: referenceAttachment.url,
          title: referenceAttachment.label || 'Chat reference',
        })
        referenceAssetId = importedAsset.id
      }
      if (!referenceAssetId && (executionPlan.referenceMode === 'required' || executionPlan.workflow === 'edit' || executionPlan.workflow === 'image_to_image')) {
        referenceAssetId = resolveLatestConversationVisualReferenceAssetId(visualMessages, conversation.id)
      }
      if (executionPlan.referenceMode === 'required' && !referenceAssetId) {
        throw new Error('This visual direction still needs its source reference image.')
      }

      const generation = await studioApi.createGeneration({
        project_id: projectId, prompt: executionPlan.prompt, negative_prompt: executionPlan.negativePrompt, model: executionPlan.model,
        reference_asset_id: referenceAssetId,
        width: executionPlan.width, height: executionPlan.height, steps: executionPlan.steps, cfg_scale: executionPlan.cfgScale,
        seed: Math.floor(Math.random() * 1_000_000_000),
        aspect_ratio: executionPlan.aspectRatio, output_count: executionPlan.outputCount,
      })
      setVisualMessages((c) => [{
        id: `visual-${generation.job_id}`, conversationId: conversation.id, projectId, jobId: generation.job_id,
        title: generation.title,
        prompt: executionPlan.prompt,
        mode,
        model: generation.model || executionPlan.model,
        aspectRatio: generation.prompt_snapshot.aspect_ratio || executionPlan.aspectRatio,
        workflow: generation.prompt_snapshot.workflow || executionPlan.workflow || null,
        referenceAssetId: generation.prompt_snapshot.reference_asset_id || referenceAssetId,
        status: generation.status,
        outputs: [],
        error: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }, ...c])
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
    [ensureConversationProjectId, queryClient, visualMessages],
  )

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    if ((!content && !pendingAttachments.length) || sendMessageMutation.isPending || isConversationBootstrapPending || !canLoadPrivate) return
    const pendingAttachmentSnapshot = pendingAttachments
    const attachments = await Promise.all(pendingAttachments.map((attachment) => toChatAttachmentPayload(attachment)))
    const effectiveMode = resolveComposeModeForMessageSafely(composeMode, content, pendingAttachments)
    const visualPrompt = buildChatVisualPrompt(effectiveMode, content, pendingAttachments)
    const clientSuggestedVisualRun = shouldStartVisualGenerationSafely(effectiveMode, content, pendingAttachments)
    if (effectiveMode !== composeMode) {
      setComposeMode(effectiveMode)
    }

    let conversation = conversationDetailQuery.data?.conversation ?? conversationsQuery.data?.conversations.find((c) => c.id === activeConversationId) ?? null
    if (!conversation) {
      conversation = await createConversationMutation.mutateAsync({ title: titleFromDraft(content), model: effectiveMode.toLowerCase() })
      setActiveConversationId(conversation.id)
      navigate(`/chat?conversation=${conversation.id}`, { replace: true })
      createConversationMutation.reset()
    }

    const optimisticMessage = buildOptimisticUserMessage(conversation, content, attachments)
    shouldSnapToBottomRef.current = true
    startTransition(() => {
      setDraft('')
      setPendingAttachments([])
      queryClient.setQueryData<ChatConversationDetail>(['conversation', conversation.id], (current) => ({
        conversation: current?.conversation ?? conversation,
        messages: mergeMessages([...(current?.messages ?? []), optimisticMessage]),
      }))
      queryClient.setQueryData<{ conversations: ChatConversation[] }>(['conversations'], (current) => ({
        conversations: upsertConversationSummary(
          current?.conversations ?? [],
          conversation,
          optimisticMessage.created_at,
          (current?.conversations.find((item) => item.id === conversation.id)?.message_count ?? conversation.message_count) + 1,
        ),
      }))
    })

    try {
      const result = await sendMessageMutation.mutateAsync({ conversationId: conversation.id, content, model: effectiveMode.toLowerCase(), attachments })
      setActiveConversationId(result.conversation.id)
      navigate(`/chat?conversation=${result.conversation.id}`, { replace: true })

      startTransition(() => {
        queryClient.setQueryData<ChatConversationDetail>(['conversation', result.conversation.id], (current) => ({
          conversation: result.conversation,
          messages: mergeMessages([
            ...(current?.messages ?? []).filter((message) => message.id !== optimisticMessage.id),
            result.user_message,
            result.assistant_message,
          ]),
        }))
        queryClient.setQueryData<{ conversations: ChatConversation[] }>(['conversations'], (current) => ({
          conversations: upsertConversationSummary(
            current?.conversations ?? [],
            result.conversation,
            result.assistant_message.created_at,
            result.conversation.message_count,
          ),
        }))
      })

      void queryClient.invalidateQueries({ queryKey: ['conversations'] })
      void queryClient.invalidateQueries({ queryKey: ['conversation', result.conversation.id] })

      const shouldGenerateVisual = shouldStartAssistantVisualGeneration(
        result.assistant_message,
        effectiveMode,
        clientSuggestedVisualRun,
      )
      if (shouldGenerateVisual) {
        const assistantExecutionPlan = resolveVisualExecutionPlan(result.assistant_message, visualPrompt)
        const assistantVisualPrompt = assistantExecutionPlan?.prompt || visualPrompt
        try { await startVisualGeneration(result.conversation, content, attachments, effectiveMode, result.assistant_message) }
        catch (error) {
          setVisualMessages((c) => [{
            id: `visual-${crypto.randomUUID()}`, conversationId: result.conversation.id,
            projectId: conversationProjects[result.conversation.id] ?? null, jobId: null,
            title: titleFromDraft(assistantVisualPrompt),
            prompt: assistantVisualPrompt,
            mode: effectiveMode,
            model: assistantExecutionPlan?.model || null,
            aspectRatio: assistantExecutionPlan?.aspectRatio || null,
            workflow: assistantExecutionPlan?.workflow || null,
            referenceAssetId: assistantExecutionPlan?.referenceAssetId || null,
            status: 'failed',
            outputs: [],
            error: error instanceof Error ? error.message : 'Unable to start image generation.',
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          }, ...c])
        }
      }
    } catch (error) {
      shouldSnapToBottomRef.current = false
      startTransition(() => {
        queryClient.setQueryData<ChatConversationDetail>(['conversation', conversation.id], (current) => ({
          conversation: current?.conversation ?? conversation,
          messages: (current?.messages ?? []).filter((message) => message.id !== optimisticMessage.id),
        }))
      })
      setDraft(content)
      setPendingAttachments(pendingAttachmentSnapshot.map(recreatePendingAttachment))
      throw error
    }
  }, [activeConversationId, canLoadPrivate, composeMode, conversationDetailQuery.data?.conversation, conversationProjects, conversationsQuery.data?.conversations, createConversationMutation, draft, isConversationBootstrapPending, navigate, pendingAttachments, queryClient, sendMessageMutation, startVisualGeneration])

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    await handleSend()
  }

  /* ─── Render ──────────────────────────────────── */

  return (
    <AppPage className="!max-w-full !gap-0 !py-0 !px-0">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">

        {/* ── Minimal top bar ─────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <MessageCircle className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate text-sm font-medium text-white">{activeConversation?.title || 'New chat'}</span>
          </div>
          <div className="flex items-center gap-2">
            {auth?.guest ? (
              <Link to="/signup" className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition hover:opacity-90">
                Start free
              </Link>
            ) : null}
          </div>
        </div>

        {/* ── Messages area ───────────────────────── */}
        <div ref={scrollViewportRef} className="min-h-0 flex-1 overflow-y-auto">
          {conversationDetailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chat...
            </div>
          ) : timeline.length ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-10 pt-6">
              {timeline.map((item) => {
                if (item.kind === 'message') {
                  const msg = item.message
                  return (
                    <ChatBubble 
                      key={item.id} 
                      message={msg}
                      isLatest={item.id === lastTimelineMessageId}
                      isLatestUser={msg.id === lastTimelineUserId}
                      onEdit={handleEditMessage}
                      onRegenerate={handleRegenerateMessage}
                      onFeedback={handleMessageFeedback}
                      onSuggestionClick={handleSuggestionAction}
                    />
                  )
                }

                /* ── Visual generation item ─────────── */
                const visual = item.visual
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-[85%] space-y-2 md:max-w-[75%]">
              {normalizeJobStatus(visual.status) === 'succeeded' && visual.outputs.length ? (
                        <div className="space-y-3">
                          {visual.outputs.map((output) => (
                            <ProgressiveImage
                              key={output.asset_id}
                              src={output.url}
                              alt={visual.title}
                              onOpen={() => openLightbox(output.url, visual.title, {
                                title: visual.title,
                                prompt: visual.prompt,
                                authorName: 'You',
                                authorUsername: auth?.identity.username || 'creator',
                                model: formatChatVisualModelName(visual.model, visual.mode),
                                aspectRatio: visual.aspectRatio || '1:1'
                              })}
                            />
                          ))}
                          <div className="flex items-center gap-3 text-sm">
                            <Link to="/library/images" className="font-medium text-white transition hover:text-zinc-200">
                              Open in Library
                            </Link>
                          </div>
                        </div>
              ) : ['failed', 'retryable_failed', 'cancelled', 'timed_out'].includes(normalizeJobStatus(visual.status)) ? (
                        <GenerationBlocked
                          title={visual.title}
                          status={visual.status}
                          error={visual.error}
                          model={visual.model}
                          aspectRatio={visual.aspectRatio}
                          mode={visual.mode}
                        />
                      ) : (
                        <GenerationPending title={visual.title} />
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          ) : (
            <ChatWelcome onHint={(v) => setDraft(v)} />
          )}
        </div>

        {/* ── Composer bar ────────────────────────── */}
        <div className="relative border-t border-white/[0.04] bg-[#0c0d12]/90 px-4 py-4 backdrop-blur-2xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative rounded-[24px] border border-white/[0.08] bg-[#111216]/90 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 focus-within:shadow-[0_8px_40px_rgb(var(--primary-light)/0.15)] focus-within:border-[rgb(var(--primary-light)/0.3)] focus-within:bg-[#15161c]">
              
              {/* Optional inner glow line */}
              <div className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[rgb(var(--primary-light)/0.3)] to-transparent opacity-0 transition-opacity duration-300" />
              
              {/* Pending attachments */}
              {pendingAttachments.length ? (
                <div className="flex flex-wrap gap-2 border-b border-white/[0.04] px-4 py-3">
                  {pendingAttachments.map((att) => (
                    <div key={att.id} className="group relative">
                      {att.kind === 'image' ? (
                        <img src={att.previewUrl} alt={att.label} className="h-16 w-16 rounded-xl object-cover ring-1 ring-white/10 shadow-md transition group-hover:brightness-110" loading="lazy" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/[0.04] text-[11px] font-medium text-zinc-400 ring-1 ring-white/10 shadow-md">
                          {att.label.split('.').pop()?.toUpperCase()}
                        </div>
                      )}
                      <button
                        onClick={() => setPendingAttachments((c) => c.filter((a) => a.id !== att.id))}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-zinc-300 ring-1 ring-white/20 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Input row */}
              <div className="flex items-end gap-2 px-3 py-2.5">
                <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleUploadChange} />

                <button
                  onClick={handleUploadClick}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                  title="Attach image"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={auth?.guest ? 'Sign in to start chatting...' : 'Message Studio...'}
                  className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-relaxed text-white outline-none placeholder:text-zinc-500"
                />

                <button
                  onClick={handleSend}
                  disabled={(!draft.trim() && !pendingAttachments.length) || !canLoadPrivate || sendMessageMutation.isPending || isConversationBootstrapPending}
                  className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:saturate-0"
                  style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', boxShadow: '0 0 20px rgb(var(--primary-light)/0.3)' }}
                  title="Send"
                >
                  {sendMessageMutation.isPending || isConversationBootstrapPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 translate-x-px" />
                  )}
                </button>
              </div>
            </div>

            {/* Mode hint */}
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-zinc-600" title={composerHint}>
              <span>{composerHint}</span>
              <span className="hidden">
                {composeMode === 'Think' ? '💭 Text-only conversation' : composeMode === 'Vision' ? '🎨 Will generate images' : '✏️ Will edit/refine images'}
              </span>
              <span>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>

          {/* Error toast */}
          {(sendMessageMutation.error || createConversationMutation.error) ? (
            <div className="mx-auto mt-3 w-full max-w-3xl rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {sendMessageMutation.error instanceof Error
                ? sendMessageMutation.error.message
                : createConversationMutation.error instanceof Error
                  ? createConversationMutation.error.message
                  : 'Unable to send message.'}
            </div>
          ) : null}
        </div>
      </div>
    </AppPage>
  )
}
