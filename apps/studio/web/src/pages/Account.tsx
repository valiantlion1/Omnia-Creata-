import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid2X2, ImagePlus, List, PenSquare, Settings, X } from 'lucide-react'

import { useLightbox } from '@/components/Lightbox'
import { EmptyState, StatusPill, Surface } from '@/components/StudioPrimitives'
import { studioApi, type MediaAsset, type ProfilePayload, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'

type ViewMode = 'grid' | 'list'

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
              {busy ? 'Saving…' : 'Save profile'}
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
  busy,
  onClose,
  onSelect,
}: {
  open: boolean
  assets: MediaAsset[]
  currentAssetId: string | null
  busy: boolean
  onClose: () => void
  onSelect: (assetId: string | null) => Promise<void>
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 px-4 backdrop-blur-xl" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-[28px] border border-white/[0.08] bg-[#0d0f14]/96 p-6 shadow-[0_32px_100px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Profile artwork</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Choose from your Studio images</h2>
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onSelect(null)}
            className="rounded-full border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use automatic cover
          </button>
          <div className="text-xs text-zinc-500">{assets.length} image{assets.length === 1 ? '' : 's'}</div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const preview = assetPreviewSource(asset)
            const selected = currentAssetId === asset.id
            return (
              <button
                key={asset.id}
                type="button"
                disabled={busy}
                onClick={() => onSelect(asset.id)}
                aria-label={`Set ${asset.display_title ?? asset.title} as profile artwork`}
                className={`group overflow-hidden rounded-[22px] border text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected ? 'border-[rgba(124,58,237,0.6)] ring-2 ring-[rgba(124,58,237,0.3)]' : 'border-white/[0.08] hover:border-white/[0.18]'
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
  )
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

export default function AccountPage() {
  usePageMeta('Profile', 'Your Omnia Creata Studio profile and public creations.')
  const { username } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const { openLightbox } = useLightbox()
  const [view, setView] = useState<ViewMode>('grid')
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [artworkPickerOpen, setArtworkPickerOpen] = useState(false)
  const queryClient = useQueryClient()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const ownAccount = !username

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
    mutationFn: (payload: { display_name?: string; bio?: string; default_visibility?: 'public' | 'private'; featured_asset_id?: string | null }) =>
      studioApi.updateMyProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
    },
  })

  const profileQuery = useQuery({
    queryKey: ['profile', username ?? 'me'],
    queryFn: () => (username ? studioApi.getProfile(username) : studioApi.getMyProfile()),
    enabled: username ? true : canLoadPrivate,
    placeholderData: optimisticPayload,
  })

  const payload = (profileQuery.data as ProfilePayload | undefined) ?? optimisticPayload
  const usage = payload?.profile.usage_summary
  const usageLabel = useMemo(() => {
    if (!usage?.reset_at) return null
    return new Date(usage.reset_at).toLocaleDateString()
  }, [usage?.reset_at])

  const galleryAssets = useMemo(() => collectProfileAssets(payload?.posts ?? []), [payload?.posts])
  const featuredAsset = payload?.featured_asset ?? galleryAssets[0] ?? null
  const featuredPreview = assetPreviewSource(featuredAsset)
  const activeDefaultVisibility = payload?.profile.default_visibility ?? null

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

  if (ownAccount && isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile…</div>
  }

  if (profileQuery.isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile…</div>
  }

  if (!payload) {
    return <div className="px-6 py-10 text-sm text-rose-300">Profile not found.</div>
  }

  return (
    <div className="flex min-h-full flex-col pb-10">
      <div className="relative isolate min-h-[220px] overflow-hidden border-b border-white/[0.05]">
        {featuredPreview ? (
          <>
            <img src={featuredPreview} alt={featuredAsset?.display_title ?? featuredAsset?.title ?? payload.profile.display_name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,12,0.18),rgba(6,8,12,0.48)_28%,rgba(6,8,12,0.88)_78%,#090a0d)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,74,255,0.22),transparent_42%),linear-gradient(135deg,#11172a,#090a0d_72%)]" />
        )}
        <div className="absolute inset-0 opacity-[0.1] mix-blend-screen [background-image:radial-gradient(circle_at_top,rgba(255,255,255,0.22)_0,transparent_55%)]" />

        <div className="relative mx-auto flex h-full min-h-[220px] w-full max-w-[1180px] flex-col px-4 pb-6 pt-5 md:px-8">
          <div className="mt-auto flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
                {payload.own_profile ? 'Your profile' : 'Public profile'}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.12] bg-black/35 text-xl font-bold text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
                  {payload.profile.avatar_url ? (
                    <img src={payload.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (payload.profile.display_name || payload.profile.username).slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">{payload.profile.display_name}</h1>
                    <StatusPill tone={payload.profile.plan === 'pro' ? 'brand' : 'neutral'}>{payload.profile.plan.toUpperCase()}</StatusPill>
                  </div>
                  <div className="mt-1 text-sm font-medium text-zinc-300">@{payload.profile.username}</div>
                </div>
              </div>
              {payload.profile.bio ? <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">{payload.profile.bio}</p> : null}
            </div>

            {payload.own_profile ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProfileEditorOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/30 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/[0.08]"
                >
                  <PenSquare className="h-4 w-4" />
                  Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => setArtworkPickerOpen(true)}
                  disabled={!galleryAssets.length}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/30 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImagePlus className="h-4 w-4" />
                  {featuredPreview ? 'Change artwork' : 'Choose artwork'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-4 pt-6 md:px-8">
        <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-5 xl:self-start">
            <Surface tone="raised" className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Profile</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">{payload.profile.display_name}</div>
                  <div className="mt-1 text-sm text-zinc-400">@{payload.profile.username}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={payload.profile.plan === 'pro' ? 'brand' : 'neutral'}>{payload.profile.plan.toUpperCase()}</StatusPill>
                  {featuredPreview ? (
                    <button
                      type="button"
                      onClick={() => featuredAsset && openLightbox(featuredPreview, featuredAsset.display_title ?? featuredAsset.title, {
                        title: featuredAsset.display_title ?? featuredAsset.title,
                        prompt: featuredAsset.prompt,
                        authorName: payload.profile.display_name,
                        authorUsername: payload.profile.username,
                      })}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition hover:border-white/[0.18]"
                      title="Open profile artwork"
                    >
                      <img src={featuredPreview} alt={featuredAsset?.display_title ?? featuredAsset?.title ?? 'Profile artwork'} className="h-12 w-12 object-cover" />
                    </button>
                  ) : null}
                </div>
              </div>

              {payload.profile.bio ? <p className="text-sm leading-6 text-zinc-400">{payload.profile.bio}</p> : null}

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
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Default visibility</div>
                  {payload.own_profile ? (
                    <StatusPill tone={activeDefaultVisibility === 'public' ? 'brand' : 'neutral'}>
                      {activeDefaultVisibility === 'public' ? 'Public' : 'Private'}
                    </StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Public profile</StatusPill>
                  )}
                </div>
                {payload.own_profile && usage ? (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="space-y-3 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Credits</div>
                        <div className="text-sm font-medium text-white">{usage.credits_remaining}</div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${Math.max(4, 100 - usage.progress_percent)}%`,
                            background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{usage.allowance} included</span>
                        {usageLabel ? <span>{usageLabel}</span> : null}
                      </div>
                    </div>
                  </>
                ) : null}
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
          </Surface>
        </section>
      </div>

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
        busy={updateProfileMutation.isPending}
        onClose={() => setArtworkPickerOpen(false)}
        onSelect={async (assetId) => {
          await updateProfileMutation.mutateAsync({ featured_asset_id: assetId })
          setArtworkPickerOpen(false)
        }}
      />
    </div>
  )
}
