import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Folder,
  Grid2X2,
  Heart,
  Image as ImageIcon,
  ImageOff,
  List,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'

import { ProtectedAssetImage } from '@/components/ProtectedAssetImage'
import {
  AppPage,
  SkeletonImageGrid,
  StatusPill,
} from '@/components/StudioPrimitives'
import { usePageMeta } from '@/lib/usePageMeta'
import {
  getCreativeProfileLabel,
  normalizeJobStatus,
  studioApi,
  type Generation,
  type MediaAsset,
  type PublicPost,
  type Project,
} from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type LibrarySection = 'images' | 'collections' | 'likes' | 'trash'
type ViewMode = 'grid' | 'list'
type ImageFilter = 'all' | 'processing' | 'recent'
type CollectionFilter = 'all' | 'with-work' | 'empty'
type TrashFilter = 'all' | 'recent'
type ImageSort = 'newest' | 'oldest' | 'name' | 'model'
type ProjectSort = 'updated' | 'newest' | 'oldest' | 'name'

type ConfirmState =
  | { kind: 'permanent-delete'; asset: MediaAsset }
  | { kind: 'empty-trash'; count: number }
  | { kind: 'delete-project'; projectId: string; title: string }
  | null

type PreviewState = {
  group: AssetGroup
  index: number
} | null

type FavoritePreviewState = {
  post: PublicPost
  index: number
} | null

type MoveState = {
  postIds: string[]
  currentProjectId: string
  title: string
  count: number
} | null

type NoticeState = {
  title: string
  body: string
} | null

type RenameState =
  | { kind: 'post'; id: string; title: string }
  | {
      kind: 'project'
      id?: string
      title: string
      description?: string
      mode?: 'create' | 'edit'
    }
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

const imageSortOptions: Array<{ id: ImageSort; label: string }> = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name', label: 'Name' },
  { id: 'model', label: 'Model' },
]

const projectSortOptions: Array<{ id: ProjectSort; label: string }> = [
  { id: 'updated', label: 'Updated' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name', label: 'Name' },
]

const LIBRARY_VIEW_STORAGE_KEY = 'studio-library-views'
const IMAGE_SORT_STORAGE_KEY = 'studio-library-sort:images'
const PROJECT_SORT_STORAGE_KEY = 'studio-library-sort:projects'
const IMAGE_PAGE_SIZE = 12
const PROJECT_PAGE_SIZE = 12

function readStoredViews() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIBRARY_VIEW_STORAGE_KEY) ?? 'null') as Record<LibrarySection, ViewMode> | null
    if (!parsed) return null
    return parsed
  } catch {
    return null
  }
}

function readStoredValue<T extends string>(key: string, fallback: T) {
  try {
    const value = localStorage.getItem(key)
    return (value as T) || fallback
  } catch {
    return fallback
  }
}

function assetLibraryState(asset: MediaAsset): LibraryState {
  return (
    asset.library_state ??
    (asset.protection_state === 'blocked' ? 'blocked' : 'ready')
  )
}

function generationLibraryState(generation: Generation): LibraryState {
  if (generation.library_state) return generation.library_state
  const normalized = normalizeJobStatus(generation.status)
  if (normalized === 'queued' || normalized === 'running') return 'generating'
  if (
    ['policy_blocked', 'safety_block', 'policy_review'].includes(
      generation.error_code?.trim().toLowerCase() ?? '',
    )
  ) {
    return 'blocked'
  }
  if ((generation.error ?? '').toLowerCase().includes('policy')) {
    return 'blocked'
  }
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
    return [
      asset.blocked_preview_url,
      asset.preview_url,
      asset.thumbnail_url,
      asset.url,
    ]
  }
  return [asset.preview_url, asset.thumbnail_url, asset.url]
}

function favoritePostAssets(post: PublicPost) {
  const seen = new Set<string>()
  const assets = [post.cover_asset, ...(post.preview_assets ?? [])].filter(
    (asset): asset is MediaAsset => Boolean(asset),
  )
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false
    seen.add(asset.id)
    return true
  })
}

function favoritePostTitle(post: PublicPost) {
  return (
    post.title?.trim() ||
    post.cover_asset?.display_title?.trim() ||
    post.cover_asset?.title?.trim() ||
    'Saved favorite'
  )
}

function matchesQuery(
  query: string,
  ...parts: Array<string | null | undefined>
) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function formatRelativeDate(value: string) {
  const target = new Date(value).getTime()
  const now = Date.now()
  const diffMinutes = Math.round((target - now) / 60_000)

  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)} min ${diffMinutes <= 0 ? 'ago' : 'from now'}`
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)} hr ${diffHours <= 0 ? 'ago' : 'from now'}`
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 8) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ${diffDays <= 0 ? 'ago' : 'from now'}`
  }

  return formatDate(value)
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

function variantOrder(asset: MediaAsset) {
  const raw = Number(
    (asset.metadata as Record<string, unknown>).variation_index ?? 0,
  )
  return Number.isFinite(raw) ? raw : 0
}

function isChatProject(project: Project | null | undefined) {
  if (!project) return false
  const normalizedTitle = project.title.trim().toLowerCase()
  const normalizedDescription = project.description.trim().toLowerCase()
  return (
    project.surface === 'chat' ||
    normalizedTitle.startsWith('chat -') ||
    normalizedDescription === 'created from studio chat'
  )
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
  const resolvedTitle =
    state.kind === 'empty-trash'
      ? 'Empty trash?'
      : state.kind === 'delete-project'
        ? 'Delete project?'
        : 'Delete forever?'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl"
        style={{
          boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              {resolvedTitle}
            </div>
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
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
          >
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
      <div
        className="w-full max-w-md rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl"
        style={{
          boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              {state.title}
            </div>
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
          <button
            onClick={onClose}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
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
  onConfirm: (payload: { title: string; description?: string }) => void
}) {
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    setValue(state?.title ?? '')
    setDescription(state?.kind === 'project' ? state.description ?? '' : '')
  }, [state])

  if (!state) return null

  const isProject = state.kind === 'project'
  const isCreate = isProject && state.mode === 'create'
  const heading = state.kind === 'post'
    ? 'Rename image set'
    : isCreate
      ? 'Create project'
      : 'Edit project'
  const descriptionCopy = state.kind === 'post'
    ? 'Give this image set a cleaner name.'
    : isCreate
      ? 'Projects keep related image sets, campaigns, and iteration branches together. Start with a short working title and an optional note.'
      : 'Tighten the title and description so this project is easier to scan later.'
  const submitLabel = isProject
    ? isCreate
      ? 'Create project'
      : 'Save project'
    : 'Save'

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div
        className="w-full max-w-lg rounded-[24px] bg-[#0c0d12]/90 p-6 shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] backdrop-blur-3xl"
        style={{
          boxShadow: 'var(--border-glow), 0 36px 120px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{heading}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              {descriptionCopy}
            </p>
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
          <label className="block text-[11px] uppercase tracking-[0.2em] text-zinc-600">
            Title
          </label>
          <input
            id="studio-library-rename-title"
            name="title"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="input mt-2"
            placeholder={
              state.kind === 'post' ? 'Image set name' : 'Project name'
            }
          />
        </div>

        {isProject ? (
          <div className="mt-4">
            <label className="block text-[11px] uppercase tracking-[0.2em] text-zinc-600">
              Description
            </label>
            <textarea
              id="studio-library-project-description"
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="input mt-2 min-h-[120px] resize-none py-3"
              placeholder="What belongs in this project, who it is for, or what phase it is in."
            />
            <div className="mt-2 text-[11px] leading-5 text-zinc-500">
              Keep it short and operational. This is for future-you scanning the
              library, not for marketing copy.
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm({
                title: value,
                description: isProject
                  ? description.trim() || undefined
                  : undefined,
              })
            }
            disabled={
              busy ||
              !value.trim() ||
              (!isCreate &&
                value.trim() === state.title &&
                (!isProject ||
                  (description.trim() || '') === (state.description ?? '')))
            }
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Working...' : submitLabel}
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
  useEffect(() => {
    if (!state) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        onSelect(
          (state.index - 1 + state.group.items.length) %
            state.group.items.length,
        )
        return
      }
      if (event.key === 'ArrowRight') {
        onSelect((state.index + 1) % state.group.items.length)
      }
    }

    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onSelect, state])

  if (!state) return null

  const asset = state.group.items[state.index]
  const canStep = state.group.items.length > 1
  const aspectRatio = metadataString(asset.metadata, 'aspect_ratio')
  const detailTags = state.group.derivedTags.slice(0, 4)

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[rgba(4,6,10,0.82)] px-3 py-3 backdrop-blur-[10px] sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${state.group.title} preview`}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,196,255,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.52)_48%,rgba(0,0,0,0.78))]"
        onClick={onClose}
      />
      <button
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:right-5 sm:top-5"
        title="Close preview"
        aria-label="Close preview"
      >
        <X className="h-4 w-4" />
      </button>

      {canStep ? (
        <>
          <button
            onClick={() =>
              onSelect(
                (state.index - 1 + state.group.items.length) %
                  state.group.items.length,
              )
            }
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:left-5"
            title="Previous image"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() =>
              onSelect((state.index + 1) % state.group.items.length)
            }
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:right-5"
            title="Next image"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}

      <div className="relative z-[1] mx-auto grid min-h-[calc(100svh-1.5rem)] w-full max-w-[1500px] gap-4 sm:min-h-[calc(100svh-2.5rem)] sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch">
        <div
          className="group relative flex min-h-[20rem] items-center justify-center overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#07090d]/78 p-4 shadow-[0_32px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5 xl:min-h-[calc(100svh-2.5rem)] xl:px-8 xl:py-6"
          style={{
            boxShadow: '0 32px 120px rgba(0,0,0,0.5)',
          }}
        >
          <div className="absolute left-4 top-4 z-[1] flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2 sm:left-5 sm:top-5">
            <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
              {state.group.projectTitle}
            </span>
            {canStep ? (
              <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur-md ring-1 ring-white/[0.1]">
                Variation {state.index + 1} of {state.group.items.length}
              </span>
            ) : null}
          </div>
          <ProtectedAssetImage
            sources={assetPreviewSources(asset)}
            alt={assetDisplayTitle(asset)}
            className="max-h-[min(76vh,calc(100svh-10rem))] w-auto max-w-full rounded-[28px] object-contain shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            fallbackClassName="flex min-h-[18rem] max-h-[min(76vh,calc(100svh-10rem))] w-full max-w-full items-center justify-center rounded-[28px] bg-white/[0.04] text-zinc-600 shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div
          className="flex min-h-0 flex-col rounded-[30px] border border-white/[0.08] bg-[#0c0d12]/72 p-5 ring-1 ring-white/10 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] sm:p-6 xl:max-h-[calc(100svh-2.5rem)]"
          style={{
            boxShadow: 'var(--border-glow), 0 40px 100px rgba(0,0,0,0.8)',
          }}
        >
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1">
          <div>
            <div className="text-xl font-semibold tracking-[-0.03em] text-white">
              {state.group.title}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
              <span>{formatDate(asset.created_at)}</span>
              {state.group.items.length > 1 && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span>
                    Variation {state.index + 1} of {state.group.items.length}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <LightboxMetaTile label="Project" value={state.group.projectTitle} />
            <LightboxMetaTile label="Model" value={state.group.modelLabel} />
            {aspectRatio ? (
              <LightboxMetaTile label="Ratio" value={aspectRatio} />
            ) : null}
            <LightboxMetaTile
              label="Visibility"
              value={asset.visibility === 'public' ? 'Public' : 'Private'}
            />
          </div>
          <div className="space-y-3 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Prompt
              </div>
              <div className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-400">
                {state.group.prompt}
              </div>
            </div>
            {detailTags.length ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {detailTags.map((tag) => (
                  <span
                    key={`${state.group.id}-${tag}`}
                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {canStep ? (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Variations
              </div>
              <div className="grid grid-cols-5 gap-2">
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
            </div>
          ) : null}
          </div>

          <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
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
            <div className="grid gap-2.5 sm:grid-cols-3">
              {!isChatOrigin ? (
                <button
                  onClick={onReuseStyle}
                  className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95 disabled:opacity-50"
                  disabled={busy}
                >
                  Reuse style
                </button>
              ) : null}
              <button
                onClick={onMove}
                className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95 disabled:opacity-50"
                disabled={busy}
              >
                Move
              </button>
              {!isChatOrigin ? (
                <button
                  onClick={onOpenProject}
                  className="rounded-xl bg-white/5 border border-white/5 px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/10 active:scale-95"
                >
                  Project
                </button>
              ) : null}
            </div>
          </div>

          {/* Visibility & danger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onSetVisibility(
                  asset.visibility === 'public' ? 'private' : 'public',
                )
              }
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
          </div>
        </div>
      </div>
    </div>
  )
}

function FavoriteLightbox({
  state,
  busy,
  onClose,
  onSelect,
  onReusePrompt,
  onOpenCreator,
  onRemoveFavorite,
}: {
  state: FavoritePreviewState
  busy: boolean
  onClose: () => void
  onSelect: (index: number) => void
  onReusePrompt: () => void
  onOpenCreator: () => void
  onRemoveFavorite: () => void
}) {
  useEffect(() => {
    if (!state) return

    const assets = favoritePostAssets(state.post)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (assets.length < 2) return
      if (event.key === 'ArrowLeft') {
        onSelect((state.index - 1 + assets.length) % assets.length)
        return
      }
      if (event.key === 'ArrowRight') {
        onSelect((state.index + 1) % assets.length)
      }
    }

    const previousOverflow = document.body.style.overflow
    const previousOverscrollBehavior = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'contain'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscrollBehavior
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onSelect, state])

  if (!state) return null

  const assets = favoritePostAssets(state.post)
  const asset = assets[state.index] ?? assets[0] ?? null
  if (!asset) return null

  const canStep = assets.length > 1
  const aspectRatio = metadataString(asset.metadata, 'aspect_ratio')
  const model = metadataString(asset.metadata, 'display_model_label') ??
    metadataString(asset.metadata, 'model')

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-[rgba(4,6,10,0.82)] px-3 py-3 backdrop-blur-[10px] sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-label={`${favoritePostTitle(state.post)} preview`}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,196,255,0.08),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.52)_48%,rgba(0,0,0,0.78))]"
        onClick={onClose}
      />
      <button
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:right-5 sm:top-5"
        title="Close preview"
        aria-label="Close preview"
      >
        <X className="h-4 w-4" />
      </button>

      {canStep ? (
        <>
          <button
            onClick={() =>
              onSelect((state.index - 1 + assets.length) % assets.length)
            }
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:left-5"
            title="Previous image"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onSelect((state.index + 1) % assets.length)}
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white sm:right-5"
            title="Next image"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}

      <div className="relative z-[1] mx-auto grid min-h-[calc(100svh-1.5rem)] w-full max-w-[1500px] gap-4 sm:min-h-[calc(100svh-2.5rem)] sm:gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-stretch">
        <div className="group relative flex min-h-[20rem] items-center justify-center overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#07090d]/78 p-4 shadow-[0_32px_120px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-5 xl:min-h-[calc(100svh-2.5rem)] xl:px-8 xl:py-6">
          <div className="absolute left-4 top-4 z-[1] flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-2 sm:left-5 sm:top-5">
            <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
              {state.post.owner_display_name}
            </span>
            <span className="rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-zinc-200 backdrop-blur-md ring-1 ring-white/[0.1]">
              {state.post.like_count} {state.post.like_count === 1 ? 'like' : 'likes'}
            </span>
          </div>
          <ProtectedAssetImage
            sources={assetPreviewSources(asset)}
            alt={assetDisplayTitle(asset)}
            className="max-h-[min(76vh,calc(100svh-10rem))] w-auto max-w-full rounded-[28px] object-contain shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
            fallbackClassName="flex min-h-[18rem] max-h-[min(76vh,calc(100svh-10rem))] w-full max-w-full items-center justify-center rounded-[28px] bg-white/[0.04] text-zinc-600 shadow-[0_32px_120px_rgba(0,0,0,0.45)]"
          />
        </div>

        <div className="flex min-h-0 flex-col rounded-[30px] border border-white/[0.08] bg-[#0c0d12]/72 p-5 ring-1 ring-white/10 backdrop-blur-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] sm:p-6 xl:max-h-[calc(100svh-2.5rem)]">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1">
            <div>
              <div className="text-xl font-semibold tracking-[-0.03em] text-white">
                {favoritePostTitle(state.post)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-zinc-400">
                <span>{formatDate(state.post.created_at)}</span>
                <span className="text-zinc-600">·</span>
                <span>@{state.post.owner_username}</span>
                {canStep ? (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span>
                      Variation {state.index + 1} of {assets.length}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <LightboxMetaTile label="Creator" value={state.post.owner_display_name} />
              <LightboxMetaTile label="Likes" value={`${state.post.like_count}`} />
              {model ? <LightboxMetaTile label="Model" value={model} /> : null}
              {aspectRatio ? (
                <LightboxMetaTile label="Ratio" value={aspectRatio} />
              ) : null}
            </div>

            <div className="space-y-3 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Prompt
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-zinc-400">
                  {state.post.prompt || favoritePostTitle(state.post)}
                </div>
              </div>
              {state.post.style_tags.length ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {state.post.style_tags.map((tag) => (
                    <span
                      key={`${state.post.id}-${tag}`}
                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {canStep ? (
              <div className="space-y-3 border-t border-white/10 pt-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                  Variations
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {assets.map((item, index) => (
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
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
            <button
              onClick={onReusePrompt}
              className="w-full rounded-xl bg-white px-4 py-3 text-[14px] font-bold text-black transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
              disabled={busy}
            >
              Reuse prompt
            </button>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                onClick={onOpenCreator}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.14] active:scale-95"
              >
                View creator
              </button>
              <button
                onClick={onRemoveFavorite}
                className="rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-3 py-2.5 text-[13px] font-bold text-rose-200 transition-all duration-300 hover:bg-rose-500/[0.12] hover:border-rose-500/30 active:scale-95 disabled:opacity-50"
                disabled={busy}
              >
                Remove favorite
              </button>
            </div>
          </div>
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

  const destinations = projects.filter(
    (project) =>
      (!state.currentProjectId || project.id !== state.currentProjectId) &&
      !isChatProject(project),
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-[24px] bg-[#101115] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05]"
        style={{ boxShadow: 'var(--border-glow), 0 24px 90px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">
              {state.count > 1 ? 'Move image sets' : 'Move image set'}
            </div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">
              Choose where <span className="text-white">{state.title}</span>{' '}
              should live.
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
                  <div className="truncate text-sm font-medium text-white">
                    {project.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500">
                    {project.description || 'Project'}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
              </button>
            ))
          ) : (
            <div className="py-4 text-sm text-zinc-500">
              No other projects available.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InlineActionMenu({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute right-0 top-full z-30 mt-1.5 w-[min(196px,calc(100vw-2rem))] overflow-hidden rounded-[16px] bg-[#111216]/98 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/8 backdrop-blur-xl"
      style={{ boxShadow: 'var(--border-glow), 0 24px 80px rgba(0,0,0,0.48)' }}
    >
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
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-2.5 py-2 text-left text-[13px] transition ${tone === 'danger' ? 'text-rose-300 hover:bg-rose-500/[0.08] hover:text-rose-200' : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'} ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

function buildBrowseBadges(group: AssetGroup, limit = 4) {
  return Array.from(
    new Set(
      [group.modelLabel, group.isChatOrigin ? 'Chat' : null, ...group.derivedTags]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, limit)
}

function BrowseBadgeRow({
  group,
  limit = 3,
}: {
  group: AssetGroup
  limit?: number
}) {
  const badges = buildBrowseBadges(group, limit)
  if (!badges.length) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges.map((badge, index) => (
        <span
          key={`${group.id}-${badge}`}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            index === 0
              ? 'border-white/[0.12] bg-white/[0.06] text-zinc-200'
              : 'border-white/[0.08] bg-white/[0.03] text-zinc-500'
          }`}
        >
          {badge}
        </span>
      ))}
    </div>
  )
}

function LightboxMetaTile({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-zinc-300">{value}</div>
    </div>
  )
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (view: ViewMode) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/[0.04] bg-white/[0.02] p-1 backdrop-blur-md">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${value === 'grid' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${value === 'list' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-zinc-500 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}
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
    <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] p-1 backdrop-blur-md">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`relative rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-300 ${value === option.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SortControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-white/[0.04] bg-white/[0.02] px-3 py-2 text-[12px] text-zinc-400 backdrop-blur-md">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Sort
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="bg-transparent text-[12px] font-medium text-white outline-none"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-[#101115] text-white">
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
    <section className="pb-4 pt-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white md:text-[22px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-xl text-[12px] leading-5 text-zinc-500">{description}</p>
          ) : null}
          {filters ? <div className="mt-3">{filters}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <label className="group/search relative flex min-w-[220px] items-center gap-2.5 rounded-2xl bg-white/[0.03] px-3.5 py-2 text-[12px] text-zinc-400 ring-1 ring-white/[0.06] transition-all duration-300 focus-within:ring-white/[0.15] focus-within:bg-white/[0.05] focus-within:shadow-[0_0_20px_rgba(255,255,255,0.03)]">
            <Search className="h-3.5 w-3.5 text-zinc-500 transition-colors group-focus-within/search:text-zinc-300" />
            <input
              id="studio-library-search"
              name="search"
              ref={(el) => setInputRef(el)}
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search library…"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-600"
            />
            <div className="flex h-5 w-5 items-center justify-center rounded-md border border-white/[0.08] text-[9px] font-semibold text-zinc-600 group-focus-within/search:opacity-0 transition-opacity">
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
      className={`flex flex-col gap-4 py-8 ${compact ? 'min-h-[12vh] items-start justify-start text-left' : 'min-h-[22vh] items-center justify-center text-center'}`}
    >
      <div className={`group relative flex flex-col ${compact ? 'items-start text-left max-w-xl' : 'items-center text-center max-w-lg mx-auto py-10 px-8 rounded-[32px] bg-[#0c0d12]/50 ring-1 ring-white/[0.04] backdrop-blur-sm transition-all duration-500 hover:ring-white/[0.08] hover:bg-[#101116]/80'}`}>
        <div className={`relative flex items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1c1d24]/90 to-[#0c0d12]/80 text-zinc-400 ring-1 ring-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:text-white group-hover:ring-white/[0.18] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] ${compact ? 'h-14 w-14 mb-4' : 'h-16 w-16 mb-5'}`}>
          <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="relative z-10 drop-shadow-md">{icon}</div>
        </div>
        <div className="text-[16px] font-semibold tracking-tight text-white/95 group-hover:text-white transition-colors duration-300">
          {title}
        </div>
        <div className="mt-2 text-[13px] leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300">
          {description}
        </div>
      </div>
    </section>
  )
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
      <div className="text-[12px] text-zinc-500">
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function PendingPreview({
  generation,
  view,
  state,
  onDelete,
  isDeleting = false,
}: {
  generation: Generation
  view: ViewMode
  state: LibraryState
  onDelete?: (generation: Generation) => void
  isDeleting?: boolean
}) {
  const navigate = useNavigate()
  const isBlocked = state === 'blocked'
  const isFailed = state === 'failed'
  const title = generation.display_title || generation.title
  const subtitle = isBlocked
    ? 'Held for safety review'
    : isFailed
      ? 'Render stopped before completion'
      : 'Painting your vision...'
  const canRetry = isFailed
  const canRemove = Boolean(onDelete && (isBlocked || isFailed))
  const actionButtonClass =
    'flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.14] bg-black/40 text-zinc-200 backdrop-blur-md transition hover:border-white/30 hover:bg-black/55 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'

  const handleRetry = () => {
    const params = new URLSearchParams()
    if (generation.prompt_snapshot?.prompt)
      params.set('prompt', generation.prompt_snapshot.prompt)
    if (generation.model) params.set('model', generation.model)
    navigate(`/create?${params.toString()}`)
  }

  if (view === 'grid') {
    return (
      <div className="space-y-2">
        <div className="relative group/pending overflow-hidden rounded-[10px] bg-[#0c0d12] transition-all duration-300 hover:ring-1 hover:ring-white/10">
          {isBlocked || isFailed ? (
            <>
              <div
                className={`aspect-square w-full ${isBlocked ? 'bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.15),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.18),transparent_70%)]'} opacity-50 animate-digitize`}
              />
              <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
                {canRetry ? (
                  <button
                    onClick={handleRetry}
                    className={actionButtonClass}
                    title="Retry in Create"
                    aria-label={`Retry ${title} in Create`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {canRemove ? (
                  <button
                    onClick={() => onDelete?.(generation)}
                    disabled={isDeleting}
                    className={actionButtonClass}
                    title="Remove from Processing"
                    aria-label={`Remove ${title} from Processing`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0c0d12]/60 backdrop-blur-xl">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-transform duration-500 group-hover/pending:scale-110 ${isBlocked ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-rose-500/10 ring-1 ring-rose-500/30'}`}
                >
                  {isBlocked ? (
                    <Lock className="h-5 w-5 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.4)]" />
                  ) : (
                    <ImageOff className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.4)]" />
                  )}
                </div>
                {false && isFailed && (
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
              <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--primary-light)/0.12)] via-transparent to-transparent animate-[oc-gen-glow_3s_ease-in-out_infinite]" />

              {/* Premium Scanning Laser */}
              <div className="absolute inset-x-0 top-0 z-10 h-[2px] w-full bg-gradient-to-r from-transparent via-[rgb(var(--primary-light))] to-transparent opacity-80 shadow-[0_0_20px_rgba(var(--primary-light),0.8),0_0_8px_rgba(255,255,255,0.4)] animate-[oc-gen-scan_2.5s_ease-in-out_infinite]" />
              <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-[rgb(var(--primary-light)/0.2)] to-transparent opacity-50 animate-[oc-gen-scan_2.5s_ease-in-out_infinite]" />

              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[4px]">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full bg-[rgb(var(--primary-light)/0.3)] animate-ping"
                    style={{ animationDuration: '1.5s' }}
                  />
                  <div
                    className="relative h-3 w-3 rounded-full bg-[rgb(var(--primary-light))]"
                    style={{ boxShadow: '0 0 20px rgb(var(--primary-light))' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="min-w-0 px-1">
          <div className="truncate text-[13px] font-bold text-white tracking-tight">
            {title}
          </div>
          <div
            className={`mt-0.5 text-[11px] font-semibold flex items-center gap-1.5 ${isBlocked ? 'text-amber-300/90' : isFailed ? 'text-rose-400/80' : 'text-zinc-500'}`}
          >
            {!isBlocked && !isFailed && (
              <span className="h-1 w-1 rounded-full bg-[rgb(var(--primary-light))] animate-pulse" />
            )}
            {subtitle}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-4 py-3.5 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.04] rounded-[16px] px-3 -mx-3 ring-1 ring-transparent hover:ring-white/[0.06]">
      <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[12px] bg-[#0c0d12] ring-1 ring-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        {isBlocked || isFailed ? (
          <>
            <div
              className={`absolute inset-0 ${isBlocked ? 'bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.2),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.22),transparent_70%)]'} animate-digitize`}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-[#0c0d12]/50 backdrop-blur-md">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full shadow-lg ${isBlocked ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : 'bg-rose-500/10 ring-1 ring-rose-500/30'}`}
              >
                {isBlocked ? (
                  <Lock className="h-3.5 w-3.5 text-amber-300" />
                ) : (
                  <ImageOff className="h-3.5 w-3.5 text-rose-400" />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="h-full w-full bg-gradient-to-b from-white/[0.08] to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--primary-light)/0.15)] via-transparent to-transparent animate-[oc-gen-glow_3s_ease-in-out_infinite]" />
            <div className="absolute inset-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[rgb(var(--primary-light))] to-transparent opacity-80 shadow-[0_0_20px_rgba(var(--primary-light),0.8)] animate-[oc-gen-scan_2.5s_ease-in-out_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px]">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full bg-[rgb(var(--primary-light)/0.3)] animate-ping"
                  style={{ animationDuration: '1.5s' }}
                />
                <div
                  className="relative h-2 w-2 rounded-full bg-[rgb(var(--primary-light))]"
                  style={{ boxShadow: '0 0 15px rgb(var(--primary-light))' }}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-white tracking-tight">
          {title}
        </div>
        <div
          className={`mt-1 text-[11px] font-semibold flex items-center gap-1.5 ${isBlocked ? 'text-amber-300/90' : isFailed ? 'text-rose-400/80' : 'text-zinc-500'}`}
        >
          {!isBlocked && !isFailed && (
            <span className="h-1 w-1 rounded-full bg-[rgb(var(--primary-light))] animate-pulse" />
          )}
          {subtitle}
        </div>
      </div>
      {canRetry || canRemove ? (
        <div className="flex items-center gap-2">
          {canRetry ? (
            <button
              onClick={handleRetry}
              className={actionButtonClass}
              title="Retry in Create"
              aria-label={`Retry ${title} in Create`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {canRemove ? (
            <button
              onClick={() => onDelete?.(generation)}
              disabled={isDeleting}
              className={actionButtonClass}
              title="Remove from Processing"
              aria-label={`Remove ${title} from Processing`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default function MediaLibraryPage() {
  usePageMeta(
    'Library',
    'Your images, projects, favorites, and deleted items in Omnia Creata Studio.',
  )
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canLoadPrivate =
    !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const [search, setSearch] = useState('')
  const [views, setViews] = useState<Record<LibrarySection, ViewMode>>(
    () =>
      readStoredViews() ?? {
        images: 'grid',
        collections: 'grid',
        likes: 'grid',
        trash: 'grid',
      },
  )
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all')
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilter>('all')
  const [trashFilter, setTrashFilter] = useState<TrashFilter>('all')
  const [imageSort, setImageSort] = useState<ImageSort>(() =>
    readStoredValue(IMAGE_SORT_STORAGE_KEY, 'newest'),
  )
  const [projectSort, setProjectSort] = useState<ProjectSort>(() =>
    readStoredValue(PROJECT_SORT_STORAGE_KEY, 'updated'),
  )
  const [imagePage, setImagePage] = useState(1)
  const [projectPage, setProjectPage] = useState(1)
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>(null)
  const [favoritePreviewState, setFavoritePreviewState] =
    useState<FavoritePreviewState>(null)
  const [moveState, setMoveState] = useState<MoveState>(null)
  const [noticeState, setNoticeState] = useState<NoticeState>(null)
  const [renameState, setRenameState] = useState<RenameState>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const deferredSearch = useDeferredValue(search)

  const section = useMemo<LibrarySection>(() => {
    if (
      location.pathname.startsWith('/library/projects') ||
      location.pathname.startsWith('/library/collections')
    )
      return 'collections'
    if (location.pathname.startsWith('/library/likes')) return 'likes'
    if (location.pathname.startsWith('/library/trash')) return 'trash'
    return 'images'
  }, [location.pathname])

  useEffect(() => {
    try {
      localStorage.setItem(LIBRARY_VIEW_STORAGE_KEY, JSON.stringify(views))
    } catch {
      /* noop */
    }
  }, [views])

  useEffect(() => {
    try {
      localStorage.setItem(IMAGE_SORT_STORAGE_KEY, imageSort)
    } catch {
      /* noop */
    }
  }, [imageSort])

  useEffect(() => {
    try {
      localStorage.setItem(PROJECT_SORT_STORAGE_KEY, projectSort)
    } catch {
      /* noop */
    }
  }, [projectSort])

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

  const favoritePostsQuery = useQuery({
    queryKey: ['favorite-posts'],
    queryFn: () => studioApi.listFavoritePosts(),
    enabled: canLoadPrivate && section === 'likes',
  })

  async function invalidateLibrary() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['generations'] }),
      queryClient.invalidateQueries({ queryKey: ['favorite-posts'] }),
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

  const deleteGenerationMutation = useMutation({
    mutationFn: (generationId: string) => studioApi.deleteGeneration(generationId),
    onSuccess: invalidateLibrary,
  })

  const updatePostMutation = useMutation({
    mutationFn: ({
      postId,
      payload,
    }: {
      postId: string
      payload: { title?: string; visibility?: 'public' | 'private' }
    }) => studioApi.updatePost(postId, payload),
    onSuccess: async () => {
      setRenameState(null)
      await invalidateLibrary()
    },
  })

  const movePostMutation = useMutation({
    mutationFn: ({
      postId,
      projectId,
    }: {
      postId: string
      projectId: string
    }) => studioApi.movePost(postId, { project_id: projectId }),
    onSuccess: invalidateLibrary,
  })

  const trashPostMutation = useMutation({
    mutationFn: (postId: string) => studioApi.trashPost(postId),
    onSuccess: invalidateLibrary,
  })

  const unlikeFavoriteMutation = useMutation({
    mutationFn: (postId: string) => studioApi.unlikePost(postId),
    onSuccess: async () => {
      await invalidateLibrary()
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: (payload: {
      title: string
      description?: string
      surface?: 'compose' | 'chat'
    }) => studioApi.createProject(payload),
    onSuccess: async () => {
      await invalidateLibrary()
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({
      projectId,
      title,
      description,
    }: {
      projectId: string
      title: string
      description?: string
    }) => studioApi.updateProject(projectId, { title, description }),
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
    mutationFn: async ({
      projectId,
      title,
    }: {
      projectId: string
      title: string
    }) => {
      const blob = await studioApi.exportProject(projectId)
      await downloadBlob(
        blob,
        `${title.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() || 'project'}.zip`,
      )
    },
  })

  const menuBusy =
    permanentDeleteMutation.isPending ||
    emptyTrashMutation.isPending ||
    updatePostMutation.isPending ||
    movePostMutation.isPending ||
    trashPostMutation.isPending ||
    unlikeFavoriteMutation.isPending ||
    createProjectMutation.isPending ||
    updateProjectMutation.isPending ||
    deleteProjectMutation.isPending ||
    exportProjectMutation.isPending

  const assets = assetsQuery.data?.assets ?? []
  const projects = projectsQuery.data?.projects ?? []
  const generations = generationsQuery.data?.generations ?? []
  const favoritePosts = favoritePostsQuery.data?.posts ?? []
  const activeAssets = assets.filter((asset) => !asset.deleted_at)
  const trashedAssets = assets.filter((asset) => Boolean(asset.deleted_at))
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  )
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

    for (const asset of [...activeAssets].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )) {
      const metadata = asset.metadata as Record<string, unknown>
      const groupId = String(metadata.generation_id ?? asset.id)
      const project = projectMap.get(asset.project_id)
      const isChatOrigin = isChatProject(project)
      if (
        isChatOrigin &&
        metadataString(metadata, 'source') === 'upload' &&
        !asset.prompt.trim()
      ) {
        continue
      }
      const existing = groups.get(groupId)

      if (existing) {
        existing.items.push(asset)
        existing.derivedTags = Array.from(
          new Set([...existing.derivedTags, ...(asset.derived_tags ?? [])]),
        )
        continue
      }

      groups.set(groupId, {
        id: groupId,
        title: assetDisplayTitle(asset),
        prompt: asset.prompt || 'Saved Studio result',
        model: String(metadata.model ?? 'Image'),
        modelLabel: getCreativeProfileLabel(
          String(metadata.model ?? ''),
          String(
            metadata.display_model_label ?? metadata.model ?? 'Studio profile',
          ),
        ),
        derivedTags: asset.derived_tags ?? [],
        createdAt: asset.created_at,
        projectId: asset.project_id,
        projectTitle: isChatOrigin
          ? 'Chat session'
          : (project?.title ?? 'Project'),
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

  const readyGroups = useMemo(
    () => groupedAssets.filter((group) => group.libraryState === 'ready'),
    [groupedAssets],
  )

  const pendingGenerations = useMemo(
    () =>
      generations
        .filter(
          (generation) => generationLibraryState(generation) === 'generating',
        )
        .filter((generation) =>
          matchesQuery(
            deferredSearch,
            generation.title,
            generation.prompt_snapshot.prompt,
            generation.model,
          ),
        ),
    [deferredSearch, generations],
  )

  const attentionGenerations = useMemo(
    () =>
      generations
        .filter((generation) => {
          const state = generationLibraryState(generation)
          return state === 'failed' || state === 'blocked'
        })
        .filter(
          (generation) =>
            Date.now() - new Date(generation.created_at).getTime() <=
            1000 * 60 * 60 * 24 * 7,
        )
        .filter((generation) =>
          matchesQuery(
            deferredSearch,
            generation.display_title,
            generation.prompt_snapshot.prompt,
            generation.model,
          ),
        ),
    [deferredSearch, generations],
  )

  const blockedGroups = useMemo(
    () => groupedAssets.filter((group) => group.libraryState === 'blocked'),
    [groupedAssets],
  )

  const composeProjects = useMemo(
    () => projects.filter((project) => !isChatProject(project)),
    [projects],
  )

  const filteredImageGroups = useMemo(
    () =>
      readyGroups.filter((group) => {
        if (
          !matchesQuery(
            deferredSearch,
            group.title,
            group.prompt,
            group.model,
            group.projectTitle,
            ...group.derivedTags,
          )
        )
          return false
        if (imageFilter === 'recent')
          return (
            Date.now() - new Date(group.createdAt).getTime() <=
            1000 * 60 * 60 * 24 * 3
          )
        return true
      }),
    [deferredSearch, imageFilter, readyGroups],
  )

  const sortedImageGroups = useMemo(() => {
    const next = [...filteredImageGroups]
    next.sort((left, right) => {
      if (imageSort === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      }
      if (imageSort === 'name') {
        return left.title.localeCompare(right.title)
      }
      if (imageSort === 'model') {
        return (
          left.modelLabel.localeCompare(right.modelLabel) ||
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
    return next
  }, [filteredImageGroups, imageSort])

  const filteredProjects = useMemo(
    () =>
      composeProjects.filter((project) => {
        const projectAssets = assetsByProject.get(project.id) ?? []
        if (!matchesQuery(deferredSearch, project.title, project.description))
          return false
        if (collectionFilter === 'with-work') return projectAssets.length > 0
        if (collectionFilter === 'empty') return projectAssets.length === 0
        return true
      }),
    [assetsByProject, collectionFilter, composeProjects, deferredSearch],
  )

  const sortedProjects = useMemo(() => {
    const next = [...filteredProjects]
    next.sort((left, right) => {
      if (projectSort === 'name') return left.title.localeCompare(right.title)
      if (projectSort === 'newest') {
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      }
      if (projectSort === 'oldest') {
        return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      }
      return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    })
    return next
  }, [filteredProjects, projectSort])

  const filteredTrash = useMemo(
    () =>
      trashedAssets.filter((asset) => {
        if (!matchesQuery(deferredSearch, asset.title, asset.prompt))
          return false
        if (trashFilter === 'recent' && asset.deleted_at) {
          return (
            Date.now() - new Date(asset.deleted_at).getTime() <=
            1000 * 60 * 60 * 24 * 3
          )
        }
        return true
      }),
    [deferredSearch, trashFilter, trashedAssets],
  )

  const filteredFavoritePosts = useMemo(
    () =>
      favoritePosts.filter((post) => {
        const assetsForPost = favoritePostAssets(post)
        if (
          !matchesQuery(
            deferredSearch,
            favoritePostTitle(post),
            post.prompt,
            post.owner_display_name,
            post.owner_username,
            ...post.style_tags,
            ...assetsForPost.flatMap((asset) => [
              asset.display_title,
              asset.title,
              ...(asset.derived_tags ?? []),
            ]),
          )
        ) {
          return false
        }
        return true
      }),
    [deferredSearch, favoritePosts],
  )

  const projectGroupCounts = useMemo(() => {
    const next = new Map<string, number>()
    for (const group of readyGroups) {
      next.set(group.projectId, (next.get(group.projectId) ?? 0) + 1)
    }
    return next
  }, [readyGroups])

  const activeView = views[section]
  const totalImageCount = sortedImageGroups.reduce((sum, g) => sum + g.items.length, 0)
  const imageTotalPages = Math.max(1, Math.ceil(sortedImageGroups.length / IMAGE_PAGE_SIZE))
  const projectTotalPages = Math.max(1, Math.ceil(sortedProjects.length / PROJECT_PAGE_SIZE))
  const pagedImageGroups = useMemo(
    () =>
      sortedImageGroups.slice(
        (imagePage - 1) * IMAGE_PAGE_SIZE,
        imagePage * IMAGE_PAGE_SIZE,
      ),
    [imagePage, sortedImageGroups],
  )
  const pagedProjects = useMemo(
    () =>
      sortedProjects.slice(
        (projectPage - 1) * PROJECT_PAGE_SIZE,
        projectPage * PROJECT_PAGE_SIZE,
      ),
    [projectPage, sortedProjects],
  )
  const imageViewDescription =
    activeView === 'grid'
      ? `${totalImageCount} finished image${totalImageCount === 1 ? '' : 's'} across ${sortedImageGroups.length} set${sortedImageGroups.length === 1 ? '' : 's'}.`
      : `${totalImageCount} finished image${totalImageCount === 1 ? '' : 's'} in a quieter list view.`
  const favoriteViewDescription =
    activeView === 'grid'
      ? 'Saved references from Explore.'
      : 'Saved references with the full prompt and creator details.'
  const isBusy =
    permanentDeleteMutation.isPending || emptyTrashMutation.isPending

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-library-menu-root="true"]')) return
      setActionMenu(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    setImagePage(1)
  }, [deferredSearch, imageFilter, imageSort])

  useEffect(() => {
    setProjectPage(1)
  }, [collectionFilter, deferredSearch, projectSort])

  useEffect(() => {
    if (imagePage > imageTotalPages) {
      setImagePage(imageTotalPages)
    }
  }, [imagePage, imageTotalPages])

  useEffect(() => {
    if (projectPage > projectTotalPages) {
      setProjectPage(projectTotalPages)
    }
  }, [projectPage, projectTotalPages])

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

  const openChatWithAsset = (
    group: AssetGroup,
    asset: MediaAsset = group.items[0],
  ) => {
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
      body:
        error instanceof Error
          ? error.message
          : 'That action could not be completed.',
    })
  }

  const handleVisibilityChange = async (
    postId: string,
    visibility: 'public' | 'private',
  ) => {
    try {
      await updatePostMutation.mutateAsync({ postId, payload: { visibility } })
      setNoticeState({
        title:
          visibility === 'public'
            ? 'Image set is public'
            : 'Image set is private',
        body:
          visibility === 'public'
            ? 'This image set can now appear on public Studio surfaces.'
            : 'This image set is now hidden from public Studio surfaces.',
      })
    } catch (error) {
      handleMenuError(error)
    }
  }

  const handleDeleteGeneration = async (generation: Generation) => {
    try {
      await deleteGenerationMutation.mutateAsync(generation.job_id)
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

  const openFavoritePreview = (post: PublicPost, index = 0) => {
    setActionMenu(null)
    setFavoritePreviewState({ post, index })
  }

  const openCreateFromFavorite = (post: PublicPost) => {
    const leadAsset = favoritePostAssets(post)[0] ?? null
    const metadata = (leadAsset?.metadata ?? {}) as Record<string, unknown>
    const params: Record<string, string> = {
      prompt: post.prompt || favoritePostTitle(post),
      source: 'favorites',
    }
    const model = String(metadata.model ?? '').trim()
    if (model) params.model = model
    if (post.style_tags.length) {
      params.style_modifier = post.style_tags.slice(0, 4).join(', ')
    }
    openComposeWith(params)
  }

  const openFavoriteCreator = (post: PublicPost) => {
    navigate(`/u/${post.owner_username}`)
  }

  const handleRemoveFavorite = async (post: PublicPost) => {
    try {
      await unlikeFavoriteMutation.mutateAsync(post.id)
      setActionMenu(null)
      setFavoritePreviewState((current) =>
        current?.post.id === post.id ? null : current,
      )
      setNoticeState({
        title: 'Removed from Favorites',
        body: `"${favoritePostTitle(post)}" no longer appears in your saved references.`,
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

  const handleMoveGroups = async (
    postIds: string[],
    projectId: string,
    title: string,
  ) => {
    try {
      for (const postId of postIds) {
        await movePostMutation.mutateAsync({ postId, projectId })
      }
      const targetProject = composeProjects.find(
        (project) => project.id === projectId,
      )
      setNoticeState({
        title: 'Moved to project',
        body: targetProject
          ? `"${title}" now lives in "${targetProject.title}".`
          : `"${title}" was moved to another project.`,
      })
      setSelectedGroups(new Set())
    } catch (error) {
      handleMenuError(error)
    }
  }

  const openProjectComposer = (projectId: string) => {
    navigate(`/projects/${projectId}/create`)
  }

  const openProjectEditor = (
    project: Pick<Project, 'id' | 'title' | 'description'>,
    mode: 'create' | 'edit' = 'edit',
  ) => {
    setRenameState({
      kind: 'project',
      id: project.id,
      title: project.title,
      description: project.description,
      mode,
    })
  }

  const renderProjectMenu = (project: Project, projectAssets: MediaAsset[]) => {
    if (actionMenu !== `project:${project.id}`) return null

    return (
      <InlineActionMenu>
        <MenuAction
          onClick={() => {
            navigate(`/projects/${project.id}`)
            setActionMenu(null)
          }}
        >
          Open project
        </MenuAction>
        <MenuAction
          onClick={() => {
            openProjectComposer(project.id)
            setActionMenu(null)
          }}
        >
          Continue in Create
        </MenuAction>
        <MenuAction
          disabled={menuBusy}
          onClick={() => {
            openProjectEditor(project)
            setActionMenu(null)
          }}
        >
          Edit details
        </MenuAction>
        <MenuAction
          disabled={exportProjectMutation.isPending || projectAssets.length === 0}
          onClick={async () => {
            try {
              await exportProjectMutation.mutateAsync({
                projectId: project.id,
                title: project.title,
              })
              setActionMenu(null)
            } catch (error) {
              handleMenuError(error)
            }
          }}
        >
          Export archive
        </MenuAction>
        <MenuDivider />
        <MenuAction
          tone="danger"
          disabled={menuBusy}
          onClick={() => {
            setActionMenu(null)
            if (projectAssets.length > 0) {
              setNoticeState({
                title: 'Project still has work inside',
                body: 'Move or remove every image set before deleting this project.',
              })
              return
            }
            setConfirmState({
              kind: 'delete-project',
              projectId: project.id,
              title: project.title,
            })
          }}
        >
          Delete empty project
        </MenuAction>
      </InlineActionMenu>
    )
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
      try {
        await trashPostMutation.mutateAsync(id)
      } catch {
        /* continue */
      }
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
            <div
              className="relative h-3 w-3 rounded-full bg-[rgb(var(--primary-light))]"
              style={{ boxShadow: '0 0 12px rgb(var(--primary-light)/0.6)' }}
            />
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
      <AppPage className="max-w-[1700px] gap-3 py-3">
        {section === 'images' ? (
          <>
            <Toolbar
              title="My images"
              description={imageViewDescription}
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) =>
                setViews((current) => ({ ...current, images: view }))
              }
              filters={
                <FilterBar
                  options={imageFilters}
                  value={imageFilter}
                  onChange={setImageFilter}
                />
              }
              actions={
                <SortControl
                  value={imageSort}
                  options={imageSortOptions}
                  onChange={setImageSort}
                />
              }
            />

            {imageFilter === 'processing' && pendingGenerations.length ? (
              <section className="border-b border-white/[0.05] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[13px] font-semibold text-white">
                    In progress
                  </div>
                  <StatusPill tone="brand">
                    {pendingGenerations.length} running
                  </StatusPill>
                </div>
                <div
                  className={
                    activeView === 'grid'
                      ? 'mt-3 grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7'
                      : 'mt-3 divide-y divide-white/[0.06]'
                  }
                >
                  {pendingGenerations.map((generation) => (
                    <PendingPreview
                      key={generation.job_id}
                      generation={generation}
                      view={activeView}
                      state="generating"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {false && imageFilter !== 'processing' && blockedGroups.length ? (
              <section className="border-b border-white/[0.05] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[13px] font-semibold text-white">
                    Blocked
                  </div>
                  <StatusPill tone="warning">
                    {blockedGroups.length} locked
                  </StatusPill>
                </div>
                <div
                  className={
                    activeView === 'grid'
                      ? 'mt-3 grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7'
                      : 'mt-3 divide-y divide-white/[0.06]'
                  }
                >
                  {blockedGroups.map((group) => {
                    const asset = group.items[0]
                    return (
                      <div
                        key={group.id}
                        className={
                          activeView === 'grid'
                            ? 'space-y-1.5'
                            : 'group flex items-center gap-4 py-3'
                        }
                      >
                        <div
                          className={`relative overflow-hidden rounded-[10px] bg-[#111216] ${activeView === 'grid' ? '' : 'h-14 w-14 shrink-0'}`}
                        >
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
                            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
                              Blocked
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-white">
                            {group.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-amber-300/80">
                            Content blocked
                          </div>
                        </div>
                      </div>
                      )
                  })}
                </div>
              </section>
            ) : null}

            {imageFilter === 'processing' && attentionGenerations.length ? (
              <section className="border-b border-white/[0.05] pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[13px] font-semibold text-white">
                    Needs attention
                  </div>
                  <StatusPill tone="warning">
                    {attentionGenerations.length} issue
                    {attentionGenerations.length === 1 ? '' : 's'}
                  </StatusPill>
                </div>
                <div
                  className={
                    activeView === 'grid'
                      ? 'mt-3 grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7'
                      : 'mt-3 divide-y divide-white/[0.06]'
                  }
                >
                  {attentionGenerations.map((generation) => (
                    <PendingPreview
                      key={generation.job_id}
                      generation={generation}
                      view={activeView}
                      state={generationLibraryState(generation)}
                      onDelete={handleDeleteGeneration}
                      isDeleting={
                        deleteGenerationMutation.isPending &&
                        deleteGenerationMutation.variables === generation.job_id
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {assetsQuery.isLoading ? (
              <SkeletonImageGrid count={8} />
            ) : imageFilter === 'processing' ? (
              pendingGenerations.length || attentionGenerations.length ? null : (
                <EmptyInline
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Nothing is in flight right now."
                  description="Head to Create and start generating — your images will appear here while they're in progress."
                />
              )
            ) : sortedImageGroups.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {pagedImageGroups.map((group) => {
                    const leadAsset = group.items[0]
                    const isSelected = selectedGroups.has(group.id)
                    const menuId = `post:${group.id}`

                    return (
                      <article
                        key={group.id}
                        className={`group relative overflow-hidden rounded-[24px] bg-[#0f1015] ring-1 transition-[transform,box-shadow,border-color] duration-300 [content-visibility:auto] [contain-intrinsic-size:420px] ${
                          isSelected
                            ? 'ring-white/[0.16] shadow-[0_24px_60px_rgba(0,0,0,0.38)]'
                            : 'ring-white/[0.06] shadow-[0_18px_50px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:ring-white/[0.1] hover:shadow-[0_24px_60px_rgba(0,0,0,0.36)]'
                        }`}
                        style={{
                          boxShadow: isSelected
                            ? 'var(--border-glow), 0 24px 60px rgba(0,0,0,0.38)'
                            : '0 18px 50px rgba(0,0,0,0.28)',
                        }}
                      >
                        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                          <button
                            onClick={() => toggleGroupSelect(group.id)}
                            aria-label={
                              isSelected
                                ? `Deselect ${group.title}`
                                : `Select ${group.title}`
                            }
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
                              isSelected
                                ? 'border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light))] text-white'
                                : 'border-white/[0.14] bg-black/40 text-transparent hover:border-white/30'
                            }`}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            <svg
                              className="h-3 w-3"
                              fill="none"
                              viewBox="0 0 12 12"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2 6l3 3 5-5"
                              />
                            </svg>
                          </button>
                          {group.items.length > 1 ? (
                            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
                              {group.items.length} variations
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="absolute right-3 top-3 z-20"
                          data-library-menu-root="true"
                        >
                          <button
                            onClick={() =>
                              setActionMenu((current) =>
                                current === menuId ? null : menuId,
                              )
                            }
                            aria-label={`Open actions for ${group.title}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur-md ring-1 ring-white/[0.1] transition-colors hover:bg-black/50 hover:text-white"
                            title="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === menuId ? (
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
                                  setRenameState({
                                    kind: 'post',
                                    id: group.id,
                                    title: group.title,
                                  })
                                  setActionMenu(null)
                                }}
                              >
                                Rename
                              </MenuAction>
                              {!group.isChatOrigin ? (
                                <>
                                  <MenuAction
                                    onClick={() => {
                                      openComposeWith({
                                        prompt: group.prompt,
                                        model: group.model,
                                        projectId: group.projectId,
                                      })
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
                                  setMoveState({
                                    postIds: [group.id],
                                    currentProjectId: group.projectId,
                                    title: group.title,
                                    count: 1,
                                  })
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

                        <button
                          onClick={() => openPreview(group, 0)}
                          className="block w-full text-left"
                        >
                          <div className="relative aspect-[0.96] overflow-hidden bg-[#0c0d12]">
                            <ProtectedAssetImage
                              sources={assetPreviewSources(leadAsset)}
                              alt={assetDisplayTitle(leadAsset)}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,9,13,0.96)] via-[rgba(7,9,13,0.08)] to-transparent" />

                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 text-[15px] font-semibold tracking-tight text-white">
                                    {group.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-300/80">
                                    <span>{formatDate(group.createdAt)}</span>
                                    <span
                                      className="h-1 w-1 rounded-full bg-zinc-600"
                                      aria-hidden="true"
                                    />
                                    <span>{group.projectTitle}</span>
                                  </div>
                                </div>
                                {group.items.length > 1 ? (
                                  <div className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md ring-1 ring-white/[0.12]">
                                    Set of {group.items.length}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="min-w-0 flex-1">
                              <BrowseBadgeRow group={group} />
                            </div>
                          </div>
                        </button>
                      </article>
                    )
                  })}
                </section>
              ) : (
                <section className="space-y-3">
                  {pagedImageGroups.map((group) => {
                    const leadAsset = group.items[0]
                    const isSelected = selectedGroups.has(group.id)
                    const menuId = `post:${group.id}`
                    const listPreviewAssets = group.items.slice(0, 3)
                    const remainingPreviewCount = Math.max(
                      0,
                      group.items.length - listPreviewAssets.length,
                    )

                    return (
                      <section
                        key={group.id}
                        className="border-b border-white/[0.05] py-2"
                      >
                        <div
                          className={`flex items-center gap-3 rounded-[22px] px-2 py-2.5 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSelected ? 'bg-white/[0.04] ring-1 ring-white/[0.12]' : 'ring-1 ring-transparent hover:bg-white/[0.03] hover:ring-white/[0.08]'}`}
                        >
                          <button
                            onClick={() => toggleGroupSelect(group.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isSelected ? 'border-[rgb(var(--primary-light))] bg-[rgb(var(--primary-light))] text-white' : 'border-white/[0.15] bg-white/[0.03] text-transparent hover:border-white/30'}`}
                            title={isSelected ? 'Deselect' : 'Select'}
                          >
                            <svg
                              className="h-2.5 w-2.5"
                              fill="none"
                              viewBox="0 0 12 12"
                              stroke="currentColor"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2 6l3 3 5-5"
                              />
                            </svg>
                          </button>

                          <button
                            onClick={() => openPreview(group, 0)}
                            className="group/list-set flex min-w-0 flex-1 items-center gap-4 rounded-[20px] text-left transition-transform duration-300 active:scale-[0.99]"
                          >
                            <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[18px] bg-[#0c0d12] shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.08]">
                              <ProtectedAssetImage
                                sources={assetPreviewSources(leadAsset)}
                                alt={assetDisplayTitle(leadAsset)}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover/list-set:scale-[1.04]"
                                fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                              />
                              {group.items.length > 1 ? (
                                <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
                                  {group.items.length} variations
                                </div>
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-[15px] font-semibold tracking-tight text-white">
                                  {group.title}
                                </div>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-500">
                                <span>{formatDate(group.createdAt)}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span>{group.projectTitle}</span>
                                {group.items.length > 1 ? (
                                  <>
                                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                    <span>Variation set</span>
                                  </>
                                ) : null}
                              </div>
                              <BrowseBadgeRow group={group} limit={4} />
                            </div>
                          </button>

                          {group.items.length > 1 ? (
                            <div className="hidden xl:flex items-center gap-1.5">
                              {listPreviewAssets.map((asset, assetIndex) => (
                                <button
                                  key={asset.id}
                                  onClick={() => openPreview(group, assetIndex)}
                                  className="overflow-hidden rounded-[12px] bg-[#0c0d12] ring-1 ring-white/[0.06] transition-all duration-300 hover:scale-[1.03] hover:ring-white/[0.14]"
                                  title={`Open variation ${variantOrder(asset) + 1}`}
                                >
                                  <ProtectedAssetImage
                                    sources={assetPreviewSources(asset)}
                                    alt={assetDisplayTitle(asset)}
                                    className="h-12 w-12 object-cover"
                                    fallbackClassName="flex h-12 w-12 items-center justify-center bg-white/[0.04] text-zinc-600"
                                  />
                                </button>
                              ))}
                              {remainingPreviewCount > 0 ? (
                                <button
                                  onClick={() =>
                                    openPreview(group, listPreviewAssets.length)
                                  }
                                  className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-zinc-400 transition-colors hover:border-white/[0.14] hover:text-white"
                                  title="Open more variations"
                                >
                                  +{remainingPreviewCount}
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          <ChevronRight className="hidden h-4 w-4 shrink-0 text-zinc-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-zinc-400 md:block" />

                          <div
                            className="relative shrink-0"
                            data-library-menu-root="true"
                          >
                            <button
                              onClick={() =>
                                setActionMenu((current) =>
                                  current === menuId ? null : menuId,
                                )
                              }
                              aria-label={`Open actions for ${group.title}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                              title="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenu === menuId ? (
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
                                    setRenameState({
                                      kind: 'post',
                                      id: group.id,
                                      title: group.title,
                                    })
                                    setActionMenu(null)
                                  }}
                                >
                                  Rename
                                </MenuAction>
                                {!group.isChatOrigin ? (
                                  <>
                                    <MenuAction
                                      onClick={() => {
                                        openComposeWith({
                                          prompt: group.prompt,
                                          model: group.model,
                                          projectId: group.projectId,
                                        })
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
                                    setMoveState({
                                      postIds: [group.id],
                                      currentProjectId: group.projectId,
                                      title: group.title,
                                      count: 1,
                                    })
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
                                    await handleTrashGroup(
                                      group.id,
                                      group.title,
                                    )
                                    setActionMenu(null)
                                  }}
                                >
                                  Move to trash
                                </MenuAction>
                              </InlineActionMenu>
                            ) : null}
                          </div>
                        </div>
                      </section>
                    )
                  })}
                </section>
              )
            ) : (
              <EmptyInline
                icon={<ImageIcon className="h-4 w-4" />}
                title="No images yet."
                description="Finished images will appear here."
              />
            )}

            <PaginationControls
              page={imagePage}
              totalPages={imageTotalPages}
              onPageChange={setImagePage}
            />

            {/* Bulk action bar - Summoning Animation */}
            {selectedGroups.size > 0 && (
              <div className="pointer-events-none fixed inset-x-0 bottom-8 z-[100] flex justify-center px-4">
                <div
                  className="pointer-events-auto flex items-center gap-4 rounded-full bg-[#16181f]/80 px-6 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-2xl animate-tray-summon"
                  style={{
                    boxShadow:
                      'var(--border-glow), 0 20px 50px rgba(0,0,0,0.6)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--primary-light))] text-[12px] font-black text-white shadow-[0_0_12px_rgba(var(--primary-light),0.5)]">
                      {selectedGroups.size}
                    </div>
                    <span className="text-sm font-bold text-white tracking-tight">
                      Selected
                    </span>
                  </div>

                  <div className="h-4 w-px bg-white/10" />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSelectedGroups(
                          new Set(sortedImageGroups.map((g) => g.id)),
                        )
                      }
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-zinc-400 transition-all hover:bg-white/5 hover:text-white active:scale-95"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() =>
                        setMoveState({
                          postIds: Array.from(selectedGroups),
                          currentProjectId: '',
                          title:
                            selectedGroups.size === 1
                              ? (sortedImageGroups.find((group) => group.id === Array.from(selectedGroups)[0])?.title ?? 'Selected image set')
                              : `${selectedGroups.size} selected image sets`,
                          count: selectedGroups.size,
                        })
                      }
                      disabled={movePostMutation.isPending}
                      className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-bold text-zinc-100 ring-1 ring-white/[0.12] transition-all hover:bg-white/[0.1] active:scale-95 disabled:opacity-50"
                    >
                      Move to project
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
              description={`${composeProjects.length} project${composeProjects.length === 1 ? '' : 's'} for your campaigns, characters, and directions.`}
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) =>
                setViews((current) => ({ ...current, collections: view }))
              }
              filters={
                <FilterBar
                  options={collectionFilters}
                  value={collectionFilter}
                  onChange={setCollectionFilter}
                />
              }
              actions={
                <>
                  <SortControl
                    value={projectSort}
                    options={projectSortOptions}
                    onChange={setProjectSort}
                  />
                  <button
                    onClick={() =>
                      openProjectEditor(
                        { id: '', title: '', description: '' },
                        'create',
                      )
                    }
                    className="group inline-flex items-center gap-2 rounded-[20px] bg-white px-4 py-2 text-[12px] font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    New project
                  </button>
                </>
              }
            />

            {sortedProjects.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0] ?? null
                    const setCount = projectGroupCounts.get(project.id) ?? 0
                    const previewAssets = projectAssets.slice(1, 3)
                    const hasAssets = projectAssets.length > 0
                    const latestActivity = cover?.created_at ?? project.updated_at
                    return (
                      <article
                        key={project.id}
                        className="group flex h-full flex-col rounded-[24px] bg-[#0f1015] ring-1 ring-white/[0.06] p-3 transition-all duration-400 hover:-translate-y-1 hover:ring-white/[0.14] hover:shadow-[0_24px_50px_rgba(0,0,0,0.5)] hover:bg-[#13151c]"
                      >
                        <div className="relative" data-library-menu-root="true">
                          <div className="rounded-[18px] bg-white/[0.02] p-2 ring-1 ring-white/[0.04]">
                            {cover ? (
                              <Link
                                to={`/projects/${project.id}`}
                                className="grid gap-2 sm:grid-cols-[minmax(0,1.35fr)_104px]"
                              >
                                  <div className="overflow-hidden rounded-[16px] bg-[#0c0d12] ring-1 ring-white/[0.04]">
                                    <ProtectedAssetImage
                                      sources={assetPreviewSources(cover)}
                                      alt={project.title}
                                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-[1.08] group-hover:rotate-1"
                                      fallbackClassName="flex aspect-[4/3] w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                                    />
                                  </div>
                                <div className="grid grid-rows-2 gap-2">
                                  {Array.from({ length: 2 }, (_, index) => {
                                    const asset = previewAssets[index] ?? null
                                    return asset ? (
                                      <div
                                        key={asset.id}
                                        className="overflow-hidden rounded-[14px] bg-[#111216]"
                                      >
                                        <ProtectedAssetImage
                                          sources={assetPreviewSources(asset)}
                                          alt={assetDisplayTitle(asset)}
                                          className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                          fallbackClassName="flex aspect-[4/3] w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                                        />
                                      </div>
                                    ) : (
                                      <div
                                        key={`${project.id}-placeholder-${index}`}
                                        className="flex aspect-[4/3] items-center justify-center rounded-[14px] bg-[#111216] text-zinc-700"
                                      >
                                        <Folder className="h-4 w-4" />
                                      </div>
                                    )
                                  })}
                                </div>
                              </Link>
                            ) : (
                              <Link
                                to={`/projects/${project.id}`}
                                className="flex aspect-[4/3] flex-col items-center justify-center rounded-[16px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%)] bg-[#0c0d12] ring-1 ring-white/[0.04] text-center transition-all duration-500 group-hover:bg-[#111216]"
                              >
                                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.02)] transition-transform duration-500 group-hover:scale-110">
                                  <Folder className="h-5 w-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                                </div>
                                <div className="mt-4 text-[13px] font-semibold text-zinc-300 transition-colors group-hover:text-white">
                                  Empty project
                                </div>
                                <div className="mt-1.5 max-w-[14rem] text-[11px] leading-5 text-zinc-500">
                                  Waiting for the first image set.
                                </div>
                              </Link>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              setActionMenu((current) =>
                                current === `project:${project.id}`
                                  ? null
                                  : `project:${project.id}`,
                              )
                            }
                            className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-zinc-300 backdrop-blur-md ring-1 ring-white/10 transition-all duration-300 hover:bg-black/80 hover:text-white hover:ring-white/30 opacity-0 group-hover:opacity-100"
                            title="Project actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {renderProjectMenu(project, projectAssets)}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-zinc-300">
                            {hasAssets ? 'With work' : 'Empty'}
                          </span>
                          <span>
                            {setCount} set{setCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="min-w-0 pt-3">
                          <div className="truncate text-[15px] font-semibold text-white transition-colors group-hover:text-[rgb(var(--primary-light))]">
                            {project.title}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[12.5px] leading-6 text-zinc-500">
                            {project.description?.trim() ||
                              (hasAssets
                                ? 'Keep related selects together.'
                                : 'A fresh space for a new direction.')}
                          </div>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div className="min-w-0 text-[11.5px] leading-5 text-zinc-500">
                            <div>
                              {projectAssets.length} image
                              {projectAssets.length === 1 ? '' : 's'} kept together
                            </div>
                            <div className="truncate">
                              Updated {formatRelativeDate(latestActivity)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/projects/${project.id}`}
                              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-zinc-200 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
                            >
                              Open
                            </Link>
                            <button
                              onClick={() => openProjectComposer(project.id)}
                              className="rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-black transition hover:bg-zinc-200"
                            >
                              Continue
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </section>
              ) : (
                <section className="space-y-2 pt-2">
                  {pagedProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0] ?? null
                    const setCount = projectGroupCounts.get(project.id) ?? 0
                    const hasAssets = projectAssets.length > 0
                    const latestActivity = cover?.created_at ?? project.updated_at

                    return (
                      <article
                        key={project.id}
                        className="group flex items-center gap-4 rounded-[22px] border border-white/[0.04] bg-[#0c0d12]/78 px-3.5 py-3.5 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.03]"
                      >
                        <Link
                          to={`/projects/${project.id}`}
                          className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[16px] bg-[#111216] ring-1 ring-white/[0.06] shadow-md"
                        >
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
                        <Link
                          to={`/projects/${project.id}`}
                          className="min-w-0 flex-1"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-zinc-300">
                              {hasAssets ? 'With work' : 'Empty'}
                            </span>
                            <span>
                              {setCount} set{setCount === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className="mt-2 truncate text-[14px] font-bold text-white tracking-wide transition-colors duration-300 group-hover:text-[rgb(var(--primary-light))]">
                            {project.title}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-zinc-500">
                            {project.description?.trim() ||
                              (hasAssets
                                ? 'Keep related selects together.'
                                : 'A fresh space for a new direction.')}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-600">
                            <span>
                              {projectAssets.length} image
                              {projectAssets.length === 1 ? '' : 's'}
                            </span>
                            <span>Updated {formatRelativeDate(latestActivity)}</span>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <div className="hidden xl:flex items-center gap-2">
                            <Link
                              to={`/projects/${project.id}`}
                              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-zinc-200 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
                            >
                              Open
                            </Link>
                            <button
                              onClick={() => openProjectComposer(project.id)}
                              className="rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-black transition hover:bg-zinc-200"
                            >
                              Continue
                            </button>
                          </div>
                          <div
                            className="relative"
                            data-library-menu-root="true"
                          >
                            <button
                              onClick={() =>
                                setActionMenu((current) =>
                                  current === `project:${project.id}`
                                    ? null
                                    : `project:${project.id}`,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {renderProjectMenu(project, projectAssets)}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </section>
              )
            ) : (
              <section className="group relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/[0.04] bg-[#0c0d12]/50 px-8 py-20 text-center backdrop-blur-sm transition-all duration-700 hover:border-white/[0.08] hover:bg-[#101116]/80 hover:shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent_50%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#1c1d24]/90 to-[#0c0d12]/80 text-zinc-400 ring-1 ring-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-700 group-hover:scale-110 group-hover:text-white group-hover:ring-white/[0.18] group-hover:shadow-[0_0_30px_rgba(124,58,237,0.15)]">
                  <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_50%)]" />
                  <Folder className="relative z-10 h-7 w-7 drop-shadow-md" />
                </div>
                <h3 className="relative text-[18px] font-bold tracking-tight text-white/95 transition-colors group-hover:text-white">
                  No projects yet
                </h3>
                <p className="relative mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-zinc-500 transition-colors group-hover:text-zinc-400">
                  Start a named space for a campaign, character, or direction.
                </p>
                <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() =>
                      openProjectEditor(
                        { id: '', title: '', description: '' },
                        'create',
                      )
                    }
                    className="group/btn relative flex items-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3 text-[14px] font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_32px_rgba(255,255,255,0.4)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent translate-x-[-100%] transition-transform duration-700 group-hover/btn:translate-x-[100%]" />
                    <Folder className="h-4 w-4" />
                    Create project
                  </button>
                  <Link
                    to="/create"
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[14px] font-semibold text-zinc-200 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    Start in Create
                  </Link>
                </div>
              </section>
            )}

            <PaginationControls
              page={projectPage}
              totalPages={projectTotalPages}
              onPageChange={setProjectPage}
            />
          </>
        ) : null}

        {section === 'likes' ? (
          <>
            <Toolbar
              title="Favorites"
              description={favoriteViewDescription}
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) =>
                setViews((current) => ({ ...current, likes: view }))
              }
            />

            {favoritePostsQuery.isLoading ? (
              <SkeletonImageGrid count={6} />
            ) : filteredFavoritePosts.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredFavoritePosts.map((post) => {
                    const assetsForPost = favoritePostAssets(post)
                    const leadAsset = assetsForPost[0] ?? null
                    const menuId = `favorite:${post.id}`

                    return (
                      <article
                        key={post.id}
                        className="group relative overflow-hidden rounded-[24px] bg-[#0f1015] ring-1 ring-white/[0.06] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:ring-white/[0.1] hover:shadow-[0_24px_60px_rgba(0,0,0,0.36)]"
                      >
                        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
                            <Heart className="h-3 w-3 fill-current text-rose-400" />
                            Saved
                          </span>
                          {assetsForPost.length > 1 ? (
                            <span className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-md ring-1 ring-white/[0.12]">
                              {assetsForPost.length} previews
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="absolute right-3 top-3 z-20"
                          data-library-menu-root="true"
                        >
                          <button
                            onClick={() =>
                              setActionMenu((current) =>
                                current === menuId ? null : menuId,
                              )
                            }
                            aria-label={`Open actions for ${favoritePostTitle(post)}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur-md ring-1 ring-white/[0.1] transition-colors hover:bg-black/50 hover:text-white"
                            title="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === menuId ? (
                            <InlineActionMenu>
                              <MenuAction
                                onClick={() => {
                                  openFavoritePreview(post, 0)
                                  setActionMenu(null)
                                }}
                              >
                                Open
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openCreateFromFavorite(post)
                                  setActionMenu(null)
                                }}
                              >
                                Reuse prompt
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openFavoriteCreator(post)
                                  setActionMenu(null)
                                }}
                              >
                                View creator
                              </MenuAction>
                              <MenuDivider />
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={() => void handleRemoveFavorite(post)}
                              >
                                Remove favorite
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>

                        <button
                          onClick={() => openFavoritePreview(post, 0)}
                          className="block w-full text-left"
                        >
                          <div className="relative aspect-[0.96] overflow-hidden bg-[#0c0d12]">
                            {leadAsset ? (
                              <ProtectedAssetImage
                                sources={assetPreviewSources(leadAsset)}
                                alt={assetDisplayTitle(leadAsset)}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600">
                                <Heart className="h-8 w-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,9,13,0.96)] via-[rgba(7,9,13,0.08)] to-transparent" />

                            <div className="absolute inset-x-0 bottom-0 p-4">
                              <div className="flex items-end justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="line-clamp-2 text-[15px] font-semibold tracking-tight text-white">
                                    {favoritePostTitle(post)}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-300/80">
                                    <span>{formatDate(post.created_at)}</span>
                                    <span className="h-1 w-1 rounded-full bg-zinc-600" aria-hidden="true" />
                                    <span>{post.owner_display_name}</span>
                                  </div>
                                </div>
                                <div className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md ring-1 ring-white/[0.12]">
                                  {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-zinc-200">
                                  @{post.owner_username}
                                </span>
                                {post.style_tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={`${post.id}-${tag}`}
                                    className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-500"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-2 line-clamp-2 text-[12px] leading-6 text-zinc-500">
                                {post.prompt || favoritePostTitle(post)}
                              </div>
                            </div>
                          </div>
                        </button>
                      </article>
                    )
                  })}
                </section>
              ) : (
                <section className="space-y-3">
                  {filteredFavoritePosts.map((post) => {
                    const assetsForPost = favoritePostAssets(post)
                    const leadAsset = assetsForPost[0] ?? null
                    const menuId = `favorite:${post.id}`
                    const previewAssets = assetsForPost.slice(0, 3)
                    const remainingPreviewCount = Math.max(
                      0,
                      assetsForPost.length - previewAssets.length,
                    )

                    return (
                      <section
                        key={post.id}
                        className="border-b border-white/[0.05] py-2"
                      >
                        <div className="flex items-center gap-3 rounded-[22px] px-2 py-2.5 ring-1 ring-transparent transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.03] hover:ring-white/[0.08]">
                          <button
                            onClick={() => openFavoritePreview(post, 0)}
                            className="group/list-set flex min-w-0 flex-1 items-center gap-4 rounded-[20px] text-left transition-transform duration-300 active:scale-[0.99]"
                          >
                            <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[18px] bg-[#0c0d12] shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.08]">
                              {leadAsset ? (
                                <ProtectedAssetImage
                                  sources={assetPreviewSources(leadAsset)}
                                  alt={assetDisplayTitle(leadAsset)}
                                  className="h-full w-full object-cover transition-transform duration-500 group-hover/list-set:scale-[1.04]"
                                  fallbackClassName="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-zinc-600">
                                  <Heart className="h-8 w-8" />
                                </div>
                              )}
                              <div className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/[0.12]">
                                Saved
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate text-[15px] font-semibold tracking-tight text-white">
                                  {favoritePostTitle(post)}
                                </div>
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                                  {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium text-zinc-500">
                                <span>{formatDate(post.created_at)}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span>{post.owner_display_name}</span>
                                <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span>@{post.owner_username}</span>
                              </div>
                              <div className="mt-2 line-clamp-2 text-[12px] leading-6 text-zinc-500">
                                {post.prompt || favoritePostTitle(post)}
                              </div>
                              {post.style_tags.length ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {post.style_tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={`${post.id}-${tag}`}
                                      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-500"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </button>

                          {assetsForPost.length > 1 ? (
                            <div className="hidden xl:flex items-center gap-1.5">
                              {previewAssets.map((asset, assetIndex) => (
                                <button
                                  key={asset.id}
                                  onClick={() => openFavoritePreview(post, assetIndex)}
                                  className="overflow-hidden rounded-[12px] bg-[#0c0d12] ring-1 ring-white/[0.06] transition-all duration-300 hover:scale-[1.03] hover:ring-white/[0.14]"
                                  title={`Open preview ${assetIndex + 1}`}
                                >
                                  <ProtectedAssetImage
                                    sources={assetPreviewSources(asset)}
                                    alt={assetDisplayTitle(asset)}
                                    className="h-12 w-12 object-cover"
                                    fallbackClassName="flex h-12 w-12 items-center justify-center bg-white/[0.04] text-zinc-600"
                                  />
                                </button>
                              ))}
                              {remainingPreviewCount > 0 ? (
                                <button
                                  onClick={() => openFavoritePreview(post, previewAssets.length)}
                                  className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.03] text-[11px] font-semibold text-zinc-400 transition-colors hover:border-white/[0.14] hover:text-white"
                                  title="Open more previews"
                                >
                                  +{remainingPreviewCount}
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          <ChevronRight className="hidden h-4 w-4 shrink-0 text-zinc-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-zinc-400 md:block" />

                          <div
                            className="relative shrink-0"
                            data-library-menu-root="true"
                          >
                            <button
                              onClick={() =>
                                setActionMenu((current) =>
                                  current === menuId ? null : menuId,
                                )
                              }
                              aria-label={`Open actions for ${favoritePostTitle(post)}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                              title="Actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenu === menuId ? (
                              <InlineActionMenu>
                                <MenuAction
                                  onClick={() => {
                                    openFavoritePreview(post, 0)
                                    setActionMenu(null)
                                  }}
                                >
                                  Open
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    openCreateFromFavorite(post)
                                    setActionMenu(null)
                                  }}
                                >
                                  Reuse prompt
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    openFavoriteCreator(post)
                                    setActionMenu(null)
                                  }}
                                >
                                  View creator
                                </MenuAction>
                                <MenuDivider />
                                <MenuAction
                                  tone="danger"
                                  disabled={menuBusy}
                                  onClick={() => void handleRemoveFavorite(post)}
                                >
                                  Remove favorite
                                </MenuAction>
                              </InlineActionMenu>
                            ) : null}
                          </div>
                        </div>
                      </section>
                    )
                  })}
                </section>
              )
            ) : (
              <EmptyInline
                compact
                icon={<Heart className="h-4 w-4" />}
                title="No favorites yet."
                description="Like public work in Explore or Community and it will show up here as a reusable reference shelf."
              />
            )}
          </>
        ) : null}

        {section === 'trash' ? (
          <>
            <Toolbar
              title="Trash"
              description={filteredTrash.length ? `${filteredTrash.length} item${filteredTrash.length === 1 ? '' : 's'} awaiting permanent deletion. Restore anything you still need.` : 'Nothing in the trash right now.'}
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) =>
                setViews((current) => ({ ...current, trash: view }))
              }
              filters={
                <FilterBar
                  options={trashFilters}
                  value={trashFilter}
                  onChange={setTrashFilter}
                />
              }
              actions={
                filteredTrash.length ? (
                  <button
                    onClick={() =>
                      setConfirmState({
                        kind: 'empty-trash',
                        count: filteredTrash.length,
                      })
                    }
                    className="rounded-full bg-white/[0.05] px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Empty trash
                  </button>
                ) : null
              }
            />

            {filteredTrash.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7">
                  {filteredTrash.map((asset) => (
                    <div key={asset.id} className="space-y-1.5">
                      <div key={asset.id} className="relative rounded-[10px]">
                        <div className="overflow-hidden rounded-[10px] bg-white/[0.03]">
                          <img
                            src={asset.thumbnail_url ?? asset.url}
                            alt={asset.title}
                            className="aspect-square w-full object-cover opacity-75"
                          />
                        </div>
                        <div
                          className="absolute right-1.5 top-1.5"
                          data-library-menu-root="true"
                        >
                          <button
                            onClick={() =>
                              setActionMenu((current) =>
                                current === `trash:${asset.id}`
                                  ? null
                                  : `trash:${asset.id}`,
                              )
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-zinc-300 backdrop-blur transition hover:bg-black/60 hover:text-white"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
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
                                  setConfirmState({
                                    kind: 'permanent-delete',
                                    asset,
                                  })
                                  setActionMenu(null)
                                }}
                              >
                                Delete forever
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>
                      </div>
                      <div className="space-y-0.5 px-0.5">
                        <div className="truncate text-[12px] font-medium text-white/80">
                          {asset.title}
                        </div>
                        <div className="text-[10.5px] text-zinc-600">
                          Deleted{' '}
                          {asset.deleted_at
                            ? formatDate(asset.deleted_at)
                            : 'recently'}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>
              ) : (
                <section className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {filteredTrash.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex flex-wrap items-center gap-4 py-3"
                    >
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
                        <img
                          src={asset.thumbnail_url ?? asset.url}
                          alt={asset.title}
                          className="h-full w-full object-cover opacity-80"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">
                          {asset.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">
                          Deleted{' '}
                          {asset.deleted_at
                            ? formatDate(asset.deleted_at)
                            : 'recently'}
                        </div>
                      </div>
                      <div className="relative" data-library-menu-root="true">
                        <button
                          onClick={() =>
                            setActionMenu((current) =>
                              current === `trash:${asset.id}`
                                ? null
                                : `trash:${asset.id}`,
                            )
                          }
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
                                setConfirmState({
                                  kind: 'permanent-delete',
                                  asset,
                                })
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
              <EmptyInline
                compact
                icon={<Trash2 className="h-4 w-4" />}
                title="Trash is empty."
                description="Restore or permanently delete work here when you need to clean up."
              />
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
        busy={
          updatePostMutation.isPending ||
          updateProjectMutation.isPending ||
          createProjectMutation.isPending
        }
        onCancel={() => setRenameState(null)}
        onConfirm={async ({ title, description }) => {
          if (!renameState) return
          const nextTitle = title.trim()
          const nextDescription = description?.trim() || undefined

          if (!nextTitle) {
            return
          }

          if (renameState.kind === 'project' && renameState.mode === 'create') {
            try {
              const created = await createProjectMutation.mutateAsync({
                title: nextTitle,
                description: nextDescription,
                surface: 'compose',
              })
              setRenameState(null)
              setNoticeState({
                title: 'Project ready',
                body: `"${created.title}" was created and is ready for its first run.`,
              })
              navigate(`/projects/${created.id}/create`)
            } catch (error) {
              handleMenuError(error)
            }
            return
          }

          if (
            nextTitle === renameState.title &&
            (renameState.kind !== 'project' ||
              nextDescription === (renameState.description?.trim() || undefined))
          ) {
            setRenameState(null)
            return
          }

          try {
            if (renameState.kind === 'post') {
              await updatePostMutation.mutateAsync({
                postId: renameState.id,
                payload: { title: nextTitle },
              })
              return
            }
            if (!renameState.id) {
              setRenameState(null)
              return
            }
            await updateProjectMutation.mutateAsync({
              projectId: renameState.id,
              title: nextTitle,
              description: nextDescription,
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
        onSelect={(index) =>
          setPreviewState((current) =>
            current ? { ...current, index } : current,
          )
        }
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
            postIds: [previewState.group.id],
            currentProjectId: previewState.group.projectId,
            title: previewState.group.title,
            count: 1,
          })
          setPreviewState(null)
        }}
        onSetVisibility={async (visibility) => {
          if (!previewState) return
          await handleVisibilityChange(previewState.group.id, visibility)
        }}
        onTrash={async () => {
          if (!previewState) return
          await handleTrashGroup(
            previewState.group.id,
            previewState.group.title,
          )
          setPreviewState(null)
        }}
      />
      <FavoriteLightbox
        state={favoritePreviewState}
        busy={unlikeFavoriteMutation.isPending}
        onClose={() => setFavoritePreviewState(null)}
        onSelect={(index) =>
          setFavoritePreviewState((current) =>
            current ? { ...current, index } : current,
          )
        }
        onReusePrompt={() => {
          if (!favoritePreviewState) return
          openCreateFromFavorite(favoritePreviewState.post)
          setFavoritePreviewState(null)
        }}
        onOpenCreator={() => {
          if (!favoritePreviewState) return
          openFavoriteCreator(favoritePreviewState.post)
          setFavoritePreviewState(null)
        }}
        onRemoveFavorite={async () => {
          if (!favoritePreviewState) return
          await handleRemoveFavorite(favoritePreviewState.post)
        }}
      />
      <MovePostDialog
        state={moveState}
        projects={composeProjects}
        busy={movePostMutation.isPending}
        onClose={() => setMoveState(null)}
        onMove={async (projectId) => {
          if (!moveState) return
          await handleMoveGroups(moveState.postIds, projectId, moveState.title)
          setMoveState(null)
        }}
      />
    </>
  )
}
