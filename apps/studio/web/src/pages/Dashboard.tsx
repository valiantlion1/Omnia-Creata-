import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Copy, Globe, Heart, Layers, Lock, Search, Sparkles, Star, Users, X, Zap } from 'lucide-react'

import { AppPage, ButtonChip, EmptyState, SkeletonMasonry, StatusPill } from '@/components/StudioPrimitives'
import { useLightbox } from '@/components/Lightbox'
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
  { id: 'styles', label: 'Styles' },
]

const galleryTabs: Array<{ id: GalleryTab; label: string; icon: typeof Globe; desc: string }> = [
  { id: 'community', label: 'Community', icon: Globe, desc: 'Live creator feed' },
  { id: 'showcase', label: 'Showcase', icon: Star, desc: 'Curated references' },
  { id: 'atmospheres', label: 'Atmospheres', icon: Layers, desc: 'Mood & style boards' },
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
}

const showcaseDisplayClasses: Record<ShowcaseDisplay, { tile: string; frame: string }> = {
  hero: {
    tile: 'sm:col-span-2 lg:col-span-4',
    frame: 'aspect-[16/10]',
  },
  landscape: {
    tile: 'sm:col-span-2 lg:col-span-4',
    frame: 'aspect-[3/2]',
  },
  portrait: {
    tile: 'sm:col-span-1 lg:col-span-2',
    frame: 'aspect-[4/5]',
  },
  softPortrait: {
    tile: 'sm:col-span-1 lg:col-span-2',
    frame: 'aspect-[5/6]',
  },
  detail: {
    tile: 'sm:col-span-1 lg:col-span-2',
    frame: 'aspect-square',
  },
}

const showcaseReferences: ShowcaseReference[] = [
  {
    id: 'showcase-neon-cityscape',
    src: '/atmosphere/showcase-01-neon-cityscape.png',
    label: 'Neon Cityscape',
    tag: 'Environments',
    prompt: 'Cinematic illustration of a neon cityscape drenched in rain and reflected light.',
    likes: 248,
    createdAt: '2026-04-11T18:00:00Z',
    display: 'hero',
    focus: 'center 58%',
  },
  {
    id: 'showcase-editorial-portrait',
    src: '/atmosphere/showcase-02-editorial-portrait.png',
    label: 'Editorial Portrait',
    tag: 'Photography',
    prompt: 'Fashion illustration portrait with polished lighting and editorial framing.',
    likes: 214,
    createdAt: '2026-04-10T14:15:00Z',
    display: 'softPortrait',
    focus: 'center 16%',
  },
  {
    id: 'showcase-architecture',
    src: '/atmosphere/showcase-03-architecture.png',
    label: 'Architecture',
    tag: 'Structures',
    prompt: 'Architectural illustration study with clean material contrast and quiet depth.',
    likes: 162,
    createdAt: '2026-04-09T09:20:00Z',
    display: 'landscape',
    focus: 'center 48%',
  },
  {
    id: 'showcase-fantasy-art',
    src: '/atmosphere/showcase-04-fantasy-dragon.png',
    label: 'Fantasy Art',
    tag: 'Creatures',
    prompt: 'Fantasy illustration of a dragon in a dramatic atmospheric scene.',
    likes: 273,
    createdAt: '2026-04-12T11:30:00Z',
    display: 'portrait',
    focus: '52% 52%',
  },
  {
    id: 'showcase-product-photo',
    src: '/atmosphere/showcase-05-product-photo.png',
    label: 'Product Photo',
    tag: 'Commercial',
    prompt: 'Commercial still life with controlled highlights and tactile surface detail.',
    likes: 131,
    createdAt: '2026-04-08T08:45:00Z',
    display: 'detail',
    focus: 'center 54%',
  },
  {
    id: 'showcase-luxury-interior',
    src: '/atmosphere/showcase-06-luxury-interior.png',
    label: 'Luxury Interior',
    tag: 'Architecture',
    prompt: 'Interior design illustration with luxury tones, warm materials, and clean composition.',
    likes: 188,
    createdAt: '2026-04-07T16:10:00Z',
    display: 'landscape',
    focus: 'center 48%',
  },
  {
    id: 'showcase-fashion-editorial',
    src: '/atmosphere/showcase-07-fashion-editorial.png',
    label: 'Fashion Editorial',
    tag: 'Fashion',
    prompt: 'High fashion editorial illustration with bold styling and dramatic contrast.',
    likes: 196,
    createdAt: '2026-04-11T10:00:00Z',
    display: 'portrait',
    focus: 'center 18%',
  },
  {
    id: 'showcase-anime-art',
    src: '/atmosphere/showcase-08-anime-warrior.png',
    label: 'Anime Art',
    tag: 'Anime',
    prompt: 'Anime illustration with bold linework, strong silhouettes, and expressive color.',
    likes: 205,
    createdAt: '2026-04-12T15:40:00Z',
    display: 'portrait',
    focus: 'center 44%',
  },
  {
    id: 'showcase-scifi-city',
    src: '/atmosphere/showcase-09-scifi-cityscape.png',
    label: 'Sci-Fi City',
    tag: 'Futuristic',
    prompt: 'Sci-fi illustration of a futuristic city with layered depth and luminous accents.',
    likes: 224,
    createdAt: '2026-04-09T20:00:00Z',
    display: 'hero',
    focus: 'center 56%',
  },
  {
    id: 'showcase-food-photography',
    src: '/atmosphere/showcase-10-food-photography.png',
    label: 'Food Photography',
    tag: 'Culinary',
    prompt: 'Editorial food illustration with tactile detail and appetizing composition.',
    likes: 119,
    createdAt: '2026-04-06T13:00:00Z',
    display: 'landscape',
    focus: 'center 62%',
  },
  {
    id: 'showcase-nature-macro',
    src: '/atmosphere/showcase-11-nature-macro.png',
    label: 'Nature Macro',
    tag: 'Details',
    prompt: 'Macro nature illustration with fine detail, glow, and layered atmosphere.',
    likes: 177,
    createdAt: '2026-04-05T10:35:00Z',
    display: 'detail',
    focus: 'center 52%',
  },
]

type AtmosphereReference = {
  id: string
  src: string
  label: string
  mood: string
}

const atmosphereReferences: AtmosphereReference[] = [
  { id: 'atm-01', src: '/atmosphere/atmosphere-01-brutalist.png', label: 'Brutalist', mood: 'Industrial - Concrete - Urban' },
  { id: 'atm-02', src: '/atmosphere/atmosphere-02-conservatory.png', label: 'Conservatory', mood: 'Organic - Glass - Lush' },
  { id: 'atm-03', src: '/atmosphere/atmosphere-03-skyline-garden.png', label: 'Skyline Garden', mood: 'Elevated - Verdant - City' },
  { id: 'atm-04', src: '/atmosphere/atmosphere-04-snow-leopard.png', label: 'Snow Leopard', mood: 'Wild - Alpine - Pristine' },
  { id: 'atm-05', src: '/atmosphere/atmosphere-05-desert-courtyard.png', label: 'Desert Courtyard', mood: 'Arid - Sun-baked - Serene' },
  { id: 'atm-06', src: '/atmosphere/atmosphere-06-volcanic-fragrance.webp', label: 'Volcanic Fragrance', mood: 'Raw - Elemental - Intense' },
  { id: 'atm-07', src: '/atmosphere/atmosphere-07-observatory.webp', label: 'Observatory', mood: 'Cosmic - Precise - Vast' },
  { id: 'atm-08', src: '/atmosphere/atmosphere-08-glass-fins.webp', label: 'Glass Fins', mood: 'Architectural - Translucent - Light' },
  { id: 'atm-09', src: '/atmosphere/atmosphere-09-snow-leopard.webp', label: 'Snow Leopard II', mood: 'Arctic - Textured - Silent' },
  { id: 'atm-10', src: '/atmosphere/atmosphere-10-elven-ward.webp', label: 'Elven Ward', mood: 'Fantasy - Ancient - Luminous' },
]

function matchesExploreQuery(query: string, ...parts: Array<string | null | undefined>) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
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

export default function DashboardPage() {
  usePageMeta('Explore — Omnia Creata Studio', 'What the community is making on Omnia Creata Studio.')
  const location = useLocation()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const { openLightbox } = useLightbox()

  const [galleryTab, setGalleryTab] = useState<GalleryTab>('community')
  const [sort, setSort] = useState<ExploreSort>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPost, setSelectedPost] = useState<PublicPost | null>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)

  const canUseAccount = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const isNewUser = new URLSearchParams(location.search).get('welcome') === '1'
  const [showWelcome, setShowWelcome] = useState(false)
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

  const normalizedSearch = searchQuery.trim().toLowerCase()
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
  }

  return (
    <AppPage className="max-w-[1700px] gap-0 py-5 md:py-6">

      {/* ── Tab Bar ── */}
      <section className="mb-5 rounded-[30px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-4 py-4 shadow-[0_20px_60px_-30px_rgba(4,10,18,0.42)] backdrop-blur-xl md:px-5 md:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Explore</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:overflow-x-auto sm:pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {galleryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = galleryTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-auto sm:shrink-0 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[13px] ${
                  isActive
                    ? 'text-white ring-1 ring-white/[0.08]'
                    : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, rgba(188,209,229,0.2), rgba(146,184,214,0.08))' } : undefined}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[rgb(var(--primary-light))]' : ''}`} />
                {tab.label}
              </button>
            )
          })}
            </div>
          </div>

        {/* Community sort + search */}
        {galleryTab === 'community' && (
          <div className="flex w-full flex-col gap-3 xl:max-w-[620px] xl:items-end">
            <div className="flex w-full flex-wrap items-center gap-2 xl:justify-end">
              {sortOptions.map((option) => (
                <button key={option.id} onClick={() => setSort(option.id)}>
                  <ButtonChip active={sort === option.id} className="px-3 py-1.5 text-[12px]">
                    {option.label}
                  </ButtonChip>
                </button>
              ))}
            </div>
            <div className="flex w-full items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts, creators, styles..."
                className="min-w-0 flex-1 bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="shrink-0 text-zinc-500 transition hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
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
                {' · '}{sortOptions.find((o) => o.id === sort)?.label ?? 'Trending'}
              </div>
              <div className="columns-2 gap-2 sm:columns-3 md:columns-4 xl:columns-5 2xl:columns-6 [column-fill:_balance]">
                {filteredPosts.map((post: PublicPost) => (
                  <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} onOpen={setSelectedPost} />
                ))}
              </div>
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
      {galleryTab === 'showcase' && (
        <section className="space-y-3">
          <div className="text-[11px] text-zinc-600 font-medium px-0.5">
            {showcaseReferences.length} hand-picked Studio outputs
          </div>
          <div data-testid="showcase-grid" className="grid auto-flow-dense grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-8 xl:gap-4">
            {showcaseReferences.map((item) => {
              const display = showcaseDisplayClasses[item.display]
              return (
              <article
                key={item.id}
                data-showcase-layout={item.display}
                className={`group relative ${display.tile}`}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(item.src, item.label, {
                    title: item.label,
                    authorName: 'OmniaCreata',
                    authorUsername: 'studio',
                    prompt: item.prompt,
                  })}
                  aria-label={`Open ${item.label} showcase piece`}
                  className="relative block w-full overflow-hidden rounded-[18px] bg-[#0e1014] text-left ring-1 ring-white/[0.04] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:ring-white/[0.12] hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85),0_0_24px_rgba(255,255,255,0.05)] cursor-zoom-in"
                >
                  <div className={`w-full overflow-hidden ${display.frame}`}>
                    <img
                      src={item.src}
                      alt={item.label}
                      loading="lazy"
                      style={item.focus ? { objectPosition: item.focus } : undefined}
                      className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-white/80 backdrop-blur-md ring-1 ring-white/10">
                    {item.tag}
                  </div>

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/85 opacity-0 transition duration-300 group-hover:opacity-100" />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end px-3 pb-3 opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="text-[12px] font-semibold text-white/95 leading-snug drop-shadow-md">{item.label}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-200/80">
                      {item.prompt}
                    </div>
                  </div>

                  <div className="pointer-events-none absolute right-2 top-2 opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="flex items-center gap-1 rounded-full bg-black/55 backdrop-blur-sm px-2 py-1 text-[10px] text-white/90 ring-1 ring-white/10">
                      <Heart className="h-3 w-3" />
                      <span>{item.likes}</span>
                    </div>
                  </div>
                </button>
              </article>
            )})}
          </div>
        </section>
      )}

      {/* ── Atmospheres Tab ── */}
      {galleryTab === 'atmospheres' && (
        <section className="space-y-3">
          <div className="text-[11px] text-zinc-600 font-medium px-0.5">
            {atmosphereReferences.length} mood boards · tap any card for full view
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {atmosphereReferences.map((atm) => (
              <button
                key={atm.id}
                type="button"
                onClick={() => openLightbox(atm.src, atm.label, { title: atm.label, prompt: atm.mood })}
                className="group relative overflow-hidden rounded-[10px] bg-[#0e1014] cursor-zoom-in transition-transform duration-300"
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={atm.src}
                    alt={atm.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/85 opacity-0 transition duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-3 text-left opacity-0 transition duration-300 group-hover:opacity-100">
                  <div className="text-[12px] font-semibold text-white leading-tight drop-shadow-md">{atm.label}</div>
                </div>
              </button>
            ))}
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
