import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2, Plus, Send, Sparkles, X } from 'lucide-react'

import { AppPage } from '@/components/StudioPrimitives'
import { studioApi, type ChatAttachment, type ChatConversation, type ChatMessage, type GenerationOutput, type JobStatus } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

const composeModes = ['Think', 'Vision', 'Edit'] as const
const CHAT_VISUAL_STORAGE_KEY = 'oc-chat-visual-messages-v1'
const CHAT_PROJECT_STORAGE_KEY = 'oc-chat-project-map-v1'

type ComposeMode = (typeof composeModes)[number]

type PendingAttachment = ChatAttachment & {
  id: string
}

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
  const imageHint = attachments.find((attachment) => attachment.kind === 'image')?.label

  if (mode === 'Edit') {
    return cleaned || (imageHint ? `Refine the uploaded reference with a cleaner premium direction based on ${imageHint}` : 'Refine this visual with a cleaner premium direction')
  }

  if (mode === 'Vision') {
    return cleaned || (imageHint ? `Create a stronger visual direction inspired by ${imageHint}` : 'Create a strong visual direction with premium composition and lighting')
  }

  return cleaned
}

function getVisualStatusLabel(status: JobStatus) {
  switch (status) {
    case 'pending':
      return 'Generation started'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Completed'
    case 'retryable_failed':
      return 'Needs retry'
    case 'failed':
      return 'Failed'
    default:
      return 'Queued'
  }
}

function isTerminalStatus(status: JobStatus) {
  return status === 'completed' || status === 'failed' || status === 'retryable_failed'
}

function ProgressiveChatImage({ src, alt }: { src: string; alt: string }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setImageLoaded(false)
    setRevealed(false)
  }, [src])

  useEffect(() => {
    if (!imageLoaded) return
    const timer = window.setTimeout(() => setRevealed(true), 120)
    return () => window.clearTimeout(timer)
  }, [imageLoaded])

  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-black/20">
      <img src={src} alt="" aria-hidden className="aspect-[4/5] w-full object-cover blur-xl saturate-110 scale-[1.04]" />
      <img
        src={src}
        alt={alt}
        onLoad={() => setImageLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-[clip-path,filter,opacity] duration-[1800ms] ease-out"
        style={{
          clipPath: revealed ? 'inset(0 0 0 0 round 22px)' : 'inset(0 0 100% 0 round 22px)',
          filter: imageLoaded ? 'none' : 'blur(12px)',
          opacity: imageLoaded ? 1 : 0.7,
        }}
      />
      {!revealed ? (
        <>
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/30 via-white/10 to-transparent transition-transform duration-[1800ms] ease-out"
            style={{ transform: revealed ? 'translateY(360px)' : 'translateY(0)' }}
          />
        </>
      ) : null}
    </div>
  )
}

function PendingVisualCard({ mode, title }: { mode: ComposeMode; title: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{getVisualStatusLabel('processing')}</div>
        <div className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-300">{mode}</div>
      </div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#15161a]">
        <div className="aspect-[4/5] w-full bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent blur-[2px]" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [searchParams] = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const projectPromiseRef = useRef<Record<string, Promise<string>>>({})

  const [draft, setDraft] = useState('')
  const [composeMode, setComposeMode] = useState<ComposeMode>(composeModes[0])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const [visualMessages, setVisualMessages] = useState<ChatVisualMessage[]>([])
  const [conversationProjects, setConversationProjects] = useState<Record<string, string>>({})

  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  useEffect(() => {
    const incoming = searchParams.get('draft')
    if (incoming) setDraft(incoming)
  }, [searchParams])

  useEffect(() => {
    const requestedConversation = searchParams.get('conversation')
    if (requestedConversation) {
      setActiveConversationId(requestedConversation)
    }
  }, [searchParams])

  useEffect(() => {
    setVisualMessages(readStoredJson<ChatVisualMessage[]>(CHAT_VISUAL_STORAGE_KEY, []))
    setConversationProjects(readStoredJson<Record<string, string>>(CHAT_PROJECT_STORAGE_KEY, {}))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(CHAT_VISUAL_STORAGE_KEY, JSON.stringify(visualMessages))
  }, [visualMessages])

  useEffect(() => {
    window.localStorage.setItem(CHAT_PROJECT_STORAGE_KEY, JSON.stringify(conversationProjects))
  }, [conversationProjects])

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
      } catch {
        // handled by mutation state
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [canLoadPrivate, createConversationMutation, navigate, queryClient, searchParams])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const nextAttachments = await Promise.all(files.slice(0, 4).map((file) => toPendingAttachment(file)))
      setPendingAttachments((current) => [...current, ...nextAttachments].slice(0, 4))
    } finally {
      event.target.value = ''
    }
  }

  const ensureConversationProjectId = useCallback(
    async (conversation: ChatConversation) => {
      const existing = conversationProjects[conversation.id]
      if (existing) return existing

      if (!projectPromiseRef.current[conversation.id]) {
        projectPromiseRef.current[conversation.id] = studioApi
          .createProject({
            title: `Chat - ${conversation.title}`.slice(0, 60),
            description: 'Created from Studio Chat',
          })
          .then((project) => {
            setConversationProjects((current) => ({ ...current, [conversation.id]: project.id }))
            return project.id
          })
          .finally(() => {
            delete projectPromiseRef.current[conversation.id]
          })
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
        project_id: projectId,
        prompt,
        negative_prompt: '',
        model: 'flux-schnell',
        width: 1024,
        height: 1024,
        steps: 24,
        cfg_scale: 6,
        seed: Math.floor(Math.random() * 1_000_000_000),
        aspect_ratio: '1:1',
        output_count: 1,
      })

      setVisualMessages((current) => [
        {
          id: `visual-${generation.job_id}`,
          conversationId: conversation.id,
          projectId,
          jobId: generation.job_id,
          title: generation.title,
          prompt,
          mode,
          status: generation.status,
          outputs: [],
          error: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ])

      await queryClient.invalidateQueries({ queryKey: ['assets'] })
      await queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
    [ensureConversationProjectId, queryClient],
  )

  const handleSend = useCallback(async () => {
    const content = draft.trim()
    const attachments = pendingAttachments.map(({ id: _id, ...attachment }) => attachment)
    if ((!content && !attachments.length) || sendMessageMutation.isPending || createConversationMutation.isPending || !canLoadPrivate) return

    let conversation = conversationDetailQuery.data?.conversation ?? conversationsQuery.data?.conversations.find((item) => item.id === activeConversationId) ?? null

    if (!conversation) {
      conversation = await createConversationMutation.mutateAsync({ title: titleFromDraft(content), model: composeMode.toLowerCase() })
      setActiveConversationId(conversation.id)
      navigate(`/chat?conversation=${conversation.id}`, { replace: true })
    }

    const result = await sendMessageMutation.mutateAsync({
      conversationId: conversation.id,
      content,
      model: composeMode.toLowerCase(),
      attachments,
    })

    setActiveConversationId(result.conversation.id)
    setDraft('')
    setPendingAttachments([])
    navigate(`/chat?conversation=${result.conversation.id}`, { replace: true })

    await queryClient.invalidateQueries({ queryKey: ['conversations'] })
    await queryClient.invalidateQueries({ queryKey: ['conversation', result.conversation.id] })

    if (composeMode !== 'Think') {
      try {
        await startVisualGeneration(result.conversation, content, pendingAttachments, composeMode)
      } catch {
        setVisualMessages((current) => [
          {
            id: `visual-${crypto.randomUUID()}`,
            conversationId: result.conversation.id,
            projectId: conversationProjects[result.conversation.id] ?? null,
            jobId: null,
            title: titleFromDraft(content),
            prompt: content,
            mode: composeMode,
            status: 'failed',
            outputs: [],
            error: 'Unable to start image generation from chat.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...current,
        ])
      }
    }
  }, [
    activeConversationId,
    canLoadPrivate,
    composeMode,
    conversationDetailQuery.data?.conversation,
    conversationProjects,
    conversationsQuery.data?.conversations,
    createConversationMutation,
    draft,
    navigate,
    pendingAttachments,
    queryClient,
    sendMessageMutation,
    startVisualGeneration,
  ])

  const handleSuggestedAction = (value: string | null, fallback: string) => {
    setDraft(value || fallback)
  }

  const handleComposerKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing) return

    event.preventDefault()
    await handleSend()
  }

  const conversationList = conversationsQuery.data?.conversations ?? []
  const messages = conversationDetailQuery.data?.messages ?? []
  const activeConversation =
    conversationDetailQuery.data?.conversation ?? conversationList.find((item) => item.id === activeConversationId) ?? null
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant') ?? null,
    [messages],
  )
  const suggestedActions = latestAssistantMessage?.suggested_actions ?? []
  const conversationVisuals = useMemo(
    () =>
      visualMessages
        .filter((item) => item.conversationId === activeConversationId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [activeConversationId, visualMessages],
  )
  const timeline = useMemo<ChatTimelineItem[]>(() => {
    const messageItems: ChatTimelineItem[] = messages.map((message) => ({
      kind: 'message',
      id: message.id,
      createdAt: message.created_at,
      message,
    }))
    const visualItems: ChatTimelineItem[] = conversationVisuals.map((visual) => ({
      kind: 'visual',
      id: visual.id,
      createdAt: visual.createdAt,
      visual,
    }))

    return [...messageItems, ...visualItems].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [conversationVisuals, messages])

  useEffect(() => {
    if (!canLoadPrivate) return
    const pending = visualMessages.filter((item) => item.jobId && !isTerminalStatus(item.status))
    if (!pending.length) return

    const interval = window.setInterval(async () => {
      const snapshots = await Promise.all(
        pending.map(async (item) => {
          try {
            const generation = await studioApi.getGeneration(item.jobId as string)
            return [item.id, generation] as const
          } catch {
            return null
          }
        }),
      )

      const snapshotMap = new Map(snapshots.filter(Boolean) as Array<readonly [string, Awaited<ReturnType<typeof studioApi.getGeneration>>]>)
      let invalidate = false

      setVisualMessages((current) =>
        current.map((item) => {
          const snapshot = snapshotMap.get(item.id)
          if (!snapshot) return item
          if (!isTerminalStatus(item.status) && isTerminalStatus(snapshot.status)) invalidate = true

          return {
            ...item,
            title: snapshot.title,
            status: snapshot.status,
            outputs: snapshot.outputs,
            error: snapshot.error,
            updatedAt: new Date().toISOString(),
          }
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [timeline, pendingAttachments.length])

  return (
    <AppPage className="!max-w-[1080px] !gap-0 !py-2">
      <section
        className={`flex flex-col ${
          timeline.length ? 'min-h-[calc(100vh-3.5rem)]' : 'min-h-[520px]'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Chat</div>
            <div className="mt-1 truncate text-lg font-semibold text-white">{activeConversation?.title || 'New chat'}</div>
          </div>

          {auth?.guest ? (
            <button
              onClick={() => navigate('/signup')}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Start free
            </button>
          ) : null}
        </div>

        <div className={`min-h-0 overflow-y-auto ${timeline.length ? 'flex-1 py-4' : 'py-4'}`}>
          {conversationDetailQuery.isLoading ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading chat...
            </div>
          ) : timeline.length ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
              {timeline.map((item) => {
                if (item.kind === 'message') {
                  const message = item.message
                  return (
                    <div key={item.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-2xl space-y-2.5">
                        {message.attachments.length ? (
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            {message.attachments.map((attachment) => (
                              <div key={attachment.url} className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-black/20">
                                {attachment.kind === 'image' ? (
                                  <img src={attachment.url} alt={attachment.label} className="aspect-[4/3] w-full object-cover" />
                                ) : (
                                  <div className="p-4 text-sm text-zinc-300">{attachment.label}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div
                          className={`rounded-[22px] px-4 py-3.5 text-sm leading-6 ${
                            message.role === 'user'
                              ? 'rounded-br-md bg-violet-500/12 text-violet-50 ring-1 ring-violet-300/12'
                              : 'bg-black/20 text-zinc-200 ring-1 ring-white/[0.06]'
                          }`}
                        >
                          {message.content}
                        </div>

                        {message.role === 'assistant' && message.id === latestAssistantMessage?.id && suggestedActions.length ? (
                          <div className="flex flex-wrap gap-2">
                            {suggestedActions.slice(0, 4).map((action) => (
                              <button
                                key={action.id}
                                onClick={() => handleSuggestedAction(action.value, action.label)}
                                className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-200 ring-1 ring-white/8 transition hover:bg-white/[0.08]"
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

                const visual = item.visual
                return (
                  <div key={item.id} className="flex justify-start">
                    <div className="max-w-2xl rounded-[24px] bg-black/20 p-3.5 ring-1 ring-white/[0.06]">
                      {visual.status === 'completed' && visual.outputs.length ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{getVisualStatusLabel(visual.status)}</div>
                            <div className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-300">{visual.mode}</div>
                          </div>
                          {visual.outputs.map((output) => (
                            <ProgressiveChatImage key={output.asset_id} src={output.url} alt={visual.title} />
                          ))}
                          <div className="flex items-center gap-4 text-sm">
                            <Link to="/library/images" className="font-medium text-white transition hover:text-zinc-200">
                              Open in My Images
                            </Link>
                            {visual.projectId ? (
                              <Link to={`/projects/${visual.projectId}`} className="text-zinc-400 transition hover:text-white">
                                Open project
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ) : visual.status === 'failed' || visual.status === 'retryable_failed' ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">{getVisualStatusLabel(visual.status)}</div>
                            <div className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-1 text-[10px] text-rose-200">image</div>
                          </div>
                          <div className="text-sm font-medium text-white">{visual.title}</div>
                          <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                            {visual.error || 'Unable to complete image generation from chat.'}
                          </div>
                        </div>
                      ) : (
                        <PendingVisualCard mode={visual.mode} title={visual.title} />
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl border-b border-white/[0.05] pb-6 pt-2">
              <div className="max-w-xl">
                <div className="text-[1.35rem] font-semibold text-white">Start with one message.</div>
                <div className="mt-1.5 text-sm text-zinc-400">Ask for a prompt, an edit pass, or a stronger direction.</div>
              </div>
              <div className="mt-4 flex max-w-2xl flex-wrap gap-2">
                {['Build a stronger prompt', 'Turn this into a visual concept', 'Help me edit an image'].map((hint) => (
                  <button
                    key={hint}
                    onClick={() => setDraft(hint)}
                    className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-200 ring-1 ring-white/8 transition hover:bg-white/[0.08]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.05] py-3">
          <div className="mx-auto w-full max-w-3xl rounded-[20px] bg-[#0f1013]/70 px-3 py-2 ring-1 ring-white/[0.08]">
            {pendingAttachments.length ? (
              <div className="mb-2.5 flex flex-wrap gap-2 border-b border-white/[0.03] pb-2.5">
                {pendingAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 rounded-2xl bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-200 ring-1 ring-white/[0.08]">
                    {attachment.kind === 'image' ? (
                      <img src={attachment.url} alt={attachment.label} className="h-8 w-8 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/20 text-[11px] font-semibold text-zinc-300">FILE</div>
                    )}
                    <span className="max-w-[160px] truncate">{attachment.label}</span>
                    <button
                      onClick={() => setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                      className="text-zinc-500 transition hover:text-white"
                      title="Remove attachment"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-3">
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUploadChange} />

              <button
                onClick={handleUploadClick}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[13px] bg-white/[0.04] text-zinc-300 ring-1 ring-white/8 transition hover:bg-white/[0.08]"
                title="Upload files"
              >
                <Plus className="h-4 w-4" />
              </button>

              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                rows={1}
                placeholder={auth?.guest ? 'Sign in to start chatting...' : 'Message Studio...'}
                className="max-h-32 min-h-[38px] flex-1 resize-none bg-transparent px-1.5 py-1 text-sm leading-6 text-white outline-none placeholder:text-zinc-500"
              />

              <label className="relative shrink-0">
                <select
                  value={composeMode}
                  onChange={(event) => setComposeMode(event.target.value as ComposeMode)}
                  className="appearance-none rounded-[13px] border border-white/[0.08] bg-white/[0.04] py-2 pl-3 pr-8 text-sm text-zinc-200 outline-none transition hover:bg-white/[0.08]"
                >
                  {composeModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </label>

              <button
                onClick={handleSend}
                disabled={(!draft.trim() && !pendingAttachments.length) || !canLoadPrivate || sendMessageMutation.isPending || createConversationMutation.isPending}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-[13px] bg-white text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send"
              >
                {sendMessageMutation.isPending || createConversationMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {sendMessageMutation.error ? (
            <div className="mx-auto mt-3 w-full max-w-3xl rounded-[16px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              {sendMessageMutation.error instanceof Error ? sendMessageMutation.error.message : 'Unable to send message.'}
            </div>
          ) : null}
        </div>
      </section>
    </AppPage>
  )
}
