import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Folder, Grid2X2, Heart, Image as ImageIcon, ImageOff, List, Lock, MoreHorizontal, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react'

import { ProtectedAssetImage } from '@/components/ProtectedAssetImage'
import { AppPage, SkeletonImageGrid, StatusPill } from '@/components/StudioPrimitives'
import { usePageMeta } from '@/lib/usePageMeta'
import { LightboxTrigger } from '@/components/ImageLightbox'
import { useLightbox } from '@/components/Lightbox'
import {
  getCreativeProfileLabel,
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
  modelLabel: string
  derivedTags: string[]
  createdAt: string
  projectId: string
  projectTitle: string
  isChatOrigin: boolean
  libraryState: 'generating' | 'ready' | 'failed' | 'blocked'
  items: MediaAsset[]
}

type LibraryState = 'generating' | 'ready' | 'failed' | 'blocked'

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

function assetLibraryState(asset: MediaAsset): LibraryState {
  return asset.library_state ?? (asset.protection_state === 'blocked' ? 'blocked' : 'ready')
}

function generationLibraryState(generation: Generation): LibraryState {
  if (generation.library_state) return generation.library_state
  const normalized = normalizeJobStatus(generation.status)
  if (normalized === 'queued' || normalized === 'running') return 'generating'
  if ((generation.error ?? '').toLowerCase().includes('policy')) return 'blocked'
  return 'failed'
}

function assetDisplayTitle(asset: MediaAsset) {
  return asset.display_title?.trim() || asset.title
}

function assetPreviewUrl(asset: MediaAsset) {
  return assetPreviewSources(asset)[0] ?? null
}

function assetPreviewSources(asset: MediaAsset) {
  if (assetLibraryState(asset) === 'blocked') {
    return [asset.blocked_preview_url, asset.preview_url, asset.thumbnail_url, asset.url]
  }
  return [asset.preview_url, asset.thumbnail_url, asset.url]
}

function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
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
        ? `Delete "${state.title}" permanently? Empty projects can be removed and this cannot be undone.`
        : `"${state.asset.title}" will be removed permanently. This cannot be undone.`
  const resolvedTitle = state.kind === 'empty-trash' ? 'Empty trash?' : state.kind === 'delete-project' ? 'Delete project?' : 'Delete forever?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl" style={{ boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)' }}>
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
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl" style={{ boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)' }}>
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

  const heading = state.kind === 'post' ? 'Rename image set' : 'Rename project'

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl" style={{ boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{heading}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">Give this {state.kind === 'post' ? 'image set' : 'project'} a cleaner name.</p>
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
            id="studio-library-rename-title"
            name="title"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="input mt-2"
            placeholder={state.kind === 'post' ? 'Image set name' : 'Project name'}
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
  const previewSrc = assetPreviewUrl(asset) ?? ''
  const canOpenPreview = Boolean(previewSrc) && asset.can_open !== false && state.group.libraryState !== 'blocked'

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
          <ProtectedAssetImage
            sources={assetPreviewSources(asset)}
            alt={assetDisplayTitle(asset)}
            className="max-h-[78vh] w-auto max-w-full cursor-zoom-in rounded-[28px] object-contain shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            fallbackClassName="flex max-h-[78vh] min-h-[22rem] w-full max-w-full items-center justify-center rounded-[28px] bg-white/[0.04] text-zinc-600 shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            onClick={() => {
              if (!canOpenPreview) return
              openLightbox(previewSrc, assetDisplayTitle(asset), {
                title: state.group.title,
                prompt: state.group.prompt,
                authorName: 'You',
                authorUsername: 'creator',
                aspectRatio: metadataString(asset.metadata, 'aspect_ratio'),
                likes: metadataNumber(asset.metadata, 'like_count') ?? 0,
              })
            }}
          />
          {canOpenPreview ? (
            <LightboxTrigger onClick={() => openLightbox(previewSrc, assetDisplayTitle(asset), {
                title: state.group.title,
                prompt: state.group.prompt,
                authorName: 'You',
                authorUsername: 'creator',
                aspectRatio: metadataString(asset.metadata, 'aspect_ratio'),
                likes: metadataNumber(asset.metadata, 'like_count') ?? 0,
            })} />
          ) : null}
        </div>

        <div className="space-y-6 rounded-[32px] bg-[#0c0d12]/60 p-6 ring-1 ring-white/10 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)]" style={{ boxShadow: 'var(--border-glow), 0 40px 100px rgba(0,0,0,0.8)' }}>
          <div>
            <div className="text-xl font-semibold tracking-[-0.03em] text-white">{state.group.title}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
              <span>{formatDate(asset.created_at)}</span>
              {state.group.items.length > 1 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span>Variation {state.index + 1} of {state.group.items.length}</span>
                </>
              )}
            </div>
          </div>
          <div className="max-h-[10rem] overflow-auto pr-1 text-[13px] leading-6 text-zinc-400">{state.group.prompt}</div>

          {/* Primary actions */}
          <div className="space-y-2.5">
            {!isChatOrigin ? (
              <button
                onClick={onReusePrompt}
                className="w-full rounded-xl bg-white px-4 py-3 text-[14px] font-bold text-black transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                disabled={busy}
              >
                Reuse prompt
              </button>
            ) : null}
            <div className="flex gap-2.5">
              {!isChatOrigin ? (
                <button
                  onClick={onReuseStyle}
                  className="flex-1 rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95 disabled:opacity-50"
                  disabled={busy}
                >
                  Reuse style
                </button>
              ) : null}
              <button
                onClick={onMove}
                className="flex-1 rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95 disabled:opacity-50"
                disabled={busy}
              >
                Move
              </button>
              {!isChatOrigin ? (
                <button
                  onClick={onOpenProject}
                  className="flex-1 rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95"
                >
                  Project
                </button>
              ) : null}
            </div>
          </div>

          {/* Visibility & danger */}
          <div className="flex items-center gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => onSetVisibility(asset.visibility === 'public' ? 'private' : 'public')}
              className="rounded-full bg-white/5 px-4 py-2 text-[11px] font-bold text-zinc-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
              disabled={busy}
            >
              {asset.visibility === 'public' ? 'Make private' : 'Make public'}
            </button>
            <div className="flex-1" />
            <button
              onClick={onTrash}
              className="rounded-full px-4 py-2 text-[11px] font-bold text-rose-400/80 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-300 active:scale-95 disabled:opacity-50"
              disabled={busy}
            >
              Delete
            </button>
          </div>

          {canStep ? (
            <div className="grid grid-cols-5 gap-2 border-t border-white/10 pt-5">
              {state.group.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(index)}
                  className={`overflow-hidden rounded-[14px] ring-2 transition-all duration-500 scale-100 active:scale-90 ${state.index === index ? 'ring-[rgb(var(--primary-light))] shadow-[0_0_15px_rgba(var(--primary-light),0.4)]' : 'ring-white/5 hover:ring-white/20'}`}
                >
                  <ProtectedAssetImage
                    sources={assetPreviewSources(item)}
                    alt={assetDisplayTitle(item)}
                    className={`aspect-square h-full w-full object-cover transition-opacity duration-300 ${state.index === index ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                  />
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
      <div className="w-full max-w-lg rounded-[24px] bg-[#101115] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]" style={{ boxShadow: 'var(--border-glow), 0 24px 90px rgba(0,0,0,0.5)' }}>
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
                  <div className="mt-1 truncate text-xs text-zinc-500">{project.description || 'Project'}</div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
              </button>
            ))
          ) : (
            <div className="py-4 text-sm text-zinc-500">No other projects available.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function InlineActionMenu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-1.5 w-[min(196px,calc(100vw-2rem))] overflow-hidden rounded-[16px] bg-[#111216]/98 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/8 backdrop-blur-xl" style={{ boxShadow: 'var(--border-glow), 0 24px 80px rgba(0,0,0,0.48)' }}>
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
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/10 shadow-inner">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${value === 'grid' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${value === 'list' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        title="List view"
      >
        <List className="h-4 w-4" />
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
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold tracking-wide transition-all duration-300 active:scale-95 ${value === option.id ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
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
  const searchRef = useState<HTMLInputElement | null>(null)
  const setInputRef = searchRef[1]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/') return
      const tag = (event.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      event.preventDefault()
      searchRef[0]?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [searchRef])

  return (
    <section className="border-b border-white/[0.06] pb-5 pt-2">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-black tracking-[-0.05em] text-white font-display md:text-[2.4rem] drop-shadow-sm">{title}</h1>
          <p className="mt-1 text-[13px] font-medium text-zinc-500">{description}</p>
          {filters ? <div className="mt-4">{filters}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="group/search relative flex min-w-[220px] items-center gap-2.5 rounded-full bg-white/[0.03] px-4 py-2 text-[13px] text-zinc-400 ring-1 ring-white/10 transition-all duration-300 focus-within:ring-[rgb(var(--primary-light))/0.5] focus-within:bg-black/40 focus-within:shadow-[0_0_20px_rgba(var(--primary-light),0.15)]">
            <Search className="h-4 w-4 transition-colors group-focus-within/search:text-[rgb(var(--primary-light))]" />
            <input
              id="studio-library-search"
              name="search"
              ref={(el) => setInputRef(el)}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search assets..."
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-600"
            />
            <div className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-bold text-zinc-500 group-focus-within/search:opacity-0 transition-opacity">
              /
            </div>
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
      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#111216]/60 text-zinc-300 ring-1 ring-white/[0.08] shadow-[0_0_20px_rgba(124,58,237,0.15)] backdrop-blur-md">{icon}</div>
      <div className="text-base font-semibold text-white">{title}</div>
      <div className={`text-sm leading-6 text-zinc-500 ${compact ? 'max-w-[34rem]' : 'max-w-lg'}`}>{description}</div>
    </section>
  )
}

function PendingPreview({
  generation,
  view,
  state,
}: {
  generation: Generation
  view: ViewMode
  state: LibraryState
}) {
  const navigate = useNavigate()
  const isBlocked = state === 'blocked'
  const isFailed = state === 'failed'
  const title = generation.display_title || generation.title
  const subtitle = isBlocked ? 'Blocked for safety review' : isFailed ? 'Could not create image' : 'Painting your vision...'
  const badge = isBlocked ? 'Blocked' : isFailed ? 'Failed' : 'Running'

  const handleRetry = () => {
    const params = new URLSearchParams()
    if (generation.prompt_snapshot?.prompt) params.set('prompt', generation.prompt_snapshot.prompt)
    if (generation.model) params.set('model', generation.model)
    navigate(`/create?${params.toString()}`)
  }

  if (view === 'grid') {
    return (
      <div className="space-y-3">
        <div className="relative group/pending overflow-hidden rounded-[22px] bg-[#0c0d12] ring-1 ring-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-500 hover:ring-white/20">
          {isBlocked || isFailed ? (
            <>
              <div className={`aspect-square w-full ${isBlocked ? 'bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.15),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.18),transparent_70%)]'} opacity-50 animate-digitize`} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0c0d12]/60 backdrop-blur-xl">
                 <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-transform duration-500 group-hover/pending:scale-110 ${isBlocked ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-rose-500/10 ring-1 ring-rose-500/30'}`}>
                   {isBlocked ? <Lock className="h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]" /> : <ImageOff className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]" />}
                 </div>
                 <span className={`text-[11px] font-black tracking-[0.2em] uppercase ${isBlocked ? 'text-amber-300/90' : 'text-rose-400/80'}`}>{badge}</span>
                 {isFailed && (
                   <button
                     onClick={handleRetry}
                     className="relative mt-1 overflow-hidden rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold text-white ring-1 ring-white/20 transition-all duration-300 hover:bg-white/20 hover:ring-white/40 active:scale-95"
                   >
                     <span className="relative z-10">Retry in Create →</span>
                   </button>
                 )}
              </div>
            </>
          ) : (
            <>
              <div className="aspect-square w-full animate-pulse bg-gradient-to-b from-white/[0.05] to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--primary-light)/0.12)] via-transparent to-transparent animate-[oc-gen-glow_4s_ease-in-out_infinite]" />
              
              {/* Premium Scanning Laser */}
              <div className="absolute inset-x-0 top-0 z-10 h-[2px] w-full bg-gradient-to-r from-transparent via-[rgb(var(--primary-light))] to-transparent opacity-80 shadow-[0_0_15px_rgb(var(--primary-light))] animate-[oc-gen-scan_3s_ease-in-out_infinite]" />
              <div className="absolute inset-x-0 h-20 bg-gradient-to-b from-[rgb(var(--primary-light)/0.15)] to-transparent opacity-40 animate-[oc-gen-scan_3s_ease-in-out_infinite]" />
              
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-[rgb(var(--primary-light)/0.2)] animate-ping" />
                  <div className="relative h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary-light))]" style={{ boxShadow: '0 0 15px rgb(var(--primary-light)/0.8)' }} />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="min-w-0 px-1">
          <div className="truncate text-[13px] font-bold text-white tracking-tight">{title}</div>
          <div className={`mt-0.5 text-[11px] font-semibold flex items-center gap-1.5 ${isBlocked ? 'text-amber-300/90' : isFailed ? 'text-rose-400/80' : 'text-zinc-500'}`}>
            {!isBlocked && !isFailed && <span className="h-1 w-1 rounded-full bg-[rgb(var(--primary-light))] animate-pulse" />}
            {subtitle}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-4 py-3.5 transition-all duration-300 hover:bg-white/[0.03] rounded-2xl px-3 -mx-3">
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[#0c0d12] ring-1 ring-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {isBlocked || isFailed ? (
          <>
            <div className={`absolute inset-0 ${isBlocked ? 'bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.2),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.22),transparent_70%)]'} animate-digitize`} />
            <div className="absolute inset-0 flex items-center justify-center bg-[#0c0d12]/50 backdrop-blur-md">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg ${isBlocked ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-rose-500/10 ring-1 ring-rose-500/30'}`}>
                {isBlocked ? <Lock className="h-3.5 w-3.5 text-amber-300" /> : <ImageOff className="h-3.5 w-3.5 text-rose-400" />}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="h-full w-full bg-gradient-to-b from-white/[0.08] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--primary-light)/0.15)] via-transparent to-transparent animate-[oc-gen-glow_4s_ease-in-out_infinite]" />
            <div className="absolute inset-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[rgb(var(--primary-light))] to-transparent opacity-60 shadow-[0_0_10px_rgb(var(--primary-light))] animate-[oc-gen-scan_3s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex h-6 w-6 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[rgb(var(--primary-light)/0.2)] animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="relative h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary-light))]" style={{ boxShadow: '0 0 12px rgb(var(--primary-light)/0.7)' }} />
              </div>
            </div>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-white tracking-tight">{title}</div>
        <div className={`mt-1 text-[11px] font-semibold flex items-center gap-1.5 ${isBlocked ? 'text-amber-300/90' : isFailed ? 'text-rose-400/80' : 'text-zinc-500'}`}>
          {!isBlocked && !isFailed && <span className="h-1 w-1 rounded-full bg-[rgb(var(--primary-light))] animate-pulse" />}
          {subtitle}
        </div>
      </div>
    </div>
  )
}

export default function MediaLibraryPage() {
  usePageMeta('Library', 'Your images, projects, favorites, and deleted items in Omnia Creata Studio.')
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
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())

  const section = useMemo<LibrarySection>(() => {
    if (location.pathname.startsWith('/library/projects') || location.pathname.startsWith('/library/collections')) return 'collections'
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
      setNoticeState({
        title: 'Removed forever',
        body: 'The selected asset was permanently deleted.',
      })
      await invalidateLibrary()
    },
  })

  const emptyTrashMutation = useMutation({
    mutationFn: () => studioApi.emptyTrash(),
    onSuccess: async () => {
      setConfirmState(null)
      setNoticeState({
        title: 'Trash emptied',
        body: 'All deleted assets were permanently removed.',
      })
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
      setNoticeState({
        title: 'Project deleted',
        body: 'The empty project was removed.',
      })
      await invalidateLibrary()
    },
  })
  const exportProjectMutation = useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string; title: string }) => {
      const blob = await studioApi.exportProject(projectId)
      await downloadBlob(blob, `${title.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() || 'project'}.zip`)
    },
  })

  const menuBusy =
    permanentDeleteMutation.isPending ||
    emptyTrashMutation.isPending ||
    updatePostMutation.isPending ||
    movePostMutation.isPending ||
    trashPostMutation.isPending ||
    updateProjectMutation.isPending ||
    deleteProjectMutation.isPending ||
    exportProjectMutation.isPending

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
        existing.derivedTags = Array.from(new Set([...existing.derivedTags, ...(asset.derived_tags ?? [])]))
        continue
      }

      groups.set(groupId, {
        id: groupId,
        title: assetDisplayTitle(asset),
        prompt: asset.prompt || 'Saved Studio result',
        model: String(metadata.model ?? 'Image'),
        modelLabel: getCreativeProfileLabel(
          String(metadata.model ?? ''),
          String(metadata.display_model_label ?? metadata.model ?? 'Studio profile'),
        ),
        derivedTags: asset.derived_tags ?? [],
        createdAt: asset.created_at,
        projectId: asset.project_id,
        projectTitle: isChatOrigin ? 'Chat session' : project?.title ?? 'Project',
        isChatOrigin,
        libraryState: assetLibraryState(asset),
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
        .filter((generation) => generationLibraryState(generation) === 'generating')
        .filter((generation) => matchesQuery(search, generation.title, generation.prompt_snapshot.prompt, generation.model)),
    [generations, search],
  )

  const failedGenerations = useMemo(
    () =>
      generations
        .filter((generation) => generationLibraryState(generation) === 'failed')
        .filter((generation) => Date.now() - new Date(generation.created_at).getTime() <= 1000 * 60 * 60 * 24 * 7)
        .filter((generation) => matchesQuery(search, generation.display_title, generation.prompt_snapshot.prompt, generation.model)),
    [generations, search],
  )

  const blockedGroups = useMemo(
    () => groupedAssets.filter((group) => group.libraryState === 'blocked'),
    [groupedAssets],
  )

  const readyGroups = useMemo(
    () => groupedAssets.filter((group) => group.libraryState === 'ready'),
    [groupedAssets],
  )

  const composeProjects = useMemo(
    () => projects.filter((project) => !isChatProject(project)),
    [projects],
  )

  const filteredImageGroups = useMemo(
    () =>
      readyGroups.filter((group) => {
        if (!matchesQuery(search, group.title, group.prompt, group.model, group.projectTitle, ...group.derivedTags)) return false
        if (imageFilter === 'recent') return Date.now() - new Date(group.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 3
        if (imageFilter === 'processing') return false
        return true
      }),
    [imageFilter, readyGroups, search],
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

  const buildStyleModifier = (group: AssetGroup) => {
    const styleBits = Array.from(
      new Set(
        [group.modelLabel, ...group.derivedTags.slice(0, 4)]
          .map((part) => part?.trim())
          .filter((part): part is string => Boolean(part)),
      ),
    )
    return styleBits.join(', ')
  }

  const openStyleWith = (group: AssetGroup) => {
    const params: Record<string, string> = {
      model: group.model,
      projectId: group.projectId,
    }
    const styleModifier = buildStyleModifier(group)
    if (styleModifier) params.style_modifier = styleModifier
    openComposeWith(params)
  }

  const openChatWithAsset = (group: AssetGroup, asset: MediaAsset = group.items[0]) => {
    const next = new URLSearchParams({
      new: '1',
      mode: 'Edit',
      source: 'library',
      draft: group.prompt
        ? `Refine this image while keeping the core direction: ${group.prompt.slice(0, 220)}`
        : 'Refine this image while keeping the original direction.',
      reference_asset_label: assetDisplayTitle(asset),
    })
    if (asset.id) next.set('reference_asset_id', asset.id)
    const previewUrl = assetPreviewUrl(asset)
    if (previewUrl) next.set('reference_asset_url', previewUrl)
    navigate(`/chat?${next.toString()}`)
  }

  const handleMenuError = (error: unknown) => {
    setNoticeState({
      title: 'Action unavailable',
      body: error instanceof Error ? error.message : 'That action could not be completed.',
    })
  }

  const handleVisibilityChange = async (postId: string, visibility: 'public' | 'private') => {
    try {
      await updatePostMutation.mutateAsync({ postId, payload: { visibility } })
      setNoticeState({
        title: visibility === 'public' ? 'Image set is public' : 'Image set is private',
        body:
          visibility === 'public'
            ? 'This image set can now appear on public Studio surfaces.'
            : 'This image set is now hidden from public Studio surfaces.',
      })
    } catch (error) {
      handleMenuError(error)
    }
  }

  const handleTrashGroup = async (postId: string, title: string) => {
    try {
      await trashPostMutation.mutateAsync(postId)
      setNoticeState({
        title: 'Moved to Trash',
        body: `"${title}" was moved to Trash.`,
      })
    } catch (error) {
      handleMenuError(error)
    }
  }

  const handleRestoreAsset = async (asset: MediaAsset) => {
    try {
      await restoreAssetMutation.mutateAsync(asset.id)
      setNoticeState({
        title: 'Restored to library',
        body: `"${assetDisplayTitle(asset)}" is back in your library.`,
      })
    } catch (error) {
      handleMenuError(error)
    }
  }

  const handleMoveGroup = async (postId: string, projectId: string, title: string) => {
    try {
      await movePostMutation.mutateAsync({ postId, projectId })
      const targetProject = composeProjects.find((project) => project.id === projectId)
      setNoticeState({
        title: 'Moved to project',
        body: targetProject
          ? `"${title}" now lives in "${targetProject.title}".`
          : `"${title}" was moved to another project.`,
      })
    } catch (error) {
      handleMenuError(error)
    }
  }

  const openPreview = (group: AssetGroup, index: number) => {
    setActionMenu(null)
    setPreviewState({ group, index })
  }

  const toggleGroupSelect = (id: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkTrash = async () => {
    const ids = Array.from(selectedGroups)
    for (const id of ids) {
      try { await trashPostMutation.mutateAsync(id) } catch { /* continue */ }
    }
    if (ids.length) {
      setNoticeState({
        title: 'Moved to Trash',
        body: `${ids.length} image set${ids.length > 1 ? 's were' : ' was'} moved to Trash.`,
      })
    }
    setSelectedGroups(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-[rgb(var(--primary-light)/0.2)]" />
            <div className="relative h-3 w-3 rounded-full bg-[rgb(var(--primary-light))]" style={{ boxShadow: '0 0 12px rgb(var(--primary-light)/0.6)' }} />
          </div>
          <p className="text-sm text-zinc-500">Loading your library…</p>
        </div>
      </div>
    )
  }

  if (!canLoadPrivate) {
    return (
      <AppPage className="max-w-[1180px] py-8">
        <EmptyInline
          icon={<ImageIcon className="h-4 w-4" />}
          title="Your Library unlocks after sign in."
          description="Saved images, projects, favorites, and trash only appear once you are inside Studio."
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
              description="All your created images live here. Images in progress will appear while they're being made."
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
                <div className={activeView === 'grid' ? 'mt-3.5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6' : 'mt-3.5 divide-y divide-white/[0.06]'}>
                  {pendingGenerations.map((generation) => (
                    <PendingPreview key={generation.job_id} generation={generation} view={activeView} state="generating" />
                  ))}
                </div>
              </section>
            ) : null}

            {blockedGroups.length ? (
              <section className="border-b border-white/[0.06] pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium text-white">Blocked</div>
                  <StatusPill tone="warning">{blockedGroups.length} locked</StatusPill>
                </div>
                <div className={activeView === 'grid' ? 'mt-3.5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6' : 'mt-3.5 divide-y divide-white/[0.06]'}>
                  {blockedGroups.map((group) => {
                    const asset = group.items[0]
                    return (
                      <div key={group.id} className={activeView === 'grid' ? 'space-y-2' : 'group flex items-center gap-4 py-3'}>
                        <div className={`relative overflow-hidden rounded-[18px] bg-[#111216] ring-1 ring-white/[0.05] shadow-[0_8px_30px_rgba(0,0,0,0.3)] ${activeView === 'grid' ? '' : 'h-14 w-14 shrink-0'}`}>
                          <ProtectedAssetImage
                            sources={assetPreviewSources(asset)}
                            alt={group.title}
                            className={`${activeView === 'grid' ? 'aspect-square w-full' : 'h-full w-full'} object-cover blur-[12px] saturate-50`}
                            fallbackClassName={`${activeView === 'grid' ? 'aspect-square w-full' : 'h-full w-full'} flex items-center justify-center bg-[#111216] text-zinc-600`}
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0c0d12]/35 backdrop-blur-md">
                            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/20">
                              <Lock className="h-4 w-4 text-amber-300/90" />
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">Blocked</span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-white">{group.title}</div>
                          <div className="mt-0.5 text-[11px] text-amber-300/80">Content blocked</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {failedGenerations.length ? (
              <section className="border-b border-white/[0.06] pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium text-white">Failed</div>
                  <StatusPill tone="danger">{failedGenerations.length} failed</StatusPill>
                </div>
                <div className={activeView === 'grid' ? 'mt-3.5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6' : 'mt-3.5 divide-y divide-white/[0.06]'}>
                  {failedGenerations.map((generation) => (
                    <PendingPreview key={generation.job_id} generation={generation} view={activeView} state="failed" />
                  ))}
                </div>
              </section>
            ) : null}

            {assetsQuery.isLoading ? (
              <SkeletonImageGrid count={8} />
            ) : imageFilter === 'processing' ? (
              pendingGenerations.length ? null : (
                <EmptyInline
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Nothing is rendering right now."
                  description="Head to Create and start generating — your images will appear here while they're in progress."
                />
              )
            ) : filteredImageGroups.length ? (
              <section className="space-y-4">
                {filteredImageGroups.map((group) => (
                  <section key={group.id} className="group border-b border-white/[0.06] pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          onClick={() => toggleGroupSelect(group.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                            selectedGroups.has(group.id)
                              ? 'border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light))] text-white'
                              : 'border-white/[0.15] bg-white/[0.03] text-transparent hover:border-white/30 hover:bg-white/[0.06]'
                          }`}
                          title={selectedGroups.has(group.id) ? 'Deselect' : 'Select'}
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                          </svg>
                        </button>
                        <div className="min-w-0">
                          <div className="truncate text-[15px] font-semibold text-white">{group.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                            <span>{formatDate(group.createdAt)}</span>
                            {group.items.length > 1 && (
                              <>
                                <span className="text-zinc-600">·</span>
                                <span>{group.items.length} variations</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="relative" data-library-menu-root="true">
                        <button
                          onClick={() => setActionMenu((current) => (current === `post:${group.id}` ? null : `post:${group.id}`))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                          title="Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === `post:${group.id}` ? (
                          <InlineActionMenu>
                            <MenuAction
                              onClick={() => {
                                openPreview(group, 0)
                                setActionMenu(null)
                              }}
                            >
                              Open
                            </MenuAction>
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
                                    openStyleWith(group)
                                    setActionMenu(null)
                                  }}
                                >
                                  Reuse style
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    const leadAsset = group.items[0]
                                    openComposeWith({
                                      prompt: group.prompt,
                                      model: group.model,
                                      projectId: group.projectId,
                                      reference_asset_id: leadAsset.id,
                                      reference_mode: 'optional',
                                      source: 'library',
                                    })
                                    setActionMenu(null)
                                  }}
                                >
                                  Create variations
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    openChatWithAsset(group)
                                    setActionMenu(null)
                                  }}
                                >
                                  Edit in Chat
                                </MenuAction>
                                <MenuDivider />
                              </>
                            ) : null}
                            <MenuAction
                              onClick={() => {
                                setMoveState({ postId: group.id, currentProjectId: group.projectId, title: group.title })
                                setActionMenu(null)
                              }}
                            >
                              Move to project
                            </MenuAction>
                            <MenuDivider />
                            <MenuAction
                              tone="danger"
                              disabled={menuBusy}
                              onClick={async () => {
                                await handleTrashGroup(group.id, group.title)
                                setActionMenu(null)
                              }}
                            >
                              Move to trash
                            </MenuAction>
                          </InlineActionMenu>
                        ) : null}
                      </div>
                    </div>

                    {activeView === 'grid' ? (
                      <div className="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                        {group.items.map((asset, assetIndex) => {
                          const isLiked = metadataNumber(asset.metadata, 'like_count') ?? 0 > 0
                          return (
                            <div key={asset.id} className="group/card relative">
                              <button
                                onClick={() => openPreview(group, assetIndex)}
                                className="relative block w-full aspect-square overflow-hidden rounded-[24px] bg-[#0c0d12] ring-1 ring-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-500 hover:ring-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:-translate-y-1 active:scale-[0.97]"
                                style={{ transform: 'translate3d(0,0,0)' }}
                              >
                                <ProtectedAssetImage
                                  sources={assetPreviewSources(asset)}
                                  alt={assetDisplayTitle(asset)}
                                  className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-[1.08] group-hover/card:brightness-[0.85]"
                                  fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
                                
                                {group.items.length > 1 && (
                                  <div className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-black text-white/90 backdrop-blur-md ring-1 ring-white/10">
                                    V{variantOrder(asset) + 1}
                                  </div>
                                )}
                              </button>

                              {/* Premium Hover Action Bar */}
                              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/10 p-1.5 opacity-0 backdrop-blur-xl ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover/card:opacity-100 group-hover/card:-translate-y-1 animate-glass-reveal">
                                <button
                                  onClick={(e) => { e.stopPropagation(); /* Heart logic if exists */ }}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90 ${isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                  title="Like"
                                >
                                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                                </button>
                                {!group.isChatOrigin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openComposeWith({ prompt: group.prompt, model: group.model, projectId: group.projectId })
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all duration-300 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-90"
                                    title="Reuse Prompt"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                  </button>
                                )}
                                <div className="h-4 w-px bg-white/10 mx-0.5" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleTrashGroup(group.id, group.title)
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-all duration-300 hover:bg-rose-500/20 hover:text-rose-300 hover:scale-110 active:scale-90"
                                  title="Trash"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 space-y-2">
                        {group.items.map((asset, assetIndex) => (
                          <button
                            key={asset.id}
                            onClick={() => openPreview(group, assetIndex)}
                            className="group/list-item flex w-full items-center gap-5 rounded-2xl px-3 py-3 text-left transition-all duration-300 hover:bg-white/5 active:scale-[0.99]"
                          >
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[#0c0d12] ring-1 ring-white/10 shadow-lg transition-transform duration-500 group-hover/list-item:scale-105">
                              <ProtectedAssetImage
                                sources={assetPreviewSources(asset)}
                                alt={assetDisplayTitle(asset)}
                                className="h-full w-full object-cover"
                                fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[14px] font-bold text-white tracking-tight">{assetDisplayTitle(asset)}</div>
                              <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-zinc-500">
                                <span>Variation {variantOrder(asset) + 1}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span>{formatDate(asset.created_at)}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-700 transition-all duration-300 group-hover/list-item:translate-x-1 group-hover/list-item:text-zinc-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </section>
            ) : (
              <EmptyInline icon={<ImageIcon className="h-4 w-4" />} title="No images yet." description="Generate something in Create and it will land here automatically." />
            )}

            {/* Bulk action bar - Summoning Animation */}
            {selectedGroups.size > 0 && (
              <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4">
                <div className="pointer-events-auto flex items-center gap-4 rounded-full bg-[#16181f]/80 px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-2xl animate-tray-summon" style={{ boxShadow: 'var(--border-glow), 0 20px 50px rgba(0,0,0,0.6)' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--primary-light))] text-[12px] font-black text-white shadow-[0_0_12px_rgba(var(--primary-light),0.5)]">
                      {selectedGroups.size}
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">Selected</span>
                  </div>
                  
                  <div className="h-4 w-px bg-white/10" />
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGroups(new Set(filteredImageGroups.map((g) => g.id)))}
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/5 hover:text-white active:scale-95"
                    >
                      Select all
                    </button>
                    <button
                      onClick={handleBulkTrash}
                      disabled={trashPostMutation.isPending}
                      className="rounded-full bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 ring-1 ring-rose-500/20 transition-all hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
                    >
                      Move to trash
                    </button>
                  </div>

                  <div className="h-4 w-px bg-white/10" />

                  <button
                    onClick={() => setSelectedGroups(new Set())}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white active:scale-90"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {section === 'collections' ? (
          <>
            <Toolbar
              title="Projects"
              description="Projects keep related image sets together so you can revisit them anytime."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, collections: view }))}
              filters={<FilterBar options={collectionFilters} value={collectionFilter} onChange={setCollectionFilter} />}
            />

            {filteredProjects.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0]
                    return (
                      <div key={project.id} className="group space-y-3">
                        <div className="relative" data-library-menu-root="true">
                          <Link to={`/projects/${project.id}`} className="block overflow-hidden rounded-[22px] bg-[#111216] ring-1 ring-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-500 group-hover:ring-white/[0.12] group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)] group-hover:-translate-y-1">
                            {cover ? (
                              <div className="relative overflow-hidden">
                                <ProtectedAssetImage
                                  sources={assetPreviewSources(cover)}
                                  alt={project.title}
                                  className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                                  fallbackClassName="flex aspect-[16/10] w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-md ring-1 ring-white/10 opacity-0 translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                                  <ImageIcon className="h-3 w-3" />
                                  {projectAssets.length}
                                </div>
                              </div>
                            ) : (
                              <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-white/[0.02] to-transparent">
                                <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/[0.03] ring-1 ring-white/[0.06] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
                                  <Folder className="h-6 w-6 text-zinc-600 transition-colors duration-300 group-hover:text-zinc-400" />
                                </div>
                              </div>
                            )}
                          </Link>
                          <button
                            onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-zinc-300 backdrop-blur-md ring-1 ring-white/10 transition-all duration-300 hover:bg-black/60 hover:text-white opacity-0 group-hover:opacity-100"
                            title="Project actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `project:${project.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                onClick={() => {
                                  navigate(`/projects/${project.id}`)
                                  setActionMenu(null)
                                }}
                              >
                                Open
                              </MenuAction>
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
                                disabled={exportProjectMutation.isPending}
                                onClick={async () => {
                                  try {
                                    await exportProjectMutation.mutateAsync({ projectId: project.id, title: project.title })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Export all
                              </MenuAction>
                              <MenuDivider />
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={() => {
                                  setActionMenu(null)
                                  if (projectAssets.length > 0) {
                                    setNoticeState({
                                      title: 'Project has images',
                                      body: 'Move or remove items before deleting this project.',
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
                        <div className="min-w-0 px-1">
                          <div className="truncate text-[14px] font-bold text-white tracking-wide transition-colors duration-300 group-hover:text-[rgb(var(--primary-light))]">{project.title}</div>
                          <div className="mt-1.5 text-[11px] text-zinc-500 font-medium">
                            {projectAssets.length} image{projectAssets.length !== 1 ? 's' : ''} · {formatDate(project.updated_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              ) : (
                <section className="space-y-1 pt-2">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0]
                    return (
                      <div key={project.id} className="group flex items-center gap-4 rounded-2xl px-3 py-3.5 transition-all duration-300 hover:bg-white/[0.03]">
                        <Link to={`/projects/${project.id}`} className="relative h-14 w-20 shrink-0 overflow-hidden rounded-[14px] bg-[#111216] ring-1 ring-white/[0.06] shadow-md">
                          {cover ? (
                            <ProtectedAssetImage
                              sources={assetPreviewSources(cover)}
                              alt={project.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
                              <Folder className="h-4 w-4 text-zinc-600" />
                            </div>
                          )}
                        </Link>
                        <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold text-white tracking-wide transition-colors duration-300 group-hover:text-[rgb(var(--primary-light))]">{project.title}</div>
                          <div className="mt-1 truncate text-[12px] text-zinc-500">{project.description || 'No description yet.'}</div>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-400 ring-1 ring-white/[0.06]">
                            <ImageIcon className="h-3 w-3" />
                            {projectAssets.length}
                          </div>
                          <div className="hidden sm:block text-[11px] text-zinc-600">
                            {formatDate(project.updated_at)}
                          </div>
                          <div className="relative" data-library-menu-root="true">
                            <button
                              onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenu === `project:${project.id}` ? (
                              <InlineActionMenu>
                                <MenuAction
                                  onClick={() => {
                                    navigate(`/projects/${project.id}`)
                                    setActionMenu(null)
                                  }}
                                >
                                  Open
                                </MenuAction>
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
                                  disabled={exportProjectMutation.isPending}
                                  onClick={async () => {
                                    try {
                                      await exportProjectMutation.mutateAsync({ projectId: project.id, title: project.title })
                                      setActionMenu(null)
                                    } catch (error) {
                                      handleMenuError(error)
                                    }
                                  }}
                                >
                                  Export all
                                </MenuAction>
                                <MenuDivider />
                                <MenuAction
                                  tone="danger"
                                  disabled={menuBusy}
                                  onClick={() => {
                                    setActionMenu(null)
                                    if (projectAssets.length > 0) {
                                      setNoticeState({
                                        title: 'Project has images',
                                        body: 'Move or remove items before deleting this project.',
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
              <section className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#111216]/60 text-zinc-400 ring-1 ring-white/[0.08] shadow-[0_0_30px_rgba(124,58,237,0.12)] backdrop-blur-md mb-5">
                  <Folder className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">No projects yet</h3>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-zinc-500">
                  Projects keep related image sets together. Create one when you want a dedicated space for a campaign, concept, or series.
                </p>
                <Link
                  to="/create"
                  className="mt-6 flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[14px] font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)]"
                >
                  <Sparkles className="h-4 w-4" />
                  Start Creating
                </Link>
              </section>
            )}
          </>
        ) : null}

        {section === 'likes' ? (
          <>
            <Toolbar
              title="Favorites"
              description="Saved visuals appear here when you favorite work from Create, Library, or public posts."
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
                      <div key={asset.id} className="relative rounded-[20px]">
                        <div className="overflow-hidden rounded-[20px] bg-white/[0.03]">
                          <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/5] w-full object-cover opacity-75" />
                        </div>
                        <div className="absolute right-2 top-2" data-library-menu-root="true">
                          <button
                            onClick={() => setActionMenu((current) => (current === `trash:${asset.id}` ? null : `trash:${asset.id}`))}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur transition hover:bg-black/50 hover:text-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `trash:${asset.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  await handleRestoreAsset(asset)
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
                              onClick={async () => {
                                await handleRestoreAsset(asset)
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
          openStyleWith(previewState.group)
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
          await handleVisibilityChange(previewState.group.id, visibility)
        }}
        onTrash={async () => {
          if (!previewState) return
          await handleTrashGroup(previewState.group.id, previewState.group.title)
          setPreviewState(null)
        }}
      />
      <MovePostDialog
        state={moveState}
        projects={composeProjects}
        busy={movePostMutation.isPending}
        onClose={() => setMoveState(null)}
        onMove={async (projectId) => {
          if (!moveState) return
          await handleMoveGroup(moveState.postId, projectId, moveState.title)
          setMoveState(null)
        }}
      />
    </>
  )
}
