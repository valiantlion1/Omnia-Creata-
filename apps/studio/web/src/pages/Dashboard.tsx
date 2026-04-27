import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ChevronLeft, ChevronRight, Copy, Download, Globe, Grid2X2, Heart, Layers, Lock, MoreHorizontal, Search, Share2, SlidersHorizontal, Sparkles, Star, Users, X, Zap } from 'lucide-react'

import { AppPage, EmptyState, SkeletonMasonry, StatusPill } from '@/components/StudioPrimitives'
import { useLightbox } from '@/components/Lightbox'
import { studioGeneratedAssets } from '@/data/studioGeneratedAssets'
import { studioApi, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'
import { usePageMeta } from '@/lib/usePageMeta'

function AuthPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0c0d12]/60 p-8 shadow-[0_36px_120px_-20px_rgba(0,0,0,0.8),0_0_40px_rgba(255,255,255,0.03)] backdrop-blur-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.12] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/[0.06]">
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
            Create an account to continue
          </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Sign up to save favorites, start in Create, and keep your work inside Studio. Creator and Pro add the chat surface when you want it.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-full border border-white/[0.12] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ─── welcome overlay ─── */
function WelcomeOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  const quickPointers = [
    {
      id: 'explore',
      label: 'Explore for references',
      body: 'Use the feed when you need direction, atmosphere, or examples before a run.',
      icon: Sparkles,
    },
    {
      id: 'create',
      label: 'Create to run',
      body: 'Write the prompt, choose quality, pick a format, and run directly into your library.',
      icon: Zap,
    },
    {
      id: 'save',
      label: 'Save what works',
      body: 'Keep strong outputs in your library so you can revisit, refine, and share without losing the thread.',
      icon: Heart,
    },
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-lg" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#0c0d12]/60 p-8 shadow-[0_36px_120px_-20px_rgba(0,0,0,0.8),0_0_40px_rgba(255,255,255,0.03)] backdrop-blur-3xl md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition hover:bg-white/[0.12] hover:text-white"
          title="Skip"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
            <Sparkles className="h-6 w-6 text-cyan-400" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Welcome to Studio</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Your account is ready. Start in Create when you want a direct image run, then come back to Explore and Library whenever you need direction or context.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-zinc-400">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-zinc-300">Free account: Create</span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-zinc-500">Creator / Pro: Chat</span>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {quickPointers.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-white/[0.12]"
              >
                <Icon className="h-5 w-5 text-cyan-400" />
                <div className="mt-3 text-lg font-semibold text-white">{item.label}</div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{item.body}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/create?welcome=1"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Start in Create
          </Link>
          <button
            onClick={onClose}
            className="rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  )
}

type ExploreSort = 'trending' | 'newest' | 'top' | 'styles'
type GalleryTab = 'community' | 'showcase' | 'atmospheres'
type ShowcaseDisplay = 'hero' | 'landscape' | 'portrait' | 'softPortrait' | 'detail'

const sortOptions: Array<{ id: ExploreSort; label: string }> = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'top', label: 'Top liked' },
  { id: 'styles', label: "Editors' picks" },
]

const galleryTabs: Array<{ id: GalleryTab; label: string; icon: typeof Globe; desc: string }> = [
  { id: 'showcase', label: 'Showcase', icon: Star, desc: 'Curated references' },
  { id: 'atmospheres', label: 'Atmospheres', icon: Layers, desc: 'Mood & style boards' },
  { id: 'community', label: 'Community', icon: Globe, desc: 'Live creator feed' },
]

type ShowcaseReference = {
  id: string
  src: string
  label: string
  tag: string
  prompt: string
  likes: number
  createdAt: string
  display: ShowcaseDisplay
  focus?: string
  mood?: string
}

const showcaseDisplayClasses: Record<ShowcaseDisplay, { tile: string; frame: string }> = {
  hero: {
    tile: 'sm:col-span-2 xl:col-span-2',
    frame: 'aspect-[16/10]',
  },
  landscape: {
    tile: 'sm:col-span-2 xl:col-span-2',
    frame: 'aspect-[16/9]',
  },
  portrait: {
    tile: 'sm:col-span-1 xl:col-span-1',
    frame: 'aspect-[4/5]',
  },
  softPortrait: {
    tile: 'sm:col-span-1 xl:col-span-1',
    frame: 'aspect-[5/6]',
  },
  detail: {
    tile: 'sm:col-span-1 xl:col-span-1',
    frame: 'aspect-square',
  },
}

const showcaseDisplayOrder: Array<ShowcaseReference['display']> = [
  'hero',
  'portrait',
  'landscape',
  'hero',
  'softPortrait',
  'softPortrait',
  'detail',
  'portrait',
  'hero',
  'detail',
  'landscape',
  'landscape',
]

const showcaseReferences: ShowcaseReference[] = studioGeneratedAssets.map((asset, index) => ({
  id: `showcase-${asset.id}`,
  src: asset.src,
  label: asset.label,
  tag: asset.tag,
  prompt: asset.prompt,
  likes: [248, 205, 192, 273, 196, 214, 131, 188, 224, 177, 219, 166][index],
  createdAt: `2026-04-${String(12 - (index % 8)).padStart(2, '0')}T${String(10 + (index % 8)).padStart(2, '0')}:00:00Z`,
  display: showcaseDisplayOrder[index],
  focus: asset.focus,
}))

const atmosphereDisplayOrder: Array<ShowcaseReference['display']> = [
  'portrait',
  'hero',
  'landscape',
  'detail',
  'softPortrait',
  'portrait',
  'hero',
  'detail',
  'landscape',
  'softPortrait',
  'hero',
  'landscape',
]

const atmosphereReferences: ShowcaseReference[] = studioGeneratedAssets.map((asset, index) => ({
  id: `atm-${asset.id}`,
  src: asset.src,
  label: asset.label,
  tag: asset.tag,
  mood: asset.mood,
  prompt: asset.prompt,
  likes: [184, 231, 173, 205, 221, 166, 214, 197, 244, 152, 188, 139][index],
  createdAt: `2026-04-${String(18 - (index % 8)).padStart(2, '0')}T${String(12 + (index % 8)).padStart(2, '0')}:00:00Z`,
  display: atmosphereDisplayOrder[index],
  focus: asset.focus,
}))

function matchesExploreQuery(query: string, ...parts: Array<string | null | undefined>) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
}

function sortCuratedReferences(items: ShowcaseReference[], sort: ExploreSort) {
  const sorted = [...items]

  if (sort === 'newest') {
    return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  if (sort === 'top') {
    return sorted.sort((a, b) => b.likes - a.likes)
  }

  if (sort === 'styles') {
    return sorted.sort((a, b) => `${a.tag} ${a.label}`.localeCompare(`${b.tag} ${b.label}`))
  }

  return sorted
}

function getReferenceHandle(item: ShowcaseReference) {
  return `${item.tag.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'omnia'}_visions`
}

function getReferenceSeed(item: ShowcaseReference) {
  return item.id.split('').reduce((total, char) => total + char.charCodeAt(0), 81736291)
}

function PostCard({
  post,
  locked,
  onLike,
  onOpen,
}: {
  post: PublicPost
  locked: boolean
  onLike: (post: PublicPost) => void
  onOpen: (post: PublicPost) => void
}) {
  const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []
  const heroAsset = previewAssets[0] ?? null
  return (
    <article className="group relative mb-2 break-inside-avoid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.05)]">
      <div className="relative overflow-hidden rounded-[12px] bg-[#0e1014] ring-1 ring-white/[0.04] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:ring-white/[0.15]">
        <button type="button" onClick={() => onOpen(post)} className="block w-full text-left">
          {heroAsset ? (
            <img
              src={heroAsset.thumbnail_url ?? heroAsset.url}
              alt={heroAsset.title}
              className="w-full h-auto object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-square bg-white/[0.03]" />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/85 opacity-0 transition duration-300 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end px-3 pb-3 opacity-0 transition duration-300 group-hover:opacity-100">
            {post.prompt || post.title ? (
              <div className="line-clamp-2 text-[12px] font-medium leading-snug text-white/95 drop-shadow-md">
                {post.prompt ? post.prompt : post.title}
              </div>
            ) : null}
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-zinc-300">
              <span className="font-semibold text-white/90">@{post.owner_username}</span>
            </div>
          </div>
        </button>

        {previewAssets.length > 1 && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm opacity-0 transition group-hover:opacity-100">
            {previewAssets.length}
          </div>
        )}

        <div className="absolute right-2 top-2 opacity-0 transition duration-300 group-hover:opacity-100">
          <button
            onClick={() => onLike(post)}
            className={locked
              ? 'inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm ring-1 ring-white/10 transition hover:bg-black/70'
              : `inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold backdrop-blur-sm ring-1 transition ${
                  post.viewer_has_liked
                    ? 'bg-white text-black ring-white'
                    : 'bg-black/55 text-white/90 ring-white/10 hover:bg-black/75'
                }`}
          >
            {locked ? <Lock className="h-3 w-3" /> : <Heart className={`h-3 w-3 ${post.viewer_has_liked ? 'fill-current text-rose-500' : ''}`} />}
            <span>{post.like_count}</span>
          </button>
        </div>
      </div>
    </article>
  )
}

function ExploreLightbox({
  post,
  open,
  onClose,
  onLike,
  locked,
}: {
  post: PublicPost | null
  open: boolean
  onClose: () => void
  onLike: (post: PublicPost) => void
  locked: boolean
}) {
  const [assetIndex, setAssetIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setAssetIndex(0)
    setCopied(false)
  }, [post?.id])

  useEffect(() => {
    if (!open) return undefined
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (!post) return
      const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []
      if (!previewAssets.length) return
      if (event.key === 'ArrowRight') {
        setAssetIndex((current) => (current + 1) % previewAssets.length)
      }
      if (event.key === 'ArrowLeft') {
        setAssetIndex((current) => (current - 1 + previewAssets.length) % previewAssets.length)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, open, post])

  if (!open || !post) return null

  const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []
  const activeAsset = previewAssets[assetIndex] ?? previewAssets[0] ?? null
  const canStep = previewAssets.length > 1
  const authorInitial = (post.owner_display_name || post.owner_username).charAt(0).toUpperCase()

  const copyPrompt = () => {
    if (!post.prompt) return
    navigator.clipboard.writeText(post.prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex bg-black/90 backdrop-blur-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-zinc-400 ring-1 ring-white/[0.1] backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 hover:bg-white/[0.1] hover:text-white"
        title="Close (ESC)"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Image area */}
      <div
        className="flex flex-1 items-center justify-center p-4 md:p-10 relative min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        {activeAsset ? (
          <img
            src={activeAsset.url}
            alt={activeAsset.title}
            className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]"
            style={{ animation: 'oc-img-reveal 0.55s cubic-bezier(0.16,1,0.3,1) both' }}
          />
        ) : (
          <div className="flex min-h-[420px] items-center justify-center text-sm text-zinc-500">No preview available</div>
        )}

        {canStep && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAssetIndex((c) => (c - 1 + previewAssets.length) % previewAssets.length) }}
              className="absolute left-4 md:left-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 ring-1 ring-white/[0.1] backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 hover:bg-white/[0.1] hover:text-white"
              title="Previous (←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAssetIndex((c) => (c + 1) % previewAssets.length) }}
              className="absolute right-4 md:right-6 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white/90 ring-1 ring-white/[0.1] backdrop-blur-md transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110 hover:bg-white/[0.1] hover:text-white"
              title="Next (→)"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white/80 ring-1 ring-white/[0.08] backdrop-blur-sm">
              {assetIndex + 1} / {previewAssets.length}
            </div>
          </>
        )}
      </div>

      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[320px] shrink-0 flex-col gap-5 border-l border-white/[0.05] bg-[#08090b] p-6 overflow-y-auto"
        style={{ animation: 'oc-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Author */}
        <Link
          to={`/u/${post.owner_username}`}
          className="flex items-center gap-3 pb-5 border-b border-white/[0.05] transition hover:opacity-90"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)/0.4), rgb(var(--accent)/0.3))' }}
          >
            {authorInitial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">
              {post.owner_display_name || post.owner_username}
            </div>
            <div className="text-[12px] text-zinc-500">@{post.owner_username}</div>
          </div>
        </Link>

        {/* Title */}
        {post.title && (
          <h2 className="text-base font-semibold text-white/90 leading-snug">{post.title}</h2>
        )}

        {/* Prompt */}
        {post.prompt && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Prompt</div>
            <p className="text-[13px] leading-[1.7] text-zinc-400 whitespace-pre-wrap">{post.prompt}</p>
            <button
              type="button"
              onClick={copyPrompt}
              className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-200"
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copied' : 'Copy prompt'}
            </button>
          </div>
        )}

        {/* Tags */}
        {post.style_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.style_tags.slice(0, 6).map((tag) => (
              <StatusPill key={tag} tone="neutral" className="text-[10px]">
                {tag}
              </StatusPill>
            ))}
          </div>
        )}

        {/* Date */}
        <div className="text-[11px] text-zinc-600">
          {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        {/* Actions */}
        <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={() => onLike(post)}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              locked
                ? 'bg-white/[0.05] text-zinc-300 ring-1 ring-white/[0.08] hover:bg-white/[0.08]'
                : post.viewer_has_liked
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/[0.06] text-white ring-1 ring-white/[0.08] hover:bg-white/[0.1] hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Heart className={`h-4 w-4 ${post.viewer_has_liked ? 'fill-current text-rose-500' : ''}`} />}
            <span>{post.like_count} {post.like_count === 1 ? 'like' : 'likes'}</span>
          </button>
          <Link
            to={`/u/${post.owner_username}`}
            className="inline-flex items-center justify-center rounded-full bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-300 ring-1 ring-white/[0.06] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/[0.08] hover:text-white hover:scale-[1.02] active:scale-[0.98]"
          >
            View @{post.owner_username}
          </Link>
        </div>

        {/* Thumbnail strip */}
        {canStep && (
          <div className="flex gap-1.5 overflow-x-auto border-t border-white/[0.05] pt-4">
            {previewAssets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setAssetIndex(index)}
                className={`shrink-0 overflow-hidden rounded-md transition ${
                  index === assetIndex ? 'ring-2 ring-white/90' : 'opacity-55 hover:opacity-100'
                }`}
              >
                <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  )
}

function CuratedInspector({
  item,
  copied,
  onCopy,
  onOpen,
}: {
  item: ShowcaseReference | null
  copied: boolean
  onCopy: (item: ShowcaseReference) => void
  onOpen: (item: ShowcaseReference) => void
}) {
  if (!item) return null

  const referenceTags = Array.from(new Set([
    item.tag,
    ...(item.mood ?? item.tag)
      .split(/[-,/]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  ])).slice(0, 4)
  const referenceHandle = getReferenceHandle(item)
  const referenceDate = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const shareReference = () => {
    const shareUrl = `${window.location.origin}/explore?reference=${encodeURIComponent(item.id)}`

    if (navigator.share) {
      void navigator.share({ title: item.label, text: item.prompt, url: shareUrl }).catch(() => undefined)
      return
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(shareUrl).catch(() => undefined)
    }
  }

  return (
    <aside
      data-testid="curated-inspector"
      className="order-1 xl:order-2 xl:sticky xl:top-5 xl:self-start"
      aria-label="Selected reference details"
    >
      <div className="sticky top-3 z-20 overflow-hidden rounded-[24px] border border-[#d7ae68]/22 bg-[linear-gradient(180deg,rgba(18,14,9,0.98),rgba(8,8,7,0.98))] p-2 shadow-[0_18px_46px_-30px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.05)] xl:hidden">
        <div className="flex gap-3">
          <div className="h-20 w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#0a0908]">
            <img
              src={item.src}
              alt={item.label}
              loading="eager"
              style={item.focus ? { objectPosition: item.focus } : undefined}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1 py-1 pr-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e4b765]">Details</div>
            <div className="mt-1 truncate text-sm font-semibold text-white">{item.label}</div>
            <div className="mt-1 line-clamp-1 text-[11px] leading-5 text-zinc-400">{item.prompt}</div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="inline-flex items-center justify-center rounded-full bg-[#e5ad56] px-3 py-1.5 text-[11px] font-semibold text-[#100c07] transition hover:bg-[#f1c16d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1bf67]/35"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => onCopy(item)}
                className="inline-flex items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden rounded-[26px] border border-[#d7ae68]/18 bg-[linear-gradient(180deg,rgba(17,14,10,0.96),rgba(7,7,6,0.98))] p-4 shadow-[0_30px_90px_-54px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.045)] xl:block">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-white">Details</h2>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] text-zinc-500">
            <X className="h-4 w-4" />
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="group mt-4 block w-full overflow-hidden rounded-[18px] border border-[#d7ae68]/14 bg-[#0a0908] text-left transition hover:border-[#f1bf67]/38"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <img
              src={item.src}
              alt={item.label}
              loading="eager"
              style={item.focus ? { objectPosition: item.focus } : undefined}
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_16%,rgba(255,217,145,0.14),transparent_34%),linear-gradient(180deg,transparent_44%,rgba(5,4,3,0.82)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e4b765]">{item.tag}</div>
              <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">{item.label}</div>
            </div>
          </div>
        </button>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onCopy(item)}
            className="flex h-10 items-center justify-center rounded-xl border border-[#d7ae68]/13 bg-[#14100b] text-[#f1bf67] transition hover:border-[#f1bf67]/32 hover:bg-[#1c150c]"
            title="Copy prompt"
          >
            <Copy className="h-4 w-4" />
          </button>
          <a
            href={item.src}
            download={`${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'omnia-reference'}.png`}
            className="flex h-10 items-center justify-center rounded-xl border border-[#d7ae68]/13 bg-[#14100b] text-[#f1bf67] transition hover:border-[#f1bf67]/32 hover:bg-[#1c150c]"
            title="Download image"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={shareReference}
            className="flex h-10 items-center justify-center rounded-xl border border-[#d7ae68]/13 bg-[#14100b] text-[#f1bf67] transition hover:border-[#f1bf67]/32 hover:bg-[#1c150c]"
            title="Share reference"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex h-10 items-center justify-center rounded-xl border border-[#d7ae68]/13 bg-[#14100b] text-[#f1bf67] transition hover:border-[#f1bf67]/32 hover:bg-[#1c150c]"
            title="More details"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 border-t border-[#d7ae68]/10 pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9d7f50]">Prompt</div>
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#e4b765] transition hover:text-[#fff0bd]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-300/92">{item.prompt}</p>
        </div>

        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9d7f50]">Styles</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {referenceTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#d7ae68]/20 bg-[#d7ae68]/[0.055] px-2.5 py-1 text-[11px] font-medium text-[#f0c878]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 border-t border-[#d7ae68]/10 pt-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9d7f50]">Info</div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d7ae68]/25 bg-[#1c150c]">
                <img src={item.src} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{referenceHandle}</div>
                <div className="mt-0.5 text-[11px] text-zinc-500">{item.likes.toLocaleString()} saves</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCopy(item)}
              className="rounded-lg border border-[#d7ae68]/18 px-3 py-1.5 text-[11px] font-semibold text-[#e4b765] transition hover:bg-[#d7ae68]/10"
            >
              Follow
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-[#e4b765]" />
              {(item.likes * 8).toLocaleString()}
            </span>
            <span>{Math.max(18, Math.round(item.likes / 3))} comments</span>
            <span>{referenceDate}</span>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-[#d7ae68]/10 pt-5 text-[12px]">
          {[
            ['Model', 'Omnia Model 1.2'],
            ['Aspect ratio', item.display === 'portrait' || item.display === 'softPortrait' ? '4:5' : '16:9'],
            ['Resolution', item.display === 'portrait' || item.display === 'softPortrait' ? '1024 x 1280' : '1344 x 768'],
            ['Seed', String(getReferenceSeed(item))],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-right text-zinc-300">{value}</dd>
            </div>
          ))}
        </dl>

        <button
          type="button"
          onClick={() => onOpen(item)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d7ae68]/18 bg-[#d7ae68]/[0.07] px-4 py-3 text-sm font-semibold text-[#f6ddaa] transition hover:border-[#f1bf67]/38 hover:bg-[#d7ae68]/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1bf67]/30"
        >
          Open details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}

export default function DashboardPage() {
  usePageMeta('Explore — Omnia Creata Studio', 'Curated image-generation references and community work from Omnia Creata Studio.')
  const location = useLocation()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const { openLightbox } = useLightbox()

  const [galleryTab, setGalleryTab] = useState<GalleryTab>('showcase')
  const [sort, setSort] = useState<ExploreSort>('trending')
  const [curatedLayout, setCuratedLayout] = useState<'mosaic' | 'dense'>('mosaic')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReferenceId, setSelectedReferenceId] = useState(showcaseReferences[0]?.id ?? '')
  const [copiedReferenceId, setCopiedReferenceId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<PublicPost | null>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)

  const canUseAccount = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const activeCuratedReferences = galleryTab === 'atmospheres' ? atmosphereReferences : showcaseReferences
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const curatedReferences = useMemo(() => {
    const filtered = activeCuratedReferences.filter((item) =>
      matchesExploreQuery(normalizedSearch, item.label, item.tag, item.prompt, item.mood, item.focus),
    )

    return sortCuratedReferences(filtered, sort)
  }, [activeCuratedReferences, normalizedSearch, sort])
  const selectedReference =
    galleryTab === 'community'
      ? null
      : curatedReferences.find((item) => item.id === selectedReferenceId) ?? curatedReferences[0] ?? null
  const curatedSummary =
    galleryTab === 'atmospheres'
      ? `${curatedReferences.length} mood boards for direction and texture`
      : `${curatedReferences.length} curated Studio references`
  const isNewUser = new URLSearchParams(location.search).get('welcome') === '1'
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    if (galleryTab === 'community') return
    const source = galleryTab === 'atmospheres' ? atmosphereReferences : showcaseReferences
    if (source.some((item) => item.id === selectedReferenceId)) return
    setSelectedReferenceId(source[0]?.id ?? '')
  }, [galleryTab, selectedReferenceId])

  useEffect(() => {
    if (isNewUser && canUseAccount && !sessionStorage.getItem('omnia_welcome_shown')) {
      setShowWelcome(true)
      sessionStorage.setItem('omnia_welcome_shown', '1')
    }
  }, [isNewUser, canUseAccount])

  const postsQuery = useQuery({
    queryKey: ['public-posts', sort, auth?.identity.id ?? 'guest'],
    queryFn: () => studioApi.listPublicPosts(sort),
  })

  const toggleLikeMutation = useMutation({
    mutationFn: async (post: PublicPost) => {
      if (post.viewer_has_liked) {
        return studioApi.unlikePost(post.id)
      }
      return studioApi.likePost(post.id)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['public-posts'] })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const posts = postsQuery.data?.posts ?? []

  const filteredPosts = useMemo(() => {
    return posts.filter((post: PublicPost) =>
      matchesExploreQuery(
        normalizedSearch,
        post.prompt,
        post.title,
        post.owner_display_name,
        post.owner_username,
        ...post.style_tags,
        post.cover_asset?.display_title,
        post.cover_asset?.title,
        ...(post.cover_asset?.derived_tags ?? []),
      ),
    )
  }, [normalizedSearch, posts])
  const curatedGridClass = curatedLayout === 'dense'
    ? 'grid auto-flow-dense grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6 2xl:grid-cols-8 xl:gap-3'
    : 'grid auto-flow-dense grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 xl:gap-3'

  const handleLike = (post: PublicPost) => {
    if (!canUseAccount) {
      setStudioPostAuthRedirect('/explore')
      setAuthPromptOpen(true)
      return
    }
    toggleLikeMutation.mutate(post)
  }

  const handleTabChange = (tab: GalleryTab) => {
    setGalleryTab(tab)
    setSearchQuery('')
    setCopiedReferenceId(null)
    if (tab === 'showcase') setSelectedReferenceId(showcaseReferences[0]?.id ?? '')
    if (tab === 'atmospheres') setSelectedReferenceId(atmosphereReferences[0]?.id ?? '')
  }

  const openReferenceDetails = (item: ShowcaseReference) => {
    openLightbox(item.src, item.label, {
      title: item.label,
      authorName: 'OmniaCreata',
      authorUsername: 'studio',
      prompt: item.prompt,
    })
  }

  const copyReferencePrompt = (item: ShowcaseReference) => {
    const markCopied = () => {
      setCopiedReferenceId(item.id)
      window.setTimeout(() => setCopiedReferenceId(null), 1800)
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(item.prompt).then(markCopied).catch(markCopied)
      return
    }

    markCopied()
  }

  return (
    <AppPage className="max-w-[1780px] gap-0 py-4 md:py-5">

      {/* ── Tab Bar ── */}
      <section className="mb-4 overflow-hidden rounded-[30px] border border-[#d7ae68]/18 bg-[linear-gradient(180deg,rgba(16,13,9,0.88),rgba(6,6,5,0.9))] px-4 py-4 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.045)] md:px-6 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl font-semibold tracking-[-0.055em] text-white md:text-5xl">
              Explore
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#c5b79f]">
              Curated inspiration from the community and beyond.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:flex sm:items-center sm:overflow-x-auto sm:pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {galleryTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = galleryTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    aria-label={tab.label}
                    aria-pressed={isActive}
                    className={`relative flex w-full items-center justify-center gap-1.5 px-1 pb-2 text-[12px] font-medium transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-auto sm:shrink-0 sm:gap-2 sm:text-[14px] ${
                      isActive
                        ? 'text-[#ffd073]'
                        : 'text-[#c9bca7]/78 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#e5ad56]" /> : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-[620px] xl:items-end">
            <div className="flex w-full items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#d7ae68]/18 bg-black/28 px-3.5 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-[#a88852]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search prompts, styles, creators..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none"
                />
                {searchQuery ? (
                  <button type="button" onClick={() => setSearchQuery('')} className="shrink-0 text-zinc-500 transition hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSort('trending')
                  setCuratedLayout('mosaic')
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#d7ae68]/18 bg-black/28 text-[#d9b26f] transition hover:border-[#f1bf67]/35 hover:bg-[#d7ae68]/10"
                title="Reset filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 xl:justify-end">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSort(option.id)}
                  aria-pressed={sort === option.id}
                  className={`rounded-xl border px-3.5 py-2 text-[12px] font-medium transition ${
                    sort === option.id
                      ? 'border-[#e5ad56]/50 bg-[#d7ae68]/12 text-[#ffd073]'
                      : 'border-[#d7ae68]/12 bg-black/22 text-[#b9ad99] hover:border-[#d7ae68]/28 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#d7ae68]/12 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-[#d7ae68]/12 bg-black/22 px-4 py-2 text-[12px] text-[#b9ad99]">All media</span>
            <span className="rounded-xl border border-[#d7ae68]/12 bg-black/22 px-4 py-2 text-[12px] text-[#b9ad99]">All styles</span>
          </div>
          {galleryTab !== 'community' ? (
            <div className="flex rounded-xl border border-[#d7ae68]/12 bg-black/24 p-1">
              <button
                type="button"
                onClick={() => setCuratedLayout('mosaic')}
                aria-pressed={curatedLayout === 'mosaic'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${curatedLayout === 'mosaic' ? 'bg-[#d7ae68]/16 text-[#ffd073]' : 'text-[#8f826d] hover:text-white'}`}
                title="Mosaic layout"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCuratedLayout('dense')}
                aria-pressed={curatedLayout === 'dense'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${curatedLayout === 'dense' ? 'bg-[#d7ae68]/16 text-[#ffd073]' : 'text-[#8f826d] hover:text-white'}`}
                title="Dense layout"
              >
                <Layers className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Community Tab ── */}
      {galleryTab === 'community' && (
        <section className="space-y-4">
          {postsQuery.isLoading ? (
            <SkeletonMasonry count={18} />
          ) : filteredPosts.length > 0 ? (
            <>
              <div className="px-0.5 text-[11px] font-medium text-zinc-500">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'result' : 'results'}
                {searchQuery ? ` for "${searchQuery}"` : ''}
                {' / '}{sortOptions.find((o) => o.id === sort)?.label ?? 'Trending'}
              </div>
              <div className="columns-2 gap-2 sm:columns-3 md:columns-4 xl:columns-5 2xl:columns-6 [column-fill:_balance]">
                {filteredPosts.map((post: PublicPost) => (
                  <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} onOpen={setSelectedPost} />
                ))}
              </div>
              {filteredPosts.length <= 6 && (
                <div className="mt-8 overflow-hidden rounded-[30px] border border-white/[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[0_22px_70px_-40px_rgba(4,10,18,0.55)] md:p-5">
                  <div className="grid gap-5 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
                    <div className="max-w-xl">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                        Direction shelf
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.045em] text-white md:text-[1.9rem]">
                        Need a starting point?
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        When the community feed is quiet, use curated references to pick a mood before opening Create.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setGalleryTab('showcase')}
                          className="rounded-full bg-[rgba(232,239,246,0.94)] px-4 py-2 text-sm font-semibold text-[#0f1720] transition hover:opacity-92"
                        >
                          Open Showcase
                        </button>
                        <button
                          type="button"
                          onClick={() => setGalleryTab('atmospheres')}
                          className="rounded-full border border-white/[0.08] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                        >
                          Browse Atmospheres
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {showcaseReferences.slice(1, 5).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openLightbox(item.src, item.label, {
                            title: item.label,
                            authorName: 'OmniaCreata',
                            authorUsername: 'studio',
                            prompt: item.prompt,
                          })}
                          className="group relative aspect-[4/5] overflow-hidden rounded-[20px] border border-white/[0.05] bg-[#10151d] text-left"
                        >
                          <img
                            src={item.src}
                            alt={item.label}
                            loading="lazy"
                            style={item.focus ? { objectPosition: item.focus } : undefined}
                            className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1017]/82 via-transparent to-transparent" />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                            <div className="text-[11px] font-semibold text-white">{item.label}</div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400">{item.tag}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : searchQuery ? (
            <div className="py-8">
              <EmptyState
                title={`No results for "${searchQuery}"`}
                description="Try different prompt words, creator names, or style tags."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-[34px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] shadow-[0_24px_80px_-36px_rgba(4,10,18,0.5)]">
              <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[1.02fr_0.98fr] xl:items-center">
                <div className="flex flex-col items-center text-center xl:items-start xl:text-left">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Community feed</div>
                  <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(188,209,229,0.16),rgba(146,184,214,0.06))]">
                    <Users className="h-7 w-7 text-zinc-300" />
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-white md:text-[2.2rem]">
                    Nothing is live here yet
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400 md:text-[15px]">
                    Start in Create, publish the work you want the community to see, then come back here when you want the public shelf to feel alive.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3 xl:justify-start">
                    <Link
                      to={canUseAccount ? '/create' : '/signup'}
                      className="inline-flex items-center gap-2 rounded-full bg-[rgba(232,239,246,0.95)] px-6 py-3 text-sm font-semibold text-[#0f1720] transition hover:opacity-92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    >
                      {canUseAccount ? 'Open Create' : 'Create account'}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setGalleryTab('showcase')}
                      className="rounded-full border border-white/[0.08] px-6 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      See curated references
                    </button>
                  </div>
                </div>

                <div>
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
                    {showcaseReferences.slice(0, 3).map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openLightbox(item.src, item.label, {
                          title: item.label,
                          authorName: 'OmniaCreata',
                          authorUsername: 'studio',
                          prompt: item.prompt,
                        })}
                        className={`group relative overflow-hidden rounded-[24px] border border-white/[0.05] bg-[#141922] text-left shadow-[0_18px_40px_-30px_rgba(4,10,18,0.42)] ${index === 0 ? 'sm:col-span-2 sm:aspect-[16/10]' : 'aspect-[4/5]'}`}
                      >
                        <img
                          src={item.src}
                          alt={item.label}
                          loading="lazy"
                          style={item.focus ? { objectPosition: item.focus } : undefined}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f141b]/88 via-[#0f141b]/16 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{item.tag}</div>
                          <div className="mt-1 text-sm font-semibold text-white">{item.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Showcase Tab ── */}
      {(galleryTab === 'showcase' || galleryTab === 'atmospheres') && (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
          <CuratedInspector
            item={selectedReference}
            copied={copiedReferenceId === selectedReference?.id}
            onCopy={copyReferencePrompt}
            onOpen={openReferenceDetails}
          />

          <div className="order-2 min-w-0 overflow-hidden rounded-[28px] border border-[#d7ae68]/16 bg-[linear-gradient(180deg,rgba(10,9,7,0.9),rgba(4,4,3,0.94))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] xl:order-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d9b26f]">
                  {galleryTab === 'atmospheres' ? 'Atmosphere board' : 'Showcase wall'}
                </div>
                <div className="mt-1 text-[12px] text-zinc-500">{curatedSummary}</div>
              </div>
              <div className="rounded-full border border-[#d7ae68]/14 bg-black/28 px-3 py-1.5 text-[11px] text-[#9f927e]">
                Select a visual to inspect it
              </div>
            </div>
          <div
            data-testid={galleryTab === 'showcase' ? 'showcase-grid' : 'atmosphere-grid'}
            className={curatedGridClass}
          >
            {curatedReferences.length > 0 ? curatedReferences.map((item) => {
              const display = showcaseDisplayClasses[item.display]
              const isSelected = selectedReference?.id === item.id
              return (
              <article
                key={item.id}
                data-showcase-layout={item.display}
                className={`group relative ${display.tile}`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedReferenceId(item.id)}
                  onDoubleClick={() => openReferenceDetails(item)}
                  aria-label={`Select ${item.label} ${galleryTab === 'atmospheres' ? 'atmosphere' : 'showcase'} piece`}
                  aria-pressed={isSelected}
                  className={`relative block w-full overflow-hidden rounded-[22px] bg-[#0b0a08] text-left transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_26px_70px_-34px_rgba(0,0,0,0.9),0_0_32px_rgba(213,159,75,0.08)] ${
                    isSelected
                      ? 'ring-2 ring-[#f1bf67]/80 shadow-[0_24px_80px_-38px_rgba(229,173,86,0.7)]'
                      : 'ring-1 ring-white/[0.065] hover:ring-[#d7ae68]/35'
                  }`}
                >
                  <div className={`w-full overflow-hidden ${display.frame}`}>
                    <img
                      src={item.src}
                      alt={item.label}
                      loading="lazy"
                      style={item.focus ? { objectPosition: item.focus } : undefined}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.045]"
                    />
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,221,157,0.12),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.12)_42%,rgba(5,4,3,0.88)_100%)] opacity-85 transition group-hover:opacity-100" />

                  <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-[#f1bf67]/22 bg-black/48 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d28b] backdrop-blur-md">
                    {item.tag}
                  </div>

                  {isSelected ? (
                    <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#e5ad56] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#100c07]">
                      Selected
                    </div>
                  ) : null}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end px-4 pb-4 sm:pr-20">
                    <div className="text-[13px] font-semibold leading-snug text-white drop-shadow-md">{item.label}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-200/80">
                      {item.mood ?? item.prompt}
                    </div>
                  </div>

                  <div className="pointer-events-none absolute right-3 bottom-3 hidden items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[10px] text-white/85 ring-1 ring-white/10 backdrop-blur-sm sm:flex">
                    <Heart className="h-3 w-3 text-[#e4b765]" />
                    <span>{item.likes}</span>
                  </div>
                </button>
              </article>
            )}) : (
              <div className="col-span-full py-10">
                <EmptyState
                  title={`No references for "${searchQuery}"`}
                  description="Try a different style, genre, or prompt word."
                />
              </div>
            )}
          </div>
          </div>

        </section>
      )}

      <WelcomeOverlay open={showWelcome} onClose={() => setShowWelcome(false)} />
      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
      
      <ExploreLightbox
        post={selectedPost}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onLike={handleLike}
        locked={!canUseAccount}
      />
    </AppPage>
  )
}
