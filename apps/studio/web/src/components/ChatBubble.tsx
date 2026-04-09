import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, RefreshCw, Copy, Edit2, Check, Loader2 } from 'lucide-react'
import { useLightbox } from '@/components/Lightbox'
import { type ChatMessage, type ChatFeedback, type ChatSuggestedAction } from '@/lib/studioApi'

type AssistantPlanChipTone = 'neutral' | 'accent' | 'warning'

type AssistantPlanChip = {
  key: string
  label: string
  tone: AssistantPlanChipTone
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatWorkflowLabel(workflow: string) {
  if (workflow === 'text_to_image') return 'Create plan'
  if (workflow === 'image_to_image') return 'Image-to-image'
  if (workflow === 'edit') return 'Edit plan'
  return workflow
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatModelLabel(model: string) {
  return model
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function formatProviderLabel(provider: string) {
  const normalized = provider.trim().toLowerCase()
  if (normalized === 'openrouter') return 'OpenRouter'
  if (normalized === 'openai') return 'OpenAI'
  if (normalized === 'gemini') return 'Gemini'
  if (normalized === 'heuristic') return 'Fallback reply'
  return provider
}

function resolveAssistantPlanChips(message: ChatMessage): AssistantPlanChip[] {
  if (message.role === 'user') return []

  const metadata = isRecord(message.metadata) ? message.metadata : null
  const bridge = isRecord(metadata?.generation_bridge) ? metadata.generation_bridge : null
  const blueprint = bridge && isRecord(bridge.blueprint) ? bridge.blueprint : null
  const chips: AssistantPlanChip[] = []
  const seen = new Set<string>()

  const pushChip = (key: string, label: string | null, tone: AssistantPlanChipTone = 'neutral') => {
    if (!label || seen.has(key)) return
    seen.add(key)
    chips.push({ key, label, tone })
  }

  const degraded = metadata?.degraded === true || asString(metadata?.provider) === 'heuristic'
  const provider = asString(metadata?.provider)
  const responseMode = asString(metadata?.response_mode)
  const providerStatus = asString(metadata?.provider_status)
  const usedLlm = metadata?.used_llm === true || responseMode === 'live_provider_reply'
  const fallbackReason = asString(metadata?.fallback_reason)
  const premiumLaneUnavailable =
    metadata?.premium_lane_unavailable === true || responseMode === 'premium_lane_unavailable'
  const isFallbackReply = degraded || responseMode === 'degraded_fallback_reply'

  if (isFallbackReply) {
    pushChip('degraded', 'Fallback reply', 'warning')
    if (premiumLaneUnavailable || providerStatus === 'degraded' || fallbackReason) {
      pushChip('provider-state', 'Premium lane unavailable', 'warning')
    }
  } else if (asString(metadata?.selected_quality_tier) === 'premium') {
    pushChip('quality', 'Premium lane', 'accent')
  }

  if (premiumLaneUnavailable) {
    pushChip('provider-state', 'Premium lane unavailable', 'warning')
  }

  if (!isFallbackReply && usedLlm && provider) {
    pushChip('provider', formatProviderLabel(provider), 'accent')
  }

  if (metadata?.follow_up_refinement === true) {
    pushChip('follow-up', 'Refinement', 'accent')
  }

  const workflow = asString(blueprint?.workflow) || asString(bridge?.workflow)
  if (workflow) {
    pushChip('workflow', formatWorkflowLabel(workflow), workflow === 'edit' ? 'accent' : 'neutral')
  }

  if (asString(blueprint?.reference_mode) === 'required') {
    pushChip('reference', 'Reference locked', 'warning')
  }

  const model = asString(blueprint?.model)
  if (model) {
    pushChip('model', formatModelLabel(model))
  }

  const aspectRatio = asString(blueprint?.aspect_ratio)
  if (aspectRatio) {
    pushChip('aspect', aspectRatio)
  }

  if (message.suggested_actions.some((action) => action.action === 'open_create')) {
    pushChip('handoff', 'Create-ready', 'accent')
  } else if (message.suggested_actions.some((action) => action.action === 'plan_edit')) {
    pushChip('handoff', 'Edit-ready', 'accent')
  }

  return chips.slice(0, 6)
}

function resolveChipClassName(tone: AssistantPlanChipTone) {
  if (tone === 'accent') {
    return 'border-[rgb(var(--primary-light)/0.22)] bg-[rgb(var(--primary-light)/0.08)] text-[rgb(var(--primary-light))]'
  }
  if (tone === 'warning') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  }
  return 'border-white/[0.08] bg-[#111216] text-zinc-300'
}

/* ─── Streaming Text Reveal ─────────────────────────── */

function ProgressiveText({ text, enabled }: { text: string; enabled: boolean }) {
  const [displayedText, setDisplayedText] = useState(enabled ? '' : text)
  const isComplete = !enabled || displayedText.length === text.length

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text)
      return
    }
    
    // Very fast but smooth unrolling.
    let i = 0
    let lastTime = performance.now()
    let frameId: number
    
    const tick = (now: number) => {
      const delta = now - lastTime
      if (delta > 16) { // Every ~16ms, progress
        // Calculate characters to add based on a fast reading speed (approx 80 chars per frame)
        i += Math.max(2, Math.floor(text.length / 30))
        if (i >= text.length) {
          setDisplayedText(text)
          return
        }
        setDisplayedText(text.slice(0, i))
        lastTime = now
      }
      frameId = requestAnimationFrame(tick)
    }
    
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [text, enabled])

  return (
    <div className="whitespace-pre-wrap break-words opacity-95">
      {displayedText}
      {!isComplete && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-[rgb(var(--primary-light))] align-text-bottom" />
      )}
    </div>
  )
}

/* ─── Main Bubble Component ─────────────────────────── */

interface ChatBubbleProps {
  message: ChatMessage
  isLatest: boolean
  isLatestUser: boolean
  onEdit?: (messageId: string, newContent: string) => Promise<void>
  onRegenerate?: (messageId: string) => Promise<void>
  onFeedback?: (messageId: string, feedback: ChatFeedback) => Promise<void>
  onSuggestionClick?: (action: ChatSuggestedAction, message: ChatMessage) => void
}

export function ChatBubble({ message, isLatest, isLatestUser, onEdit, onRegenerate, onFeedback, onSuggestionClick }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const { openLightbox } = useLightbox()
  const assistantPlanChips = resolveAssistantPlanChips(message)

  // Interaction State
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(message.content)
  const [isEditSaving, setIsEditSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)
  const [feedbackState, setFeedbackState] = useState<ChatFeedback | undefined>(message.feedback)

  // Track if we should animate (only strictly recent, non-user message that hasn't finished animating)
  const [shouldAnimate] = useState(() => {
    const ageMs = Date.now() - new Date(message.created_at).getTime()
    return isLatest && !isUser && ageMs < 5000 // if mounted within 5s of creation, we animate
  })

  // Handlers
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setHasCopied(true)
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleEditSave = async () => {
    if (!onEdit || !editDraft.trim() || editDraft === message.content) {
      setIsEditing(false)
      return
    }
    try {
      setIsEditSaving(true)
      await onEdit(message.id, editDraft)
      setIsEditing(false)
    } finally {
      setIsEditSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    try {
      setIsRegenerating(true)
      await onRegenerate(message.id)
    } finally {
      setIsRegenerating(false) // handled by unmount if successful usually
    }
  }

  const handleFeedback = async (fb: ChatFeedback) => {
    if (!onFeedback || fb === feedbackState) return
    const prev = feedbackState
    setFeedbackState(fb)
    try {
      await onFeedback(message.id, fb)
    } catch {
      setFeedbackState(prev) // revert on error
    }
  }

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in duration-500`}>
      <div className={`max-w-[88%] space-y-2.5 md:max-w-[80%]`}>
        
        {/* Attachments rendering */}
        {message.attachments?.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {message.attachments.map((att) => (
              <div key={att.url} className="group/att relative overflow-hidden rounded-2xl border border-white/[0.06] shadow-sm">
                {att.kind === 'image' ? (
                  <>
                    <img
                      src={att.url}
                      alt={att.label}
                      className="h-24 w-24 cursor-zoom-in object-cover transition-transform hover:scale-105"
                      loading="lazy"
                      onClick={() => openLightbox(att.url, att.label || 'Attached image', { title: att.label || 'Attached image' })}
                    />
                  </>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-[#111216] text-[11px] font-medium text-zinc-400">
                    {att.label.split('.').pop()?.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bubble Core */}
        {message.content.trim() ? (
          <div className={`relative flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            {isEditing ? (
              // Edit Mode UI
              <div className="w-full flex-1 min-w-[300px] rounded-[22px] bg-[#111216] ring-1 ring-white/10 p-3 shadow-xl">
                <textarea
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  className="w-full min-h-[80px] bg-transparent text-[15px] leading-relaxed text-white outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleEditSave()
                    }
                    if (e.key === 'Escape') setIsEditing(false)
                  }}
                />
                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-white/[0.04]">
                  <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition">Cancel</button>
                  <button onClick={handleEditSave} disabled={isEditSaving} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-black transition-all" style={{ background: 'linear-gradient(135deg, rgb(var(--primary-light)), rgb(var(--accent)))' }}>
                    {isEditSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save & Submit'}
                  </button>
                </div>
              </div>
            ) : (
              // Standard Bubble
              <div className="relative group/content">
                <div
                  className={`px-5 py-3.5 text-[15px] leading-[1.65] shadow-sm transition-all duration-300 ${
                    isUser
                      ? 'rounded-[22px] rounded-br-md bg-gradient-to-br from-[rgb(var(--primary-light)/0.15)] to-[rgb(var(--accent)/0.05)] text-white ring-1 ring-[rgb(var(--primary-light)/0.2)] shadow-[0_4px_24px_rgba(0,0,0,0.2)]'
                      : 'rounded-[22px] rounded-bl-md bg-[#13151a] text-zinc-200 ring-1 ring-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.1)]'
                  }`}
                >
                  <ProgressiveText text={message.content} enabled={shouldAnimate} />
                </div>

                {/* Hover Actions (Inline layout below the bubble) */}
                <div className={`absolute top-full mt-1.5 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/content:opacity-100 ${isUser ? 'right-0 flex-row-reverse' : 'left-0'}`}>
                  {/* User Actions */}
                  {isUser && isLatestUser && (
                    <button onClick={() => setIsEditing(true)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-zinc-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-white transition shadow-sm" title="Edit message">
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}

                  {/* Assistant Actions */}
                  {!isUser && (
                    <div className="flex items-center gap-1 bg-[#111216] rounded-full px-1.5 py-1 ring-1 ring-white/10 shadow-lg backdrop-blur-md">
                      <button onClick={handleCopy} className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white transition" title="Copy text">
                        {hasCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                      <button onClick={() => handleFeedback('like')} className={`flex h-6 w-6 items-center justify-center rounded-full transition ${feedbackState === 'like' ? 'text-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light)/0.1)]' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`} title="Good response">
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleFeedback('dislike')} className={`flex h-6 w-6 items-center justify-center rounded-full transition ${feedbackState === 'dislike' ? 'text-rose-400 bg-rose-400/10' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`} title="Bad response">
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                      {isLatest && onRegenerate && (
                        <>
                          <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                          <button onClick={handleRegenerate} disabled={isRegenerating} className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-[rgb(var(--primary-light))] transition" title="Regenerate">
                            <RefreshCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {!isUser && assistantPlanChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {assistantPlanChips.map((chip) => (
              <span
                key={chip.key}
                className={`rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.02em] ${resolveChipClassName(chip.tone)}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Suggested Actions (Only on latest assistant message) */}
        {!isUser && isLatest && message.suggested_actions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {message.suggested_actions.slice(0, 4).map((action) => (
              <button
                key={action.id}
                onClick={() => onSuggestionClick?.(action, message)}
                className="rounded-full border border-white/[0.08] bg-[#111216] px-4 py-2 text-[12px] font-medium text-zinc-300 transition-all duration-300 hover:bg-white/[0.08] hover:text-white hover:border-[rgb(var(--primary-light)/0.3)] shadow-sm"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
