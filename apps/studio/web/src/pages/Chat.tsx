import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react'

import { AppPage } from '@/components/StudioPrimitives'
import { studioApi, type ChatAttachment, type ChatConversation, type ChatMessage, type GenerationOutput, type JobStatus } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

/* ─── Constants ────────────────────────────────────── */

const CHAT_VISUAL_STORAGE_KEY = 'oc-chat-visual-messages-v1'
const CHAT_PROJECT_STORAGE_KEY = 'oc-chat-project-map-v1'

const composeModes = ['Think', 'Vision', 'Edit'] as const
type ComposeMode = (typeof composeModes)[number]

type PendingAttachment = ChatAttachment & { id: string }

type ChatVisualMessage = {
  id: string
  conversationId: string
  projectId: string | null
  jobId: string | null
  title: string
  prompt: string
  mode: ComposeMode
  status: JobStatus
  outputs: GenerationOutput[]
  error: string | null
  createdAt: string
  updatedAt: string
}

type ChatTimelineItem =
  | { kind: 'message'; id: string; createdAt: string; message: ChatMessage }
  | { kind: 'visual'; id: string; createdAt: string; visual: ChatVisualMessage }

/* ─── Helpers ──────────────────────────────────────── */

function titleFromDraft(input: string) {
  return input.trim().split(/\s+/).slice(0, 6).join(' ').slice(0, 72) || 'New chat'
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

async function toPendingAttachment(file: File): Promise<PendingAttachment> {
  return {
    id: crypto.randomUUID(),
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    url: await readAsDataUrl(file),
    asset_id: null,
    label: file.name,
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

function buildChatVisualPrompt(mode: ComposeMode, content: string, attachments: PendingAttachment[]) {
  const cleaned = content.trim()
  const imageHint = attachments.find((a) => a.kind === 'image')?.label
  if (mode === 'Edit') return cleaned || (imageHint ? `Refine the uploaded reference based on ${imageHint}` : 'Refine this visual with a premium direction')
  if (mode === 'Vision') return cleaned || (imageHint ? `Create a visual inspired by ${imageHint}` : 'Create a strong visual with premium composition')
  return cleaned
}

function isTerminalStatus(status: JobStatus) {
  return status === 'completed' || status === 'failed' || status === 'retryable_failed'
}

/* ─── Subcomponents ────────────────────────────────── */

/** ChatGPT-style progressive image reveal */
function ProgressiveImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { setLoaded(false); setRevealed(false) }, [src])
  useEffect(() => {
    if (!loaded) return
    const timer = window.setTimeout(() => setRevealed(true), 100)
    return () => window.clearTimeout(timer)
  }, [loaded])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#15161a]">
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
    </div>
  )
}

/** Pending generation: blur + pulse placeholder */
function GenerationPending({ title }: { title: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-400/80">Generating...</div>
      <div className="relative overflow-hidden rounded-2xl bg-[#15161a]">
        <div className="aspect-[4/5] w-full max-w-[360px] animate-pulse bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-cyan-500/[0.08] via-transparent to-transparent" />
      </div>
      <div className="text-sm text-zinc-400">{title}</div>
    </div>
  )
}

/** Welcome / empty state when no messages */
function ChatWelcome({ onHint }: { onHint: (v: string) => void }) {
  const suggestions = [
    { label: '🎨 Create an image', value: 'Create a cinematic portrait with dramatic lighting, dark background, high detail' },
    { label: '✏️ Edit a photo', value: 'I want to edit a photo — let me upload it first' },
    { label: '💡 Help with a prompt', value: 'Help me write a prompt for a futuristic city skyline at night' },
    { label: '🖼️ Describe my image', value: 'Analyze this image and tell me what you see' },
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/[0.08]">
        <MessageCircle className="h-7 w-7 text-cyan-300" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
        What would you like to create?
      </h2>
      <p className="mt-3 max-w-lg text-center text-base leading-7 text-zinc-400">
        Describe an image, upload a photo to edit, or ask for creative guidance.
        Images are generated directly in the conversation.
      </p>
      <div className="mt-8 grid max-w-2xl gap-2.5 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onHint(s.value)}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5 text-left text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <span className="mr-2">{s.label.split(' ')[0]}</span>
            <span className="text-zinc-400">{s.label.split(' ').slice(1).join(' ')}</span>
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
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const projectPromiseRef = useRef<Record<string, Promise<string>>>({})

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
    setVisualMessages(readStoredJson<ChatVisualMessage[]>(CHAT_VISUAL_STORAGE_KEY, []))
    setConversationProjects(readStoredJson<Record<string, string>>(CHAT_PROJECT_STORAGE_KEY, {}))
  }, [])

  useEffect(() => { window.localStorage.setItem(CHAT_VISUAL_STORAGE_KEY, JSON.stringify(visualMessages)) }, [visualMessages])
  useEffect(() => { window.localStorage.setItem(CHAT_PROJECT_STORAGE_KEY, JSON.stringify(conversationProjects)) }, [conversationProjects])

  /* ─── Auto-resize textarea ────────────────────── */

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`
  }, [draft])

  /* ─── Auto-detect mode from attachments ───────── */

  useEffect(() => {
    if (pendingAttachments.some((a) => a.kind === 'image')) {
      if (composeMode === 'Think') setComposeMode('Vision')
    }
  }, [pendingAttachments, composeMode])

  /* ─── Queries ─────────────────────────────────── */

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => studioApi.listConversations(),
    enabled: canLoadPrivate,
  })

  useEffect(() => {
    const conversations = conversationsQuery.data?.conversations ?? []
    const requestedConversation = searchParams.get('conversation')
    const requestedNew = searchParams.get('new') === '1'
    if (!activeConversationId && conversations.length && !requestedConversation && !requestedNew) {
      setActiveConversationId(conversations[0].id)
    }
  }, [activeConversationId, conversationsQuery.data, searchParams])

  const conversationDetailQuery = useQuery({
    queryKey: ['conversation', activeConversationId],
    queryFn: () => studioApi.getConversation(activeConversationId as string),
    enabled: canLoadPrivate && Boolean(activeConversationId),
  })

  const createConversationMutation = useMutation({
    mutationFn: (payload?: { title?: string; model?: string }) => studioApi.createConversation(payload),
  })

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: { conversationId: string; content: string; model?: string; attachments?: ChatAttachment[] }) =>
      studioApi.sendConversationMessage(payload.conversationId, { content: payload.content, model: payload.model, attachments: payload.attachments }),
  })

  /* ─── New conversation effect ─────────────────── */

  useEffect(() => {
    const requestedNew = searchParams.get('new') === '1'
    if (!requestedNew || !canLoadPrivate || createConversationMutation.isPending) return
    let cancelled = false
    const run = async () => {
      try {
        const conversation = await createConversationMutation.mutateAsync({})
        if (cancelled) return
        setActiveConversationId(conversation.id)
        setDraft('')
        navigate(`/chat?conversation=${conversation.id}`, { replace: true })
        await queryClient.invalidateQueries({ queryKey: ['conversations'] })
      } catch { /* handled by mutation */ }
    }
    void run()
    return () => { cancelled = true }
  }, [canLoadPrivate, createConversationMutation, navigate, queryClient, searchParams])

  /* ─── Data derivations ────────────────────────── */

  const conversationList = conversationsQuery.data?.conversations ?? []
  const messages = conversationDetailQuery.data?.messages ?? []
  const activeConversation = conversationDetailQuery.data?.conversation ?? conversationList.find((item) => item.id === activeConversationId) ?? null
  const latestAssistantMessage = useMemo(() => [...messages].reverse().find((m) => m.role === 'assistant') ?? null, [messages])
  const suggestedActions = latestAssistantMessage?.suggested_actions ?? []
  const conversationVisuals = useMemo(
    () => visualMessages.filter((v) => v.conversationId === activeConversationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activeConversationId, visualMessages],
  )
  const timeline = useMemo<ChatTimelineItem[]>(() => {
    const messageItems: ChatTimelineItem[] = messages.map((m) => ({ kind: 'message', id: m.id, createdAt: m.created_at, message: m }))
    const visualItems: ChatTimelineItem[] = conversationVisuals.map((v) => ({ kind: 'visual', id: v.id, createdAt: v.createdAt, visual: v }))
    return [...messageItems, ...visualItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [conversationVisuals, messages])

  /* ─── Poll visual generation status ───────────── */

  useEffect(() => {
    if (!canLoadPrivate) return
    const pending = visualMessages.filter((v) => v.jobId && !isTerminalStatus(v.status))
    if (!pending.length) return

    const interval = window.setInterval(async () => {
      const snapshots = await Promise.all(
        pending.map(async (v) => {
          try { const g = await studioApi.getGeneration(v.jobId as string); return [v.id, g] as const }
          catch { return null }
        }),
      )
      const snapshotMap = new Map(snapshots.filter(Boolean) as Array<readonly [string, Awaited<ReturnType<typeof studioApi.getGeneration>>]>)
      let invalidate = false
      setVisualMessages((current) =>
        current.map((v) => {
          const snap = snapshotMap.get(v.id)
          if (!snap) return v
          if (!isTerminalStatus(v.status) && isTerminalStatus(snap.status)) invalidate = true
          return { ...v, title: snap.title, status: snap.status, outputs: snap.outputs, error: snap.error, updatedAt: new Date().toISOString() }
        }),
      )
      if (invalidate) {
        await queryClient.invalidateQueries({ queryKey: ['assets'] })
        await queryClient.invalidateQueries({ queryKey: ['generations'] })
        await queryClient.invalidateQueries({ queryKey: ['projects'] })
      }
    }, 1500)
    return () => window.clearInterval(interval)
  }, [canLoadPrivate, queryClient, visualMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [timeline, pendingAttachments.length])

  /* ─── Handlers ────────────────────────────────── */

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    try {
      const next = await Promise.all(files.slice(0, 4).map((f) => toPendingAttachment(f)))
      setPendingAttachments((c) => [...c, ...next].slice(0, 4))
    } finally { event.target.value = '' }
  }

  const ensureConversationProjectId = useCallback(
    async (conversation: ChatConversation) => {
      const existing = conversationProjects[conversation.id]
      if (existing) return existing
      if (!projectPromiseRef.current[conversation.id]) {
        projectPromiseRef.current[conversation.id] = studioApi
          .createProject({ title: `Chat - ${conversation.title}`.slice(0, 60), description: 'Created from Studio Chat' })
          .then((p) => { setConversationProjects((c) => ({ ...c, [conversation.id]: p.id })); return p.id })
          .finally(() => { delete projectPromiseRef.current[conversation.id] })
      }
      return projectPromiseRef.current[conversation.id]
    },
    [conversationProjects],
  )

  const startVisualGeneration = useCallback(
    async (conversation: ChatConversation, content: string, attachments: PendingAttachment[], mode: ComposeMode) => {
      const prompt = buildChatVisualPrompt(mode, content, attachments)
      if (!prompt) return
      const projectId = await ensureConversationProjectId(conversation)
      const generation = await studioApi.createGeneration({
        project_id: projectId, prompt, negative_prompt: '', model: 'flux-schnell',
        width: 1024, height: 1024, steps: 24, cfg_scale: 6,
        seed: Math.floor(Math.random() * 1_000_000_000),
        aspect_ratio: '1:1', output_count: 1,
      })
      setVisualMessages((c) => [{
        id: `visual-${generation.job_id}`, conversationId: conversation.id, projectId, jobId: generation.job_id,
        title: generation.title, prompt, mode, status: generation.status, outputs: [], error: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }, ...c])
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
    [ensureConversationProjectId, queryClient],
  )

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    const attachments = pendingAttachments.map(({ id: _id, ...a }) => a)
    if ((!content && !attachments.length) || sendMessageMutation.isPending || createConversationMutation.isPending || !canLoadPrivate) return

    let conversation = conversationDetailQuery.data?.conversation ?? conversationsQuery.data?.conversations.find((c) => c.id === activeConversationId) ?? null
    if (!conversation) {
      conversation = await createConversationMutation.mutateAsync({ title: titleFromDraft(content), model: composeMode.toLowerCase() })
      setActiveConversationId(conversation.id)
      navigate(`/chat?conversation=${conversation.id}`, { replace: true })
    }

    const result = await sendMessageMutation.mutateAsync({ conversationId: conversation.id, content, model: composeMode.toLowerCase(), attachments })
    setActiveConversationId(result.conversation.id)
    setDraft('')
    setPendingAttachments([])
    navigate(`/chat?conversation=${result.conversation.id}`, { replace: true })

    await queryClient.invalidateQueries({ queryKey: ['conversations'] })
    await queryClient.invalidateQueries({ queryKey: ['conversation', result.conversation.id] })

    if (composeMode !== 'Think') {
      try { await startVisualGeneration(result.conversation, content, pendingAttachments, composeMode) }
      catch {
        setVisualMessages((c) => [{
          id: `visual-${crypto.randomUUID()}`, conversationId: result.conversation.id,
          projectId: conversationProjects[result.conversation.id] ?? null, jobId: null,
          title: titleFromDraft(content), prompt: content, mode: composeMode,
          status: 'failed', outputs: [], error: 'Unable to start image generation.',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }, ...c])
      }
    }
  }, [activeConversationId, canLoadPrivate, composeMode, conversationDetailQuery.data?.conversation, conversationProjects, conversationsQuery.data?.conversations, createConversationMutation, draft, navigate, pendingAttachments, queryClient, sendMessageMutation, startVisualGeneration])

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
            {/* Mode pills */}
            {composeModes.map((mode) => (
              <button
                key={mode}
                onClick={() => setComposeMode(mode)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  composeMode === mode
                    ? mode === 'Think' ? 'bg-white/[0.1] text-white ring-1 ring-white/[0.12]'
                    : mode === 'Vision' ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/20'
                    : 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/20'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {mode === 'Think' ? '💭' : mode === 'Vision' ? '🎨' : '✏️'} {mode}
              </button>
            ))}
            {auth?.guest ? (
              <Link to="/signup" className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black transition hover:opacity-90">
                Start free
              </Link>
            ) : null}
          </div>
        </div>

        {/* ── Messages area ───────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversationDetailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chat...
            </div>
          ) : timeline.length ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
              {timeline.map((item) => {
                if (item.kind === 'message') {
                  const msg = item.message
                  const isUser = msg.role === 'user'
                  return (
                    <div key={item.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] space-y-2.5 md:max-w-[75%]`}>
                        {/* Attachments */}
                        {msg.attachments.length ? (
                          <div className="flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <div key={att.url} className="overflow-hidden rounded-2xl border border-white/[0.06]">
                                {att.kind === 'image' ? (
                                  <img src={att.url} alt={att.label} className="h-20 w-20 object-cover" />
                                ) : (
                                  <div className="flex h-20 w-20 items-center justify-center bg-white/[0.03] text-[10px] text-zinc-400">{att.label}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Message bubble */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-[14px] leading-7 ${
                            isUser
                              ? 'rounded-br-md bg-[#1e293b] text-zinc-100'
                              : 'bg-white/[0.04] text-zinc-200 ring-1 ring-white/[0.04]'
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Suggested actions */}
                        {!isUser && msg.id === latestAssistantMessage?.id && suggestedActions.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {suggestedActions.slice(0, 4).map((action) => (
                              <button
                                key={action.id}
                                onClick={() => setDraft(action.value || action.label)}
                                className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                }

                /* ── Visual generation item ─────────── */
                const visual = item.visual
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-[85%] space-y-2 md:max-w-[75%]">
                      {visual.status === 'completed' && visual.outputs.length ? (
                        <div className="space-y-3">
                          {visual.outputs.map((output) => (
                            <ProgressiveImage key={output.asset_id} src={output.url} alt={visual.title} />
                          ))}
                          <div className="flex items-center gap-3 text-sm">
                            <Link to="/library/images" className="font-medium text-white transition hover:text-zinc-200">
                              Open in Library
                            </Link>
                            {visual.projectId ? (
                              <Link to={`/projects/${visual.projectId}`} className="text-zinc-400 transition hover:text-white">
                                Open project
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ) : visual.status === 'failed' || visual.status === 'retryable_failed' ? (
                        <div className="space-y-2">
                          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                            {visual.error || 'Image generation failed.'}
                          </div>
                        </div>
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
        <div className="border-t border-white/[0.04] bg-[#0b0b0d]/80 px-4 py-3 backdrop-blur-xl">
          <div className="mx-auto w-full max-w-3xl">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111216]/80 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">

              {/* Pending attachments */}
              {pendingAttachments.length ? (
                <div className="flex flex-wrap gap-2 border-b border-white/[0.04] px-4 py-2.5">
                  {pendingAttachments.map((att) => (
                    <div key={att.id} className="group relative">
                      {att.kind === 'image' ? (
                        <img src={att.url} alt={att.label} className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/[0.08]" />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/[0.04] text-[10px] text-zinc-400 ring-1 ring-white/[0.08]">
                          {att.label.split('.').pop()?.toUpperCase()}
                        </div>
                      )}
                      <button
                        onClick={() => setPendingAttachments((c) => c.filter((a) => a.id !== att.id))}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-white/[0.1] opacity-0 transition group-hover:opacity-100 hover:bg-zinc-700"
                      >
                        <X className="h-3 w-3" />
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
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                  title="Attach image"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={auth?.guest ? 'Sign in to start chatting...' : 'Message...'}
                  className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
                />

                <button
                  onClick={handleSend}
                  disabled={(!draft.trim() && !pendingAttachments.length) || !canLoadPrivate || sendMessageMutation.isPending || createConversationMutation.isPending}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Send"
                >
                  {sendMessageMutation.isPending || createConversationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Mode hint */}
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-zinc-600">
              <span>
                {composeMode === 'Think' ? '💭 Text-only conversation' : composeMode === 'Vision' ? '🎨 Will generate images' : '✏️ Will edit/refine images'}
              </span>
              <span>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>

          {/* Error toast */}
          {sendMessageMutation.error ? (
            <div className="mx-auto mt-3 w-full max-w-3xl rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {sendMessageMutation.error instanceof Error ? sendMessageMutation.error.message : 'Unable to send message.'}
            </div>
          ) : null}
        </div>
      </div>
    </AppPage>
  )
}
