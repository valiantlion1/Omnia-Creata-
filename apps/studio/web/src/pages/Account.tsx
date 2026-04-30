import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  Globe2,
  Grid2X2,
  ImagePlus,
  List,
  Lock,
  PenSquare,
  Settings,
  Trash2,
  X,
} from 'lucide-react'

import { useLightbox } from '@/components/Lightbox'
import { EmptyState, StatusPill, Surface } from '@/components/StudioPrimitives'
import { studioApi, type MediaAsset, type ProfilePayload, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'

type ViewMode = 'grid' | 'list'
type ArtworkCropPosition = 'top' | 'center' | 'bottom'

function normalizeArtworkCropPosition(value: string | null | undefined): ArtworkCropPosition {
  return value === 'top' || value === 'bottom' ? value : 'center'
}

function artworkObjectPosition(position: string | null | undefined) {
  switch (normalizeArtworkCropPosition(position)) {
    case 'top':
      return 'center 22%'
    case 'bottom':
      return 'center 78%'
    default:
      return 'center center'
  }
}

function assetPreviewSource(asset: MediaAsset | null | undefined) {
  return asset?.preview_url ?? asset?.thumbnail_url ?? asset?.url ?? null
}

function postPrimaryAsset(post: PublicPost) {
  const candidates = [post.cover_asset, ...post.preview_assets].filter(
    (asset): asset is MediaAsset => Boolean(asset && asset.deleted_at === null),
  )
  return candidates.find((asset) => asset.can_open !== false) ?? candidates[0] ?? null
}

function collectProfileAssets(posts: PublicPost[]) {
  const seen = new Set<string>()
  const assets: MediaAsset[] = []

  for (const post of posts) {
    const candidates = [post.cover_asset, ...post.preview_assets].filter(
      (asset): asset is MediaAsset => Boolean(asset && asset.deleted_at === null),
    )
    for (const asset of candidates) {
      if (seen.has(asset.id)) continue
      if (asset.can_open === false) continue
      seen.add(asset.id)
      assets.push(asset)
    }
  }

  return assets
}

function formatProfileDate(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function ActivityRow({
  post,
  ownProfile,
  onOpenPost,
}: {
  post: PublicPost
  ownProfile: boolean
  onOpenPost: (post: PublicPost) => void
}) {
  const asset = postPrimaryAsset(post)
  const preview = assetPreviewSource(asset)

  return (
    <article className="grid grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.06] py-3 last:border-b-0">
      <button
        type="button"
        disabled={!preview}
        onClick={() => onOpenPost(post)}
        className="overflow-hidden rounded-[14px] bg-white/[0.03] ring-1 ring-white/[0.08] transition hover:ring-[rgb(var(--primary-light))]/[0.26] disabled:cursor-default"
        aria-label={`Open ${post.title} preview`}
      >
        {preview ? (
          <img src={preview} alt={post.title} className="aspect-square w-full object-cover" />
        ) : (
          <div className="aspect-square w-full bg-white/[0.04]" />
        )}
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="block w-full truncate text-left text-[13px] font-semibold text-white transition hover:text-[rgb(var(--primary-light))]"
        >
          {post.title}
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span>{formatProfileDate(post.created_at) ?? 'Published'}</span>
          {ownProfile ? (
            <>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{post.visibility === 'public' ? 'Public' : 'Private'}</span>
            </>
          ) : null}
        </div>
      </div>
      <StatusPill tone="neutral">{post.like_count} likes</StatusPill>
    </article>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/35 p-1 ring-1 ring-white/10 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
          value === 'grid' ? 'text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]' : 'text-zinc-400 hover:text-white'
        }`}
        style={value === 'grid' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        title="Grid view"
      >
        <Grid2X2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
          value === 'list' ? 'text-white shadow-[0_6px_20px_rgba(0,0,0,0.35)]' : 'text-zinc-400 hover:text-white'
        }`}
        style={value === 'list' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ProfileEditorDialog({
  open,
  displayName,
  bio,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean
  displayName: string
  bio: string
  busy: boolean
  onCancel: () => void
  onConfirm: (payload: { display_name: string; bio: string }) => Promise<void>
}) {
  const [nextName, setNextName] = useState(displayName)
  const [nextBio, setNextBio] = useState(bio)

  useEffect(() => {
    if (!open) return
    setNextName(displayName)
    setNextBio(bio)
  }, [open, displayName, bio])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl" onClick={onCancel}>
      <div
        className="w-full max-w-xl rounded-[28px] border border-white/[0.08] bg-[#0d0f14]/96 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Edit profile</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400 ring-1 ring-white/8 transition hover:bg-white/[0.08] hover:text-white"
            title="Close editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Display name</span>
            <input
              value={nextName}
              onChange={(event) => setNextName(event.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.18] focus:bg-white/[0.05]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Bio</span>
            <textarea
              value={nextBio}
              onChange={(event) => setNextBio(event.target.value)}
              maxLength={220}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.18] focus:bg-white/[0.05]"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs leading-5 text-zinc-500">@username stays fixed.</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !nextName.trim()}
              onClick={() => onConfirm({ display_name: nextName.trim(), bio: nextBio.trim() })}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}
            >
              {busy ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArtworkPickerDialog({
  open,
  assets,
  currentAssetId,
  currentPosition,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean
  assets: MediaAsset[]
  currentAssetId: string | null
  currentPosition: string | null | undefined
  busy: boolean
  onClose: () => void
  onSelect: (assetId: string | null, position: ArtworkCropPosition) => Promise<void>
}) {
  const [draftAssetId, setDraftAssetId] = useState<string | null>(currentAssetId)
  const [draftPosition, setDraftPosition] = useState<ArtworkCropPosition>(normalizeArtworkCropPosition(currentPosition))

  useEffect(() => {
    if (!open) return
    setDraftAssetId(currentAssetId ?? assets[0]?.id ?? null)
    setDraftPosition(normalizeArtworkCropPosition(currentPosition))
  }, [assets, currentAssetId, currentPosition, open])

  if (!open) return null

  const draftAsset = assets.find((asset) => asset.id === draftAssetId) ?? null
  const draftPreview = assetPreviewSource(draftAsset)
  const cropOptions: Array<{ id: ArtworkCropPosition; label: string }> = [
    { id: 'top', label: 'Top' },
    { id: 'center', label: 'Center' },
    { id: 'bottom', label: 'Bottom' },
  ]

  const dialog = (
    <div className="fixed inset-0 z-[135] flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-5 backdrop-blur-xl sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[calc(100svh-2.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0d0f14]/96 shadow-[0_32px_100px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Profile artwork</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Choose and crop the header</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-zinc-400 ring-1 ring-white/8 transition hover:bg-white/[0.08] hover:text-white"
            title="Close artwork picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="min-w-0">
              <div className="relative aspect-[5/1.25] overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.03]">
                {draftPreview ? (
                  <img
                    src={draftPreview}
                    alt={draftAsset?.display_title ?? draftAsset?.title ?? 'Selected artwork'}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: artworkObjectPosition(draftPosition) }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                    Pick an image below.
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,12,0.04),rgba(6,8,12,0.55)_72%,rgba(6,8,12,0.82))]" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Header preview</div>
                    <div className="mt-1 truncate text-sm font-semibold text-white">
                      {draftAsset ? draftAsset.display_title ?? draftAsset.title : 'Automatic cover'}
                    </div>
                  </div>
                  <div className="hidden rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium text-white/70 ring-1 ring-white/[0.08] sm:block">
                    {draftPosition}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {cropOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={busy || !draftAsset}
                    onClick={() => setDraftPosition(option.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      draftPosition === option.id
                        ? 'bg-white text-black'
                        : 'border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-[22px] border border-white/[0.06] bg-white/[0.025] p-4">
              <div>
                <div className="text-sm font-semibold text-white">Crop focus</div>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Choose the image, then pick which vertical area should stay visible in the wide profile banner.
                </p>
                <div className="mt-4 text-xs text-zinc-600">{assets.length} image{assets.length === 1 ? '' : 's'} available</div>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busy || !draftAssetId}
                  onClick={() => onSelect(draftAssetId, draftPosition)}
                  className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Saving...' : 'Apply artwork'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSelect(null, 'center')}
                  className="rounded-full border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Use automatic cover
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => {
              const preview = assetPreviewSource(asset)
              const selected = draftAssetId === asset.id
              return (
              <button
                key={asset.id}
                type="button"
                disabled={busy}
                onClick={() => setDraftAssetId(asset.id)}
                aria-label={`Preview ${asset.display_title ?? asset.title} as profile artwork`}
                className={`group overflow-hidden rounded-[22px] border text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected ? 'border-[rgb(var(--primary-light))]/70 ring-2 ring-[rgb(var(--primary-light))]/25' : 'border-white/[0.08] hover:border-white/[0.18]'
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white/[0.03]">
                  {preview ? <img src={preview} alt={asset.display_title ?? asset.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : null}
                  {selected ? (
                    <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                      Selected
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1 bg-[#11131a] px-3 py-3">
                  <div className="truncate text-sm font-medium text-white">{asset.display_title ?? asset.title}</div>
                  <div className="truncate text-xs text-zinc-500">{asset.prompt}</div>
                </div>
              </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

function GalleryGrid({
  posts,
  ownProfile,
  view,
  onOpenPost,
}: {
  posts: PublicPost[]
  ownProfile: boolean
  view: ViewMode
  onOpenPost: (post: PublicPost) => void
}) {
  if (!posts.length) {
    return (
      <EmptyState
        title={ownProfile ? 'Nothing on your profile yet' : 'No public posts yet'}
        description={
          ownProfile
            ? 'Start in Create, then publish or keep the images you want here. Once something lands, you can also promote it into the profile header.'
            : "This creator hasn't published any images yet."
        }
        action={
          ownProfile ? (
            <Link
              to="/create"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Start creating
            </Link>
          ) : null
        }
      />
    )
  }

  if (view === 'list') {
    return (
      <div className="divide-y divide-white/[0.05]">
        {posts.map((post) => {
          const previewAsset = postPrimaryAsset(post)
          const preview = assetPreviewSource(previewAsset)
          return (
            <article key={post.id} className="grid gap-4 py-4 md:grid-cols-[132px_minmax(0,1fr)_auto] md:items-center">
              <button
                type="button"
                onClick={() => onOpenPost(post)}
                disabled={!preview}
                className="group relative overflow-hidden rounded-[20px] bg-white/[0.03] text-left ring-1 ring-white/[0.06] transition hover:ring-white/[0.14] disabled:cursor-default"
                aria-label={`Open ${post.title} preview`}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt={post.title}
                    className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="aspect-[4/5] w-full bg-white/[0.04]" />
                )}
              </button>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpenPost(post)}
                  className="block w-full truncate text-left text-base font-medium text-white transition hover:text-[rgb(var(--primary-light))]"
                >
                  {post.title}
                </button>
                <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-400">{post.prompt}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ownProfile ? (
                  <StatusPill tone={post.visibility === 'public' ? 'brand' : 'neutral'}>{post.visibility}</StatusPill>
                ) : null}
                <StatusPill tone="neutral">{post.like_count} likes</StatusPill>
              </div>
            </article>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => {
        const previewAsset = postPrimaryAsset(post)
        const preview = assetPreviewSource(previewAsset)
        return (
          <article key={post.id} className="group flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onOpenPost(post)}
              disabled={!preview}
              className="relative overflow-hidden rounded-[24px] bg-white/[0.02] text-left ring-1 ring-white/[0.08] transition duration-500 hover:ring-white/[0.16] hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)] disabled:cursor-default"
              aria-label={`Open ${post.title} preview`}
            >
              {preview ? (
                <img
                  src={preview}
                  alt={post.title}
                  className="aspect-[4/5] w-full object-cover transition duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                />
              ) : (
                <div className="aspect-[4/5] w-full bg-white/[0.04]" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/35 to-transparent" />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <StatusPill tone="neutral" className="bg-black/55 backdrop-blur-md">{post.like_count} likes</StatusPill>
                {ownProfile ? (
                  <StatusPill tone={post.visibility === 'public' ? 'brand' : 'neutral'} className="bg-black/55 backdrop-blur-md">
                    {post.visibility}
                  </StatusPill>
                ) : null}
              </div>
            </button>
            <div className="px-1">
              <button
                type="button"
                onClick={() => onOpenPost(post)}
                className="block w-full line-clamp-2 text-left text-base font-medium leading-6 text-white transition hover:text-[rgb(var(--primary-light))]"
              >
                {post.title}
              </button>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">{post.prompt}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function AccountSideRail({
  payload,
  usage,
  usageLabel,
  visibilityBusy,
  exportBusy,
  exportState,
  onVisibilityChange,
  onExportProfile,
}: {
  payload: ProfilePayload
  usage: ProfilePayload['profile']['usage_summary']
  usageLabel: string | null
  visibilityBusy: boolean
  exportBusy: boolean
  exportState: string | null
  onVisibilityChange: (visibility: 'public' | 'private') => void
  onExportProfile: () => void
}) {
  const activeDefaultVisibility = payload.profile.default_visibility ?? 'private'
  const planLabel = usage?.plan_label ?? payload.profile.plan.toUpperCase()
  const publicProfilePath = `/u/${payload.profile.username}`

  return (
    <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
      <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0d10]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-semibold text-white">Profile visibility</h2>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              New published work follows this default.
            </p>
          </div>
          <div className="flex rounded-full border border-white/[0.08] bg-black/35 p-1">
            <button
              type="button"
              disabled={visibilityBusy}
              onClick={() => onVisibilityChange('public')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                activeDefaultVisibility === 'public'
                  ? 'bg-[rgb(var(--primary-light))] text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Globe2 className="h-3 w-3" />
              Public
            </button>
            <button
              type="button"
              disabled={visibilityBusy}
              onClick={() => onVisibilityChange('private')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                activeDefaultVisibility === 'private'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="h-3 w-3" />
              Private
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0d10]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <h2 className="text-[14px] font-semibold text-white">Public page</h2>
        <Link
          to={publicProfilePath}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          Open public profile
        </Link>
      </section>

      <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0d10]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-white">Plan & billing</h2>
          <StatusPill tone={payload.profile.plan === 'pro' ? 'brand' : 'neutral'}>
            {planLabel}
          </StatusPill>
        </div>
        {usage ? (
          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[12px] text-zinc-500">Credits balance</div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">
                  {usage.credits_remaining.toLocaleString()}
                </div>
              </div>
              <Link
                to="/billing"
                className="inline-flex items-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-zinc-200 transition hover:bg-white/[0.08] hover:text-white"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Manage plan
              </Link>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-[rgb(var(--primary-light))]"
                style={{ width: `${Math.max(4, 100 - usage.progress_percent)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{usage.allowance.toLocaleString()} included</span>
              {usageLabel ? <span>Resets {usageLabel}</span> : null}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-white/[0.07] bg-[#0c0d10]/86 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <h2 className="text-[14px] font-semibold text-white">Account</h2>
        <div className="mt-3 divide-y divide-white/[0.06]">
          <button
            type="button"
            onClick={onExportProfile}
            disabled={exportBusy}
            className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex min-w-0 items-start gap-3">
              <Download className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              <span>
                <span className="block text-[13px] font-semibold text-zinc-100">Export my data</span>
                <span className="mt-1 block text-[12px] text-zinc-500">
                  {exportState ?? 'Download your profile archive.'}
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </button>
          <a
            href="mailto:founder@omniacreata.com?subject=Studio%20workspace%20deletion%20request"
            className="flex items-center justify-between gap-3 py-3 text-left transition hover:text-white"
          >
            <span className="flex min-w-0 items-start gap-3">
              <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              <span>
                <span className="block text-[13px] font-semibold text-red-200">Delete account</span>
                <span className="mt-1 block text-[12px] text-zinc-500">
                  Request deletion with billing and exports handled cleanly.
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
          </a>
        </div>
      </section>
    </aside>
  )
}

export default function AccountPage() {
  const { username } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const { openLightbox } = useLightbox()
  const [view, setView] = useState<ViewMode>('grid')
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [artworkPickerOpen, setArtworkPickerOpen] = useState(false)
  const [exportState, setExportState] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const ownAccount = !username
  const isPublicProfileRoute = Boolean(username)

  const optimisticPayload = useMemo<ProfilePayload | undefined>(() => {
    if (!ownAccount || !auth || !auth.identity) return undefined

    const allowance = Math.max(auth.plan?.monthly_credits || auth.credits?.remaining || 0, 0)
    const creditsRemaining = Math.max(auth.credits?.remaining || 0, 0)
    const consumedPercent = allowance ? Math.min(100, Math.max(0, Math.round(((allowance - creditsRemaining) / allowance) * 100))) : 0

    return {
      profile: {
        display_name: auth.identity.display_name ?? 'Guest',
        username: auth.identity.username ?? 'profile',
        avatar_url: auth.identity.avatar_url ?? null,
        bio: auth.identity.bio ?? '',
        plan: auth.identity.plan ?? 'free',
        default_visibility: auth.identity.default_visibility ?? 'public',
        featured_asset_id: null,
        featured_asset_position: 'center',
        usage_summary: {
          plan_label: auth.plan?.label ?? 'Free',
          credits_remaining: creditsRemaining,
          allowance,
          reset_at: null,
          progress_percent: consumedPercent,
        },
        public_post_count: 0,
      },
      featured_asset: null,
      posts: [],
      own_profile: true,
      can_edit: true,
    }
  }, [auth, ownAccount])

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { display_name?: string; bio?: string; default_visibility?: 'public' | 'private'; featured_asset_id?: string | null; featured_asset_position?: ArtworkCropPosition }) =>
      studioApi.updateMyProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
    },
  })

  const exportProfileMutation = useMutation({
    mutationFn: () => studioApi.exportProfile(),
  })

  const profileQuery = useQuery({
    queryKey: ['profile', username ?? 'me'],
    queryFn: () => (username ? studioApi.getProfile(username) : studioApi.getMyProfile()),
    enabled: username ? true : canLoadPrivate,
    placeholderData: optimisticPayload,
  })

  const rawPayload = (profileQuery.data as ProfilePayload | undefined) ?? optimisticPayload
  const payload = useMemo<ProfilePayload | undefined>(() => {
    if (!rawPayload || !isPublicProfileRoute) return rawPayload

    const publicPosts = rawPayload.posts.filter((post) => post.visibility === 'public')
    const publicAssetIds = new Set<string>()
    for (const post of publicPosts) {
      if (post.cover_asset?.id) publicAssetIds.add(post.cover_asset.id)
      for (const asset of post.preview_assets) {
        publicAssetIds.add(asset.id)
      }
    }
    const featured_asset =
      rawPayload.featured_asset && publicAssetIds.has(rawPayload.featured_asset.id)
        ? rawPayload.featured_asset
        : null

    return {
      ...rawPayload,
      featured_asset,
      posts: publicPosts,
      own_profile: false,
      can_edit: false,
      profile: {
        ...rawPayload.profile,
        default_visibility: null,
        featured_asset_id: null,
        usage_summary: null,
        public_post_count: rawPayload.profile.public_post_count,
      },
    }
  }, [isPublicProfileRoute, rawPayload])
  const usage = payload?.profile.usage_summary
  const usageLabel = useMemo(() => {
    if (!usage?.reset_at) return null
    return new Date(usage.reset_at).toLocaleDateString()
  }, [usage?.reset_at])

  const galleryAssets = useMemo(() => collectProfileAssets(payload?.posts ?? []), [payload?.posts])
  const featuredAsset = useMemo(() => {
    if (!payload) return null
    if (payload.own_profile) return payload.featured_asset ?? galleryAssets[0] ?? null
    const safeFeaturedAsset = payload.featured_asset && galleryAssets.some((asset) => asset.id === payload.featured_asset?.id)
    return safeFeaturedAsset ? payload.featured_asset : galleryAssets[0] ?? null
  }, [galleryAssets, payload])
  const featuredPreview = assetPreviewSource(featuredAsset)
  const activeDefaultVisibility = payload?.profile.default_visibility ?? null
  const pageTitle = payload?.own_profile
    ? 'Account'
    : payload?.profile.display_name
      ? `${payload.profile.display_name} - Creator profile`
      : 'Creator profile'
  const pageDescription = payload?.own_profile
    ? 'Your Omnia Creata Studio profile, plan, and public creations.'
    : `Public Omnia Creata Studio profile for @${payload?.profile.username ?? username ?? 'creator'}.`

  usePageMeta(pageTitle, pageDescription)

  const openFeaturedArtwork = () => {
    if (!featuredPreview || !featuredAsset || !payload) return
    openLightbox(featuredPreview, featuredAsset.display_title ?? featuredAsset.title, {
      title: featuredAsset.display_title ?? featuredAsset.title,
      prompt: featuredAsset.prompt,
      authorName: payload.profile.display_name,
      authorUsername: payload.profile.username,
    })
  }

  const openPostPreview = (post: PublicPost) => {
    const previewAsset = postPrimaryAsset(post)
    const preview = assetPreviewSource(previewAsset)
    if (!preview) return
    openLightbox(preview, post.title, {
      title: post.title,
      prompt: post.prompt,
      authorName: post.owner_display_name,
      authorUsername: post.owner_username,
      likes: post.like_count,
    })
  }

  const handleVisibilityChange = async (visibility: 'public' | 'private') => {
    if (!payload?.own_profile) return
    if (payload.profile.default_visibility === visibility) return
    await updateProfileMutation.mutateAsync({ default_visibility: visibility })
  }

  const handleExportProfile = async () => {
    try {
      setExportState(null)
      const data = await exportProfileMutation.mutateAsync()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `omnia-creata-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setExportState('Export downloaded.')
    } catch {
      setExportState('Export failed. Try again from Settings.')
    }
  }

  if (ownAccount && isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile...</div>
  }

  if (profileQuery.isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile...</div>
  }

  if (!payload) {
    return <div className="px-6 py-10 text-sm text-rose-300">Profile not found.</div>
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-5 px-4 pb-28 pt-5 md:px-5 md:pb-8 xl:px-6">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--primary-light))]/70">
            {payload.own_profile ? 'Account home' : 'Creator profile'}
          </div>
          <h1 className="mt-2 text-[2rem] font-bold tracking-tight text-white">
            {payload.own_profile ? 'Account' : payload.profile.display_name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            {payload.own_profile
              ? 'Manage your profile, public gallery, credits, exports, and account actions.'
              : payload.profile.bio || `@${payload.profile.username} public gallery.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payload.own_profile ? (
            <StatusPill tone={payload.profile.plan === 'pro' ? 'brand' : 'neutral'}>{payload.profile.plan.toUpperCase()}</StatusPill>
          ) : null}
          {payload.own_profile ? (
            <StatusPill tone={activeDefaultVisibility === 'public' ? 'brand' : 'neutral'}>
              {activeDefaultVisibility === 'public' ? 'Public default' : 'Private default'}
            </StatusPill>
          ) : null}
        </div>
      </header>

      <section className={`grid gap-5 ${payload.own_profile ? 'xl:grid-cols-[280px_minmax(0,1fr)_370px]' : 'xl:grid-cols-[280px_minmax(0,1fr)]'}`}>
          <aside className="xl:sticky xl:top-5 xl:self-start">
            <Surface tone="raised" className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Profile</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{payload.profile.display_name}</div>
                  <div className="mt-1 text-sm text-zinc-400">@{payload.profile.username}</div>
                </div>
                <div className="flex items-center gap-2">
                  {payload.own_profile ? (
                    <StatusPill tone={payload.profile.plan === 'pro' ? 'brand' : 'neutral'}>{payload.profile.plan.toUpperCase()}</StatusPill>
                  ) : null}
                  {featuredPreview ? (
                    <button
                      type="button"
                      onClick={openFeaturedArtwork}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition hover:border-white/[0.18]"
                      title="Open profile artwork"
                    >
                      <img
                        src={featuredPreview}
                        alt={featuredAsset?.display_title ?? featuredAsset?.title ?? 'Profile artwork'}
                        className="h-12 w-12 object-cover"
                        style={{ objectPosition: artworkObjectPosition(payload.profile.featured_asset_position) }}
                      />
                    </button>
                  ) : null}
                </div>
              </div>

              {payload.profile.bio ? <p className="text-sm leading-6 text-zinc-400">{payload.profile.bio}</p> : null}

              {payload.own_profile ? (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setProfileEditorOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                  >
                    <PenSquare className="h-4 w-4" />
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setArtworkPickerOpen(true)}
                    disabled={!galleryAssets.length}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Choose artwork
                  </button>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Featured artwork</div>
                  <div className="truncate text-sm text-white">{featuredAsset ? featuredAsset.display_title ?? featuredAsset.title : 'Automatic'}</div>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Published</div>
                  <div className="text-sm font-medium text-white">{payload.profile.public_post_count}</div>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    {payload.own_profile ? 'Default visibility' : 'Profile'}
                  </div>
                  {payload.own_profile ? (
                    <StatusPill tone={activeDefaultVisibility === 'public' ? 'brand' : 'neutral'}>
                      {activeDefaultVisibility === 'public' ? 'Public' : 'Private'}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Public profile</StatusPill>
                  )}
                </div>
              </div>
            </Surface>
          </aside>

          <Surface tone="raised" className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{payload.own_profile ? 'Gallery' : 'Public gallery'}</div>
                <div className="mt-1 text-sm text-zinc-500">{payload.posts.length} item{payload.posts.length === 1 ? '' : 's'}</div>
              </div>
              <div className="flex items-center gap-2">
                <ViewToggle value={view} onChange={setView} />
                {payload.own_profile ? (
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3.5 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                ) : null}
              </div>
            </div>

            <GalleryGrid posts={payload.posts} ownProfile={payload.own_profile} view={view} onOpenPost={openPostPreview} />
            {payload.posts.length ? (
              <section className="border-t border-white/[0.06] pt-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-white">Recent activity</h2>
                  <span className="text-[12px] text-zinc-500">
                    {payload.posts.length} published item{payload.posts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-2">
                  {payload.posts.slice(0, 5).map((post) => (
                    <ActivityRow
                      key={post.id}
                      post={post}
                      ownProfile={payload.own_profile}
                      onOpenPost={openPostPreview}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </Surface>

          {payload.own_profile ? (
            <AccountSideRail
              payload={payload}
              usage={usage ?? null}
              usageLabel={usageLabel}
              visibilityBusy={updateProfileMutation.isPending}
              exportBusy={exportProfileMutation.isPending}
              exportState={exportState}
              onVisibilityChange={(visibility) => {
                void handleVisibilityChange(visibility)
              }}
              onExportProfile={() => {
                void handleExportProfile()
              }}
            />
          ) : null}
      </section>

      <ProfileEditorDialog
        open={profileEditorOpen}
        displayName={payload.profile.display_name ?? ''}
        bio={payload.profile.bio ?? ''}
        busy={updateProfileMutation.isPending}
        onCancel={() => setProfileEditorOpen(false)}
        onConfirm={async ({ display_name, bio }) => {
          await updateProfileMutation.mutateAsync({ display_name, bio })
          setProfileEditorOpen(false)
        }}
      />

      <ArtworkPickerDialog
        open={artworkPickerOpen}
        assets={galleryAssets}
        currentAssetId={payload.profile.featured_asset_id}
        currentPosition={payload.profile.featured_asset_position}
        busy={updateProfileMutation.isPending}
        onClose={() => setArtworkPickerOpen(false)}
        onSelect={async (assetId, position) => {
          await updateProfileMutation.mutateAsync({ featured_asset_id: assetId, featured_asset_position: position })
          setArtworkPickerOpen(false)
        }}
      />
    </div>
  )
}
