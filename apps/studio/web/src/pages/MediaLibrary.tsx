import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Folder, Grid2X2, Heart, Image as ImageIcon, List, MoreHorizontal, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { LightboxTrigger } from '@/components/ImageLightbox'
import { useLightbox } from '@/components/Lightbox'
import {
  describePendingGenerationState,
  formatGenerationCreditState,
  formatGenerationEstimateSummary,
  formatGenerationPricingLane,
  normalizeJobStatus,
  studioApi,
  type Generation,
  type MediaAsset,
  type Project,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type LibrarySection = 'images' | 'collections' | 'likes' | 'trash'
type ViewMode = 'grid' | 'list'
type ImageFilter = 'all' | 'processing' | 'recent'
type CollectionFilter = 'all' | 'with-work' | 'empty'
type TrashFilter = 'all' | 'recent'

type ConfirmState =
  | { kind: 'permanent-delete'; asset: MediaAsset }
  | { kind: 'empty-trash'; count: number }
  | { kind: 'delete-project'; projectId: string; title: string }
  | null

type PreviewState = {
  group: AssetGroup
  index: number
} | null

type MoveState = {
  postId: string
  currentProjectId: string
  title: string
} | null

type NoticeState = {
  title: string
  body: string
} | null

type RenameState =
  | { kind: 'post'; id: string; title: string }
  | { kind: 'project'; id: string; title: string; description?: string }
  | null

type AssetGroup = {
  id: string
  title: string
  prompt: string
  model: string
  createdAt: string
  projectId: string
  projectTitle: string
  isChatOrigin: boolean
  items: MediaAsset[]
}

const imageFilters: Array<{ id: ImageFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'recent', label: 'Recent' },
]

const collectionFilters: Array<{ id: CollectionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'with-work', label: 'With work' },
  { id: 'empty', label: 'Empty' },
]

const trashFilters: Array<{ id: TrashFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
]

function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'number' ? value : undefined
}

function variantOrder(asset: MediaAsset) {
  const raw = Number((asset.metadata as Record<string, unknown>).variation_index ?? 0)
  return Number.isFinite(raw) ? raw : 0
}

function isChatProject(project: Project | null | undefined) {
  if (!project) return false
  const normalizedTitle = project.title.trim().toLowerCase()
  const normalizedDescription = project.description.trim().toLowerCase()
  return project.surface === 'chat' || normalizedTitle.startsWith('chat -') || normalizedDescription === 'created from studio chat'
}

function ConfirmDialog({
  state,
  busy,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!state) return null

  const body =
    state.kind === 'empty-trash'
      ? `This will permanently remove ${state.count} item${state.count > 1 ? 's' : ''} from Trash. This cannot be undone.`
      : state.kind === 'delete-project'
        ? `Delete "${state.title}" permanently? Empty collections can be removed and this cannot be undone.`
        : `"${state.asset.title}" will be removed permanently. This cannot be undone.`
  const resolvedTitle = state.kind === 'empty-trash' ? 'Empty trash?' : state.kind === 'delete-project' ? 'Delete collection?' : 'Delete forever?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{resolvedTitle}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Working...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoticeDialog({
  state,
  onClose,
}: {
  state: NoticeState
  onClose: () => void
}) {
  if (!state) return null

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{state.title}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{state.body}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200">
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function RenameDialog({
  state,
  busy,
  onCancel,
  onConfirm,
}: {
  state: RenameState
  busy: boolean
  onCancel: () => void
  onConfirm: (title: string) => void
}) {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(state?.title ?? '')
  }, [state])

  if (!state) return null

  const heading = state.kind === 'post' ? 'Rename image set' : 'Rename collection'

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{heading}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">Give this {state.kind === 'post' ? 'image set' : 'collection'} a cleaner name.</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-[11px] uppercase tracking-[0.2em] text-zinc-600">Title</label>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="input mt-2"
            placeholder={state.kind === 'post' ? 'Image set name' : 'Collection name'}
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(value)}
            disabled={busy || !value.trim() || value.trim() === state.title}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AssetLightbox({
  state,
  isChatOrigin,
  busy,
  onClose,
  onSelect,
  onOpenProject,
  onReusePrompt,
  onReuseStyle,
  onMove,
  onSetVisibility,
  onTrash,
}: {
  state: PreviewState
  isChatOrigin: boolean
  busy: boolean
  onClose: () => void
  onSelect: (index: number) => void
  onOpenProject: () => void
  onReusePrompt: () => void
  onReuseStyle: () => void
  onMove: () => void
  onSetVisibility: (visibility: 'public' | 'private') => void
  onTrash: () => void
}) {
  const { openLightbox } = useLightbox()

  useEffect(() => {
    if (!state) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        onSelect((state.index - 1 + state.group.items.length) % state.group.items.length)
        return
      }
      if (event.key === 'ArrowRight') {
        onSelect((state.index + 1) % state.group.items.length)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onSelect, state])

  if (!state) return null

  const asset = state.group.items[state.index]
  const canStep = state.group.items.length > 1

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(4,6,10,0.82)] px-4 py-6 backdrop-blur-[10px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,196,255,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.52)_48%,rgba(0,0,0,0.78))]" />
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
        title="Close preview"
      >
        <X className="h-4 w-4" />
      </button>

      {canStep ? (
        <>
          <button
            onClick={() => onSelect((state.index - 1 + state.group.items.length) % state.group.items.length)}
            className="absolute left-5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
            title="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSelect((state.index + 1) % state.group.items.length)}
            className="absolute right-5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
            title="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}

      <div className="relative z-[1] grid w-full max-w-[1380px] gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
        <div className="group relative flex min-h-0 items-center justify-center">
          <img
            src={asset.url}
            alt={asset.title}
            className="max-h-[78vh] w-auto max-w-full cursor-zoom-in rounded-[28px] object-contain shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            onClick={() => openLightbox(asset.url, asset.title, {
              title: state.group.title,
              prompt: state.group.prompt,
              authorName: "You",
              authorUsername: "creator",
              aspectRatio: metadataString(asset.metadata, 'aspect_ratio'),
              likes: metadataNumber(asset.metadata, 'like_count') ?? 0,
            })}
          />
          <LightboxTrigger onClick={() => openLightbox(asset.url, asset.title, {
              title: state.group.title,
              prompt: state.group.prompt,
              authorName: "You",
              authorUsername: "creator",
              aspectRatio: metadataString(asset.metadata, 'aspect_ratio'),
              likes: metadataNumber(asset.metadata, 'like_count') ?? 0,
          })} />
        </div>

        <div className="space-y-4 rounded-[28px] bg-black/30 p-5 ring-1 ring-white/8 backdrop-blur-md">
          <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Image preview</div>
          <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{state.group.title}</div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span>{formatDate(asset.created_at)}</span>
            <span>/</span>
            <span>{state.group.model}</span>
            <span>/</span>
            <span>
              Variation {state.index + 1} of {state.group.items.length}
            </span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">{state.group.projectTitle}</div>
          <div className="max-h-[15rem] overflow-auto pr-1 text-sm leading-7 text-zinc-300">{state.group.prompt}</div>
          <div className="grid grid-cols-2 gap-2">
            {!isChatOrigin ? (
              <>
                <button
                  onClick={onReusePrompt}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                  disabled={busy}
                >
                  Reuse prompt
                </button>
                <button
                  onClick={onReuseStyle}
                  className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                >
                  Reuse style
                </button>
              </>
            ) : null}
            <button
              onClick={onMove}
              className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              Move
            </button>
            <button
              onClick={() => onSetVisibility('public')}
              className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              Set public
            </button>
            <button
              onClick={() => onSetVisibility('private')}
              className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              Set private
            </button>
            <button
              onClick={onTrash}
              className="rounded-full bg-rose-500/[0.12] px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
            >
              Move to trash
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isChatOrigin ? (
              <button
                onClick={onOpenProject}
                className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
              >
                Open project
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
            >
              Close
            </button>
          </div>
          {canStep ? (
            <div className="grid grid-cols-5 gap-2 pt-2">
              {state.group.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(index)}
                  className={`overflow-hidden rounded-[16px] ring-1 transition ${
                    state.index === index ? 'ring-white/40' : 'ring-white/6 hover:ring-white/20'
                  }`}
                >
                  <img src={item.thumbnail_url ?? item.url} alt={item.title} className="aspect-square h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function MovePostDialog({
  state,
  projects,
  busy,
  onClose,
  onMove,
}: {
  state: MoveState
  projects: Project[]
  busy: boolean
  onClose: () => void
  onMove: (projectId: string) => void
}) {
  if (!state) return null

  const destinations = projects.filter((project) => project.id !== state.currentProjectId && !isChatProject(project))

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#101115] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">Move image set</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              Choose where <span className="text-white">{state.title}</span> should live.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 max-h-[50vh] overflow-auto divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {destinations.length ? (
            destinations.map((project) => (
              <button
                key={project.id}
                onClick={() => onMove(project.id)}
                disabled={busy}
                className="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{project.title}</div>
                  <div className="mt-1 truncate text-xs text-zinc-500">{project.description || 'Collection'}</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
              </button>
            ))
          ) : (
            <div className="py-4 text-sm text-zinc-500">No other collections available.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function InlineActionMenu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-1.5 w-[min(196px,calc(100vw-2rem))] overflow-hidden rounded-[16px] bg-[#111216]/98 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/8 backdrop-blur-xl">
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-white/[0.06]" />
}

function MenuAction({
  children,
  tone = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-2.5 py-2 text-left text-[13px] transition ${
        tone === 'danger'
          ? 'text-rose-300 hover:bg-rose-500/[0.08] hover:text-rose-200'
          : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
      } ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${value === 'grid' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${value === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function FilterBar<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-2.5 py-1.5 text-[11px] transition ${value === option.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Toolbar({
  title,
  description,
  search,
  onSearchChange,
  view,
  onViewChange,
  filters,
  actions,
}: {
  title: string
  description: string
  search: string
  onSearchChange: (value: string) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  filters?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border-b border-white/[0.06] pb-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-white md:text-[2.1rem]">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
          {filters ? <div className="mt-2">{filters}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <label className="flex min-w-[170px] items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1.5 text-[13px] text-zinc-400 ring-1 ring-white/8">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
            />
          </label>
          <ViewToggle value={view} onChange={onViewChange} />
          {actions}
        </div>
      </div>
    </section>
  )
}

function EmptyInline({
  icon,
  title,
  description,
  compact = false,
}: {
  icon: ReactNode
  title: string
  description: string
  compact?: boolean
}) {
  return (
    <section
      className={`flex flex-col gap-3 py-6 ${
        compact ? 'min-h-[12vh] items-start justify-start text-left' : 'min-h-[22vh] items-center justify-center text-center'
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#111216]/60 text-zinc-300 ring-1 ring-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-md">{icon}</div>
      <div className="text-base font-semibold text-white">{title}</div>
      <div className={`text-sm leading-6 text-zinc-500 ${compact ? 'max-w-[34rem]' : 'max-w-lg'}`}>{description}</div>
    </section>
  )
}

function PendingPreview({ generation, view }: { generation: Generation; view: ViewMode }) {
  const detail = describePendingGenerationState(generation.status, generation.pricing_lane, generation.provider)
  const lane = formatGenerationPricingLane(generation.pricing_lane)
  const creditState = formatGenerationCreditState(generation)
  const estimateSummary = formatGenerationEstimateSummary(generation.estimated_cost, generation.estimated_cost_source)

  if (view === 'grid') {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[22px] bg-white/[0.03]">
          <div className="aspect-[4/5] w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.6))]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{generation.title}</div>
          <div className="mt-1 text-xs text-zinc-500">{detail}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill tone="neutral">{lane}</StatusPill>
            <StatusPill tone="neutral">{creditState}</StatusPill>
          </div>
          <div className="mt-2 text-xs text-zinc-500">{estimateSummary}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{generation.title}</div>
        <div className="mt-1 text-xs text-zinc-500">{detail}</div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusPill tone="neutral">{lane}</StatusPill>
          <StatusPill tone="neutral">{creditState}</StatusPill>
        </div>
        <div className="mt-2 text-xs text-zinc-500">{estimateSummary}</div>
      </div>
    </div>
  )
}

export default function MediaLibraryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const [search, setSearch] = useState('')
  const [views, setViews] = useState<Record<LibrarySection, ViewMode>>({
    images: 'grid',
    collections: 'grid',
    likes: 'grid',
    trash: 'grid',
  })
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all')
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all')
  const [trashFilter, setTrashFilter] = useState<TrashFilter>('all')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>(null)
  const [moveState, setMoveState] = useState<MoveState>(null)
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [renameState, setRenameState] = useState<RenameState>(null)

  const section = useMemo<LibrarySection>(() => {
    if (location.pathname.startsWith('/library/collections')) return 'collections'
    if (location.pathname.startsWith('/library/likes')) return 'likes'
    if (location.pathname.startsWith('/library/trash')) return 'trash'
    return 'images'
  }, [location.pathname])

  const assetsQuery = useQuery({
    queryKey: ['assets', 'library', 'all'],
    queryFn: () => studioApi.listAssets(undefined, true),
    enabled: canLoadPrivate,
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', 'library'],
    queryFn: () => studioApi.listProjects(),
    enabled: canLoadPrivate,
  })

  const generationsQuery = useQuery({
    queryKey: ['generations', 'library', 'all'],
    queryFn: () => studioApi.listGenerations(),
    enabled: canLoadPrivate,
    refetchInterval: 2000,
  })

  async function invalidateLibrary() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['generations'] }),
      queryClient.invalidateQueries({ queryKey: ['public-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ])
  }

  const restoreAssetMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.restoreAsset(assetId),
    onSuccess: invalidateLibrary,
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.permanentlyDeleteAsset(assetId),
    onSuccess: async () => {
      setConfirmState(null)
      await invalidateLibrary()
    },
  })

  const emptyTrashMutation = useMutation({
    mutationFn: () => studioApi.emptyTrash(),
    onSuccess: async () => {
      setConfirmState(null)
      await invalidateLibrary()
    },
  })

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: { title?: string; visibility?: 'public' | 'private' } }) =>
      studioApi.updatePost(postId, payload),
    onSuccess: async () => {
      setRenameState(null)
      await invalidateLibrary()
    },
  })

  const movePostMutation = useMutation({
    mutationFn: ({ postId, projectId }: { postId: string; projectId: string }) => studioApi.movePost(postId, { project_id: projectId }),
    onSuccess: invalidateLibrary,
  })

  const trashPostMutation = useMutation({
    mutationFn: (postId: string) => studioApi.trashPost(postId),
    onSuccess: invalidateLibrary,
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, title, description }: { projectId: string; title: string; description?: string }) =>
      studioApi.updateProject(projectId, { title, description }),
    onSuccess: async () => {
      setRenameState(null)
      await invalidateLibrary()
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => studioApi.deleteProject(projectId),
    onSuccess: async () => {
      setConfirmState(null)
      await invalidateLibrary()
    },
  })

  const menuBusy =
    permanentDeleteMutation.isPending ||
    emptyTrashMutation.isPending ||
    updatePostMutation.isPending ||
    movePostMutation.isPending ||
    trashPostMutation.isPending ||
    updateProjectMutation.isPending ||
    deleteProjectMutation.isPending

  const assets = assetsQuery.data?.assets ?? []
  const projects = projectsQuery.data?.projects ?? []
  const generations = generationsQuery.data?.generations ?? []
  const activeAssets = assets.filter((asset) => !asset.deleted_at)
  const trashedAssets = assets.filter((asset) => Boolean(asset.deleted_at))
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const assetsByProject = useMemo(() => {
    const next = new Map<string, MediaAsset[]>()
    for (const asset of activeAssets) {
      const existing = next.get(asset.project_id) ?? []
      existing.push(asset)
      next.set(asset.project_id, existing)
    }
    return next
  }, [activeAssets])

  const groupedAssets = useMemo<AssetGroup[]>(() => {
    const groups = new Map<string, AssetGroup>()

    for (const asset of [...activeAssets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())) {
      const metadata = asset.metadata as Record<string, unknown>
      const groupId = String(metadata.generation_id ?? asset.id)
      const project = projectMap.get(asset.project_id)
      const isChatOrigin = isChatProject(project)
      if (isChatOrigin && metadataString(metadata, 'source') === 'upload' && !asset.prompt.trim()) {
        continue
      }
      const existing = groups.get(groupId)

      if (existing) {
        existing.items.push(asset)
        continue
      }

      groups.set(groupId, {
        id: groupId,
        title: String(metadata.generation_title ?? asset.title ?? 'Untitled set'),
        prompt: asset.prompt || 'Saved Studio result',
        model: String(metadata.model ?? 'Image'),
        createdAt: asset.created_at,
        projectId: asset.project_id,
        projectTitle: isChatOrigin ? 'Chat session' : project?.title ?? 'Project',
        isChatOrigin,
        items: [asset],
      })
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => variantOrder(a) - variantOrder(b)),
    }))
  }, [activeAssets, projectMap])

  const pendingGenerations = useMemo(
    () =>
      generations
        .filter((generation) => {
          const normalized = normalizeJobStatus(generation.status)
          return normalized === 'queued' || normalized === 'running'
        })
        .filter((generation) => matchesQuery(search, generation.title, generation.prompt_snapshot.prompt, generation.model)),
    [generations, search],
  )

  const composeProjects = useMemo(
    () => projects.filter((project) => !isChatProject(project)),
    [projects],
  )

  const filteredImageGroups = useMemo(
    () =>
      groupedAssets.filter((group) => {
        if (!matchesQuery(search, group.title, group.prompt, group.model, group.projectTitle)) return false
        if (imageFilter === 'recent') return Date.now() - new Date(group.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 3
        if (imageFilter === 'processing') return false
        return true
      }),
    [groupedAssets, imageFilter, search],
  )

  const filteredProjects = useMemo(
    () =>
      composeProjects.filter((project) => {
        const projectAssets = assetsByProject.get(project.id) ?? []
        if (!matchesQuery(search, project.title, project.description)) return false
        if (collectionFilter === 'with-work') return projectAssets.length > 0
        if (collectionFilter === 'empty') return projectAssets.length === 0
        return true
      }),
    [assetsByProject, collectionFilter, composeProjects, search],
  )

  const filteredTrash = useMemo(
    () =>
      trashedAssets.filter((asset) => {
        if (!matchesQuery(search, asset.title, asset.prompt)) return false
        if (trashFilter === 'recent' && asset.deleted_at) {
          return Date.now() - new Date(asset.deleted_at).getTime() <= 1000 * 60 * 60 * 24 * 3
        }
        return true
      }),
    [search, trashFilter, trashedAssets],
  )

  const activeView = views[section]
  const isBusy = permanentDeleteMutation.isPending || emptyTrashMutation.isPending

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-library-menu-root="true"]')) return
      setActionMenu(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const openComposeWith = (params: Record<string, string>) => {
    const next = new URLSearchParams(params)
    navigate(`/create?${next.toString()}`)
  }

  const handleMenuError = (error: unknown) => {
    setNoticeState({
      title: 'Action unavailable',
      body: error instanceof Error ? error.message : 'That action could not be completed.',
    })
  }

  const openPreview = (group: AssetGroup, index: number) => {
    setActionMenu(null)
    setPreviewState({ group, index })
  }

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading library...</div>
  }

  if (!canLoadPrivate) {
    return (
      <AppPage className="max-w-[1180px] py-8">
        <EmptyInline
          icon={<ImageIcon className="h-4 w-4" />}
          title="Your Library unlocks after sign in."
          description="Saved images, collections, favorites, and trash only appear once you are inside Studio."
        />
      </AppPage>
    )
  }

  return (
    <>
      <AppPage className="max-w-[1420px] gap-4 py-3.5">
        {section === 'images' ? (
          <>
            <Toolbar
              title="My Images"
              description="Your generated images live here. Running generations will preview until they complete."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, images: view }))}
              filters={<FilterBar options={imageFilters} value={imageFilter} onChange={setImageFilter} />}
            />

            {pendingGenerations.length ? (
              <section className="border-b border-white/[0.06] pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium text-white">In progress</div>
                  <StatusPill tone="brand">{pendingGenerations.length} running</StatusPill>
                </div>
                <div className={activeView === 'grid' ? 'mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' : 'mt-3.5 divide-y divide-white/[0.06]'}>
                  {pendingGenerations.map((generation) => (
                    <PendingPreview key={generation.job_id} generation={generation} view={activeView} />
                  ))}
                </div>
              </section>
            ) : null}

            {imageFilter === 'processing' ? (
              pendingGenerations.length ? null : (
                <EmptyInline
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Nothing is rendering right now."
                  description="Start a new generation from Create and it will preview here until it lands in Library."
                />
              )
            ) : filteredImageGroups.length ? (
              <section className="space-y-4">
                {filteredImageGroups.map((group) => (
                  <section key={group.id} className="group border-b border-white/[0.06] pb-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-white">{group.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                          <span>{formatDate(group.createdAt)}</span>
                          <span>/</span>
                          <span>{group.model}</span>
                          <span>/</span>
                          <span>{group.items.length} variation{group.items.length > 1 ? 's' : ''}</span>
                        </div>
                        <div
                          className="mt-1 max-w-2xl text-[13px] leading-5 text-zinc-500"
                          style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        >
                          {group.prompt}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                          <button
                            onClick={() => openPreview(group, 0)}
                            className="rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.1]"
                          >
                            Open
                          </button>
                          {!group.isChatOrigin ? (
                            <button
                              onClick={() => openComposeWith({ prompt: group.prompt, model: group.model, projectId: group.projectId })}
                              className="rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.1]"
                            >
                              Reuse prompt
                            </button>
                          ) : null}
                          <button
                            onClick={() => setMoveState({ postId: group.id, currentProjectId: group.projectId, title: group.title })}
                            className="rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.1]"
                          >
                            Move
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await updatePostMutation.mutateAsync({ postId: group.id, payload: { visibility: 'public' } })
                              } catch (error) {
                                handleMenuError(error)
                              }
                            }}
                            className="rounded-full bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.1]"
                          >
                            Public
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await trashPostMutation.mutateAsync(group.id)
                              } catch (error) {
                                handleMenuError(error)
                              }
                            }}
                            className="rounded-full bg-rose-500/[0.1] px-2.5 py-1.5 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/[0.16]"
                          >
                            Trash
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        {group.isChatOrigin ? (
                          <div className="pt-0.5 text-[13px] text-zinc-400">{group.projectTitle}</div>
                        ) : (
                          <Link to={`/projects/${group.projectId}`} className="pt-0.5 text-[13px] text-white transition hover:text-zinc-200">
                            {group.projectTitle}
                          </Link>
                        )}
                        <div className="relative" data-library-menu-root="true">
                          <button
                            onClick={() => setActionMenu((current) => (current === `post:${group.id}` ? null : `post:${group.id}`))}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                            title="Image set actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `post:${group.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={() => {
                                  setRenameState({ kind: 'post', id: group.id, title: group.title })
                                  setActionMenu(null)
                                }}
                              >
                                Rename
                              </MenuAction>
                              {!group.isChatOrigin ? (
                                <>
                                  <MenuAction
                                    onClick={() => {
                                      openComposeWith({ prompt: group.prompt, model: group.model, projectId: group.projectId })
                                      setActionMenu(null)
                                    }}
                                  >
                                    Reuse prompt
                                  </MenuAction>
                                  <MenuAction
                                    onClick={() => {
                                      openComposeWith({ model: group.model, projectId: group.projectId })
                                      setActionMenu(null)
                                    }}
                                  >
                                    Reuse style
                                  </MenuAction>
                                  <MenuAction
                                    onClick={() => {
                                      openComposeWith({ prompt: group.prompt, model: group.model, projectId: group.projectId, tool: 'regenerate' })
                                      setActionMenu(null)
                                    }}
                                  >
                                    Regenerate
                                  </MenuAction>
                                  <MenuAction
                                    onClick={() => {
                                      openComposeWith({ prompt: `Refine: ${group.prompt.slice(0, 200)}`, model: group.model, projectId: group.projectId, tool: 'edit' })
                                      setActionMenu(null)
                                    }}
                                  >
                                    Edit (img2img)
                                  </MenuAction>
                                  <MenuDivider />
                                </>
                              ) : null}
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await updatePostMutation.mutateAsync({ postId: group.id, payload: { visibility: 'public' } })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Set public
                              </MenuAction>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await updatePostMutation.mutateAsync({ postId: group.id, payload: { visibility: 'private' } })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Set private
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  setMoveState({ postId: group.id, currentProjectId: group.projectId, title: group.title })
                                  setActionMenu(null)
                                }}
                              >
                                Move to collection
                              </MenuAction>
                              <MenuDivider />
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await trashPostMutation.mutateAsync(group.id)
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Move to trash
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {activeView === 'grid' ? (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {group.items.map((asset) => (
                          <div key={asset.id} className="space-y-1.5">
                            <button
                              onClick={() => openPreview(group, group.items.findIndex((item) => item.id === asset.id))}
                              className="block w-full overflow-hidden rounded-[20px] bg-white/[0.03] text-left"
                            >
                              <img
                                src={asset.thumbnail_url ?? asset.url}
                                alt={asset.title}
                                className="aspect-[4/5] w-full object-cover transition duration-300 hover:scale-[1.02]"
                              />
                            </button>
                            <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                              <span>V{variantOrder(asset) + 1}</span>
                              <span className="truncate">{asset.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 divide-y divide-white/[0.06]">
                        {group.items.map((asset) => (
                          <div key={asset.id} className="flex items-center gap-4 py-3">
                            <button
                              onClick={() => openPreview(group, group.items.findIndex((item) => item.id === asset.id))}
                              className="block h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03] text-left"
                            >
                              <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-full w-full object-cover" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                              <div className="mt-1 text-xs text-zinc-500">Variation {variantOrder(asset) + 1}</div>
                            </div>
                            <Link to={`/projects/${asset.project_id}`} className="text-sm text-white transition hover:text-zinc-200">
                              Open
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </section>
            ) : (
              <EmptyInline icon={<ImageIcon className="h-4 w-4" />} title="No images yet." description="Generate something in Create and it will land here automatically." />
            )}
          </>
        ) : null}

        {section === 'collections' ? (
          <>
            <Toolbar
              title="Collections"
              description="Projects keep related images together so you can revisit them anytime."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, collections: view }))}
              filters={<FilterBar options={collectionFilters} value={collectionFilter} onChange={setCollectionFilter} />}
            />

            {filteredProjects.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0]
                    return (
                      <div key={project.id} className="space-y-2.5">
                        <div className="relative" data-library-menu-root="true">
                          <Link to={`/projects/${project.id}`} className="block overflow-hidden rounded-[20px] bg-white/[0.03]">
                            {cover ? (
                              <img src={cover.thumbnail_url ?? cover.url} alt={project.title} className="aspect-[16/10] w-full object-cover transition duration-300 hover:scale-[1.02]" />
                            ) : (
                              <div className="flex aspect-[16/10] items-center justify-center bg-white/[0.02] text-zinc-600">
                                <Folder className="h-5 w-5" />
                              </div>
                            )}
                          </Link>
                          <button
                            onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur transition hover:bg-black/50 hover:text-white"
                            title="Collection actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `project:${project.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={() => {
                                  setRenameState({ kind: 'project', id: project.id, title: project.title, description: project.description })
                                  setActionMenu(null)
                                }}
                              >
                                Rename
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openComposeWith({ projectId: project.id })
                                  setActionMenu(null)
                                }}
                              >
                                Open in Create
                              </MenuAction>
                              <MenuDivider />
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={() => {
                                  setActionMenu(null)
                                  if (projectAssets.length > 0) {
                                    setNoticeState({
                                      title: 'Collection has images',
                                      body: 'Move or remove items before deleting this collection.',
                                    })
                                    return
                                  }
                                  setConfirmState({ kind: 'delete-project', projectId: project.id, title: project.title })
                                }}
                              >
                                Delete
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{project.title}</div>
                          <div className="mt-1 text-[11px] text-zinc-500">
                            {projectAssets.length} image{projectAssets.length !== 1 ? 's' : ''} / {formatDate(project.updated_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              ) : (
                <section className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    return (
                      <div key={project.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{project.title}</div>
                          <div className="mt-1 text-xs text-zinc-500">{project.description || 'No description yet.'}</div>
                        </Link>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-zinc-500">
                            {projectAssets.length} image{projectAssets.length !== 1 ? 's' : ''} / {formatDate(project.updated_at)}
                          </div>
                          <div className="relative" data-library-menu-root="true">
                            <button
                              onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenu === `project:${project.id}` ? (
                              <InlineActionMenu>
                                <MenuAction
                                  disabled={menuBusy}
                                  onClick={() => {
                                    setRenameState({ kind: 'project', id: project.id, title: project.title, description: project.description })
                                    setActionMenu(null)
                                  }}
                                >
                                  Rename
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    openComposeWith({ projectId: project.id })
                                    setActionMenu(null)
                                  }}
                                >
                                  Open in Create
                                </MenuAction>
                                <MenuDivider />
                                <MenuAction
                                  tone="danger"
                                  disabled={menuBusy}
                                  onClick={() => {
                                    setActionMenu(null)
                                    if (projectAssets.length > 0) {
                                      setNoticeState({
                                        title: 'Collection has images',
                                        body: 'Move or remove items before deleting this collection.',
                                      })
                                      return
                                    }
                                    setConfirmState({ kind: 'delete-project', projectId: project.id, title: project.title })
                                  }}
                                >
                                  Delete
                                </MenuAction>
                              </InlineActionMenu>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            ) : (
              <EmptyInline compact icon={<Folder className="h-4 w-4" />} title="No collections yet." description="Collections appear as your projects start holding real work." />
            )}
          </>
        ) : null}

        {section === 'likes' ? (
          <>
            <Toolbar
              title="Favorites"
              description="Pinned and saved visuals can live here later. For now this surface stays intentionally clean."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, likes: view }))}
            />
            <EmptyInline
              compact
              icon={<Heart className="h-4 w-4" />}
              title="No favorites yet."
              description="When you start saving references or favorite generations, they will show up here."
            />
          </>
        ) : null}

        {section === 'trash' ? (
          <>
            <Toolbar
              title="Trash"
              description="Deleted images stay here until you restore them or remove them forever."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, trash: view }))}
              filters={<FilterBar options={trashFilters} value={trashFilter} onChange={setTrashFilter} />}
              actions={
                filteredTrash.length ? (
                  <button
                    onClick={() => setConfirmState({ kind: 'empty-trash', count: filteredTrash.length })}
                    className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Empty trash
                  </button>
                ) : null
              }
            />

            {filteredTrash.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredTrash.map((asset) => (
                    <div key={asset.id} className="space-y-2.5">
                      <div className="relative overflow-hidden rounded-[20px] bg-white/[0.03]" data-library-menu-root="true">
                        <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/5] w-full object-cover opacity-75" />
                        <button
                          onClick={() => setActionMenu((current) => (current === `trash:${asset.id}` ? null : `trash:${asset.id}`))}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur transition hover:bg-black/50 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === `trash:${asset.id}` ? (
                          <InlineActionMenu>
                            <MenuAction
                              disabled={menuBusy}
                              onClick={() => {
                                restoreAssetMutation.mutate(asset.id)
                                setActionMenu(null)
                              }}
                            >
                              Restore
                            </MenuAction>
                            <MenuAction
                              tone="danger"
                              onClick={() => {
                                setConfirmState({ kind: 'permanent-delete', asset })
                                setActionMenu(null)
                              }}
                            >
                              Delete forever
                            </MenuAction>
                          </InlineActionMenu>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                        <div className="text-xs text-zinc-500">Deleted {asset.deleted_at ? formatDate(asset.deleted_at) : 'recently'}</div>
                      </div>
                    </div>
                  ))}
                </section>
              ) : (
                <section className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {filteredTrash.map((asset) => (
                    <div key={asset.id} className="flex flex-wrap items-center gap-4 py-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
                        <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-full w-full object-cover opacity-80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">Deleted {asset.deleted_at ? formatDate(asset.deleted_at) : 'recently'}</div>
                      </div>
                      <div className="relative" data-library-menu-root="true">
                        <button
                          onClick={() => setActionMenu((current) => (current === `trash:${asset.id}` ? null : `trash:${asset.id}`))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === `trash:${asset.id}` ? (
                          <InlineActionMenu>
                            <MenuAction
                              disabled={menuBusy}
                              onClick={() => {
                                restoreAssetMutation.mutate(asset.id)
                                setActionMenu(null)
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </span>
                            </MenuAction>
                            <MenuAction
                              tone="danger"
                              onClick={() => {
                                setConfirmState({ kind: 'permanent-delete', asset })
                                setActionMenu(null)
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete forever
                              </span>
                            </MenuAction>
                          </InlineActionMenu>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </section>
              )
            ) : (
              <EmptyInline compact icon={<Trash2 className="h-4 w-4" />} title="Trash is empty." description="Restore or permanently delete work here when you need to clean up." />
            )}
          </>
        ) : null}
      </AppPage>

      <ConfirmDialog
        state={confirmState}
        busy={isBusy || deleteProjectMutation.isPending}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return
          if (confirmState.kind === 'permanent-delete') {
            permanentDeleteMutation.mutate(confirmState.asset.id)
            return
          }
          if (confirmState.kind === 'delete-project') {
            deleteProjectMutation.mutate(confirmState.projectId)
            return
          }
          emptyTrashMutation.mutate()
        }}
      />
      <NoticeDialog state={noticeState} onClose={() => setNoticeState(null)} />
      <RenameDialog
        state={renameState}
        busy={updatePostMutation.isPending || updateProjectMutation.isPending}
        onCancel={() => setRenameState(null)}
        onConfirm={async (title) => {
          if (!renameState) return
          const nextTitle = title.trim()
          if (!nextTitle || nextTitle === renameState.title) {
            setRenameState(null)
            return
          }
          try {
            if (renameState.kind === 'post') {
              await updatePostMutation.mutateAsync({ postId: renameState.id, payload: { title: nextTitle } })
              return
            }
            await updateProjectMutation.mutateAsync({
              projectId: renameState.id,
              title: nextTitle,
              description: renameState.description,
            })
          } catch (error) {
            handleMenuError(error)
          }
        }}
      />
      <AssetLightbox
        state={previewState}
        isChatOrigin={previewState?.group.isChatOrigin ?? false}
        busy={menuBusy || movePostMutation.isPending}
        onClose={() => setPreviewState(null)}
        onSelect={(index) => setPreviewState((current) => (current ? { ...current, index } : current))}
        onOpenProject={() => {
          if (!previewState) return
          navigate(`/projects/${previewState.group.projectId}`)
          setPreviewState(null)
        }}
        onReusePrompt={() => {
          if (!previewState) return
          openComposeWith({
            prompt: previewState.group.prompt,
            model: previewState.group.model,
            projectId: previewState.group.projectId,
          })
          setPreviewState(null)
        }}
        onReuseStyle={() => {
          if (!previewState) return
          openComposeWith({
            model: previewState.group.model,
            projectId: previewState.group.projectId,
          })
          setPreviewState(null)
        }}
        onMove={() => {
          if (!previewState) return
          setMoveState({
            postId: previewState.group.id,
            currentProjectId: previewState.group.projectId,
            title: previewState.group.title,
          })
          setPreviewState(null)
        }}
        onSetVisibility={async (visibility) => {
          if (!previewState) return
          try {
            await updatePostMutation.mutateAsync({ postId: previewState.group.id, payload: { visibility } })
          } catch (error) {
            handleMenuError(error)
          }
        }}
        onTrash={async () => {
          if (!previewState) return
          try {
            await trashPostMutation.mutateAsync(previewState.group.id)
            setPreviewState(null)
          } catch (error) {
            handleMenuError(error)
          }
        }}
      />
      <MovePostDialog
        state={moveState}
        projects={composeProjects}
        busy={movePostMutation.isPending}
        onClose={() => setMoveState(null)}
        onMove={async (projectId) => {
          if (!moveState) return
          try {
            await movePostMutation.mutateAsync({ postId: moveState.postId, projectId })
            setMoveState(null)
          } catch (error) {
            handleMenuError(error)
          }
        }}
      />
    </>
  )
}
