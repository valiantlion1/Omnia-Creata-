import type { ChatAttachment, ChatMessage, ChatSuggestedAction, ChatSuggestedActionPayload } from '@/lib/studioApi'

export type ChatComposeMode = 'Think' | 'Vision' | 'Edit'

export type ChatCreatePrefill = {
  prompt: string
  negativePrompt?: string
  referenceAssetId?: string
  model?: string
  aspectRatio?: string
  steps?: number
  cfgScale?: number
  outputCount?: number
  workflow?: string
  referenceMode?: string
}

function hasImageAttachment(message: Pick<ChatMessage, 'attachments'> | null | undefined) {
  return Boolean(message?.attachments?.some((attachment) => attachment.kind === 'image'))
}

function resolveSuggestedWorkflow(payload: ChatSuggestedActionPayload | null): string {
  return payload?.generation_bridge?.blueprint.workflow || payload?.generation_bridge?.workflow || ''
}

function resolveSuggestedReferenceMode(payload: ChatSuggestedActionPayload | null): string {
  return payload?.generation_bridge?.blueprint.reference_mode || ''
}

function shouldRecoverVisualContext(action: ChatSuggestedAction): boolean {
  const payload = parseChatSuggestedActionPayload(action)
  const workflow = resolveSuggestedWorkflow(payload)
  const referenceMode = resolveSuggestedReferenceMode(payload)

  return (
    action.action === 'plan_edit' ||
    payload?.intent === 'analyze_image' ||
    workflow === 'edit' ||
    workflow === 'image_to_image' ||
    referenceMode === 'required'
  )
}

function findAncestorVisualUserMessage(messages: ChatMessage[], assistantMessage: ChatMessage): ChatMessage | null {
  const messageMap = new Map(messages.map((message) => [message.id, message]))
  const visited = new Set<string>()
  let cursor = assistantMessage.parent_message_id ?? null

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    const candidate = messageMap.get(cursor)
    if (!candidate) break
    if (candidate.role === 'user' && hasImageAttachment(candidate)) return candidate
    cursor = candidate.parent_message_id ?? null
  }

  return null
}

function findLatestPriorVisualUserMessage(messages: ChatMessage[], assistantMessage: ChatMessage): ChatMessage | null {
  const assistantIndex = messages.findIndex((message) => message.id === assistantMessage.id)
  if (assistantIndex <= 0) return null

  for (let index = assistantIndex - 1; index >= 0; index -= 1) {
    const candidate = messages[index]
    if (candidate.role !== 'user') continue
    if (hasImageAttachment(candidate)) return candidate
  }

  return null
}

function resolveReferenceSourceMessage(
  messages: ChatMessage[],
  assistantMessage: ChatMessage,
  action: ChatSuggestedAction,
): ChatMessage | null {
  const ancestorSource = findAncestorVisualUserMessage(messages, assistantMessage)
  if (ancestorSource) return ancestorSource
  if (!shouldRecoverVisualContext(action)) return null
  return findLatestPriorVisualUserMessage(messages, assistantMessage)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function parseChatSuggestedActionPayload(action: ChatSuggestedAction): ChatSuggestedActionPayload | null {
  if (!isRecord(action.payload)) return null

  const generationBridge = isRecord(action.payload.generation_bridge) ? action.payload.generation_bridge : null
  const blueprint = generationBridge && isRecord(generationBridge.blueprint) ? generationBridge.blueprint : null

  return {
    intent: asString(action.payload.intent),
    mode: asString(action.payload.mode),
    prompt_profile: asString(action.payload.prompt_profile),
    target_surface: asString(action.payload.target_surface),
    generation_bridge: generationBridge
      ? {
          workflow: asString(generationBridge.workflow) ?? '',
          prompt: asString(generationBridge.prompt) ?? '',
          negative_prompt: asString(generationBridge.negative_prompt) ?? '',
          reference_asset_id: asString(generationBridge.reference_asset_id) ?? '',
          blueprint: {
            workflow: asString(blueprint?.workflow) ?? '',
            prompt: asString(blueprint?.prompt) ?? '',
            negative_prompt: asString(blueprint?.negative_prompt) ?? '',
            reference_asset_id: asString(blueprint?.reference_asset_id) ?? '',
            model: asString(blueprint?.model) ?? '',
            width: asNumber(blueprint?.width) ?? 0,
            height: asNumber(blueprint?.height) ?? 0,
            steps: asNumber(blueprint?.steps) ?? 0,
            cfg_scale: asNumber(blueprint?.cfg_scale) ?? 0,
            aspect_ratio: asString(blueprint?.aspect_ratio) ?? '',
            output_count: asNumber(blueprint?.output_count) ?? 1,
            reference_mode: asString(blueprint?.reference_mode) ?? 'none',
          },
        }
      : undefined,
  }
}

export function resolveSuggestedDraft(action: ChatSuggestedAction): string {
  const payload = parseChatSuggestedActionPayload(action)
  return (
    payload?.generation_bridge?.prompt ||
    payload?.generation_bridge?.blueprint.prompt ||
    action.value ||
    action.label
  )
}

export function resolveComposeModeFromSuggestion(action: ChatSuggestedAction): ChatComposeMode | null {
  const payload = parseChatSuggestedActionPayload(action)
  const workflow = payload?.generation_bridge?.workflow || payload?.generation_bridge?.blueprint.workflow || ''

  if (action.action === 'plan_edit' || workflow === 'edit') return 'Edit'
  if (workflow === 'image_to_image' || workflow === 'text_to_image') return 'Vision'
  return null
}

export function resolveCreatePrefillFromSuggestion(action: ChatSuggestedAction): ChatCreatePrefill | null {
  const payload = parseChatSuggestedActionPayload(action)
  const blueprint = payload?.generation_bridge?.blueprint
  const prompt = resolveSuggestedDraft(action)

  if (!prompt && !blueprint) return null

  return {
    prompt,
    negativePrompt: payload?.generation_bridge?.negative_prompt || blueprint?.negative_prompt || undefined,
    referenceAssetId: payload?.generation_bridge?.reference_asset_id || blueprint?.reference_asset_id || undefined,
    model: blueprint?.model || undefined,
    aspectRatio: blueprint?.aspect_ratio || undefined,
    steps: blueprint?.steps || undefined,
    cfgScale: blueprint?.cfg_scale || undefined,
    outputCount: blueprint?.output_count || undefined,
    workflow: blueprint?.workflow || payload?.generation_bridge?.workflow || undefined,
    referenceMode: blueprint?.reference_mode || undefined,
  }
}

export function resolveSuggestedActionAttachments(
  messages: ChatMessage[],
  assistantMessage: ChatMessage,
  action: ChatSuggestedAction,
): ChatAttachment[] {
  const sourceMessage = resolveReferenceSourceMessage(messages, assistantMessage, action)
  return sourceMessage?.attachments.slice(0, 4) ?? []
}

export function resolveSuggestedActionReferenceAssetId(
  messages: ChatMessage[],
  assistantMessage: ChatMessage,
  action: ChatSuggestedAction,
): string | null {
  const payload = parseChatSuggestedActionPayload(action)
  const payloadReferenceAssetId =
    payload?.generation_bridge?.reference_asset_id || payload?.generation_bridge?.blueprint.reference_asset_id || null
  if (payloadReferenceAssetId) return payloadReferenceAssetId
  const attachments = resolveSuggestedActionAttachments(messages, assistantMessage, action)
  return attachments.find((attachment) => attachment.kind === 'image' && attachment.asset_id)?.asset_id ?? null
}
