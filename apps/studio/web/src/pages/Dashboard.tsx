import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Globe, Heart, Layers, Lock, Search, Sparkles, Star, Users, X, Zap } from 'lucide-react'

import { AppPage, ButtonChip, SkeletonMasonry, StatusPill } from '@/components/StudioPrimitives'
import { useLightbox } from '@/components/Lightbox'
import { studioApi, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'
import { usePageMeta } from '@/lib/usePageMeta'

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function AuthPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0a0d12]/95 p-8 shadow-[0_36px_120px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
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
          Sign up to like images, create your own, save favorites, and join the community. It takes less than a minute.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Create account
          </Link>
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 rounded-full border border-white/[0.12] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.06]"
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
      label: 'Explore for direction',
      body: 'Browse community work and Studio references when you want ideas before you start.',
      icon: Sparkles,
    },
    {
      id: 'create',
      label: 'Create for direct runs',
      body: 'Use Create when you already know what you want and need a fast, controlled image run.',
      icon: Zap,
    },
    {
      id: 'save',
      label: 'Save what matters',
      body: 'Keep strong outputs in your library so you can return, refine, and share without losing the thread.',
      icon: Heart,
    },
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-lg" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0a0d12]/98 p-8 shadow-[0_36px_120px_rgba(0,0,0,0.7)] md:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
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
            Your account is ready. Start with the surface that matches your intent, then keep anything worth revisiting inside your library.
          </p>
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
            to="/create"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Open Create
          </Link>
          <Link
            to="/chat"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
          >
            Open Chat
          </Link>
          <button
            onClick={onClose}
            className="rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
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
  },
  {
    id: 'showcase-editorial-portrait',
    src: '/atmosphere/showcase-02-editorial-portrait.png',
    label: 'Editorial Portrait',
    tag: 'Photography',
    prompt: 'Fashion illustration portrait with polished lighting and editorial framing.',
    likes: 214,
    createdAt: '2026-04-10T14:15:00Z',
  },
  {
    id: 'showcase-architecture',
    src: '/atmosphere/showcase-03-architecture.png',
    label: 'Architecture',
    tag: 'Structures',
    prompt: 'Architectural illustration study with premium surfaces and clean depth cues.',
    likes: 162,
    createdAt: '2026-04-09T09:20:00Z',
  },
  {
    id: 'showcase-fantasy-art',
    src: '/atmosphere/showcase-04-fantasy-dragon.png',
    label: 'Fantasy Art',
    tag: 'Creatures',
    prompt: 'Fantasy illustration of a dragon in a dramatic atmospheric scene.',
    likes: 273,
    createdAt: '2026-04-12T11:30:00Z',
  },
  {
    id: 'showcase-product-photo',
    src: '/atmosphere/showcase-05-product-photo.png',
    label: 'Product Photo',
    tag: 'Commercial',
    prompt: 'Commercial illustration with premium product styling and controlled highlights.',
    likes: 131,
    createdAt: '2026-04-08T08:45:00Z',
  },
  {
    id: 'showcase-luxury-interior',
    src: '/atmosphere/showcase-06-luxury-interior.png',
    label: 'Luxury Interior',
    tag: 'Architecture',
    prompt: 'Interior design illustration with luxury tones, warm materials, and clean composition.',
    likes: 188,
    createdAt: '2026-04-07T16:10:00Z',
  },
  {
    id: 'showcase-fashion-editorial',
    src: '/atmosphere/showcase-07-fashion-editorial.png',
    label: 'Fashion Editorial',
    tag: 'Fashion',
    prompt: 'High fashion editorial illustration with bold styling and dramatic contrast.',
    likes: 196,
    createdAt: '2026-04-11T10:00:00Z',
  },
  {
    id: 'showcase-anime-art',
    src: '/atmosphere/showcase-08-anime-warrior.png',
    label: 'Anime Art',
    tag: 'Characters',
    prompt: 'Anime illustration with bold linework, strong silhouettes, and expressive color.',
    likes: 205,
    createdAt: '2026-04-12T15:40:00Z',
  },
  {
    id: 'showcase-scifi-city',
    src: '/atmosphere/showcase-09-scifi-cityscape.png',
    label: 'Sci-Fi City',
    tag: 'Futuristic',
    prompt: 'Sci-fi illustration of a futuristic city with layered depth and luminous accents.',
    likes: 224,
    createdAt: '2026-04-09T20:00:00Z',
  },
  {
    id: 'showcase-food-photography',
    src: '/atmosphere/showcase-10-food-photography.png',
    label: 'Food Photography',
    tag: 'Culinary',
    prompt: 'Editorial food illustration with tactile detail and appetizing composition.',
    likes: 119,
    createdAt: '2026-04-06T13:00:00Z',
  },
  {
    id: 'showcase-nature-macro',
    src: '/atmosphere/showcase-11-nature-macro.png',
    label: 'Nature Macro',
    tag: 'Details',
    prompt: 'Macro nature illustration with fine detail, glow, and layered atmosphere.',
    likes: 177,
    createdAt: '2026-04-05T10:35:00Z',
  },
]

type AtmosphereReference = {
  id: string
  src: string
  label: string
  mood: string
}

const atmosphereReferences: AtmosphereReference[] = [
  { id: 'atm-01', src: '/atmosphere/atmosphere-01-brutalist.png', label: 'Brutalist', mood: 'Industrial · Concrete · Urban' },
  { id: 'atm-02', src: '/atmosphere/atmosphere-02-conservatory.png', label: 'Conservatory', mood: 'Organic · Glass · Lush' },
  { id: 'atm-03', src: '/atmosphere/atmosphere-03-skyline-garden.png', label: 'Skyline Garden', mood: 'Elevated · Verdant · City' },
  { id: 'atm-04', src: '/atmosphere/atmosphere-04-snow-leopard.png', label: 'Snow Leopard', mood: 'Wild · Alpine · Pristine' },
  { id: 'atm-05', src: '/atmosphere/atmosphere-05-desert-courtyard.png', label: 'Desert Courtyard', mood: 'Arid · Sun-baked · Serene' },
  { id: 'atm-06', src: '/atmosphere/atmosphere-06-volcanic-fragrance.webp', label: 'Volcanic Fragrance', mood: 'Raw · Elemental · Intense' },
  { id: 'atm-07', src: '/atmosphere/atmosphere-07-observatory.webp', label: 'Observatory', mood: 'Cosmic · Precise · Vast' },
  { id: 'atm-08', src: '/atmosphere/atmosphere-08-glass-fins.webp', label: 'Glass Fins', mood: 'Architectural · Translucent · Light' },
  { id: 'atm-09', src: '/atmosphere/atmosphere-09-snow-leopard.webp', label: 'Snow Leopard II', mood: 'Arctic · Textured · Silent' },
  { id: 'atm-10', src: '/atmosphere/atmosphere-10-elven-ward.webp', label: 'Elven Ward', mood: 'Fantasy · Ancient · Luminous' },
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
  index,
  onOpen,
}: {
  post: PublicPost
  locked: boolean
  onLike: (post: PublicPost) => void
  index: number
  onOpen: (post: PublicPost) => void
}) {
  const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []
  const heroAsset = previewAssets[0] ?? null
  const aspectClass =
    index % 6 === 0
      ? 'aspect-[4/5]'
      : index % 6 === 1
        ? 'aspect-square'
        : index % 6 === 2
          ? 'aspect-[5/6]'
          : index % 6 === 3
            ? 'aspect-[4/5]'
            : index % 6 === 4
              ? 'aspect-square'
              : 'aspect-[5/6]'

  return (
    <article className="group relative mb-6 break-inside-avoid shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgb(var(--primary-light)/0.3)] rounded-[26px]">
      <div className="relative overflow-hidden rounded-[26px] bg-[#111216] border border-white/[0.04]">
        <button type="button" onClick={() => onOpen(post)} className="block w-full text-left">
          {heroAsset ? (
            <img
              src={heroAsset.thumbnail_url ?? heroAsset.url}
              alt={heroAsset.title}
              className={`w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] ${aspectClass}`}
              loading="lazy"
            />
          ) : (
            <div className={`w-full bg-white/[0.03] ${aspectClass}`} />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90 opacity-60 transition duration-500 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end p-5 opacity-0 transition duration-500 translate-y-4 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="line-clamp-2 text-sm font-semibold tracking-tight text-white/95 leading-relaxed drop-shadow-md">
              {post.prompt ? post.prompt : post.title}
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-400">
                <span className="font-bold text-white/90 drop-shadow-sm">@{post.owner_username}</span>
                <span className="opacity-50">·</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </button>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 opacity-0 -translate-x-2 transition duration-500 group-hover:opacity-100 group-hover:translate-x-0">
          {post.style_tags.slice(0, 2).map((tag) => (
            <StatusPill key={tag} tone="neutral" className="border-white/10 bg-black/40 backdrop-blur-md text-white/80">
              {tag}
            </StatusPill>
          ))}
          {previewAssets.length > 1 ? (
            <StatusPill tone="neutral" className="border-white/10 bg-black/40 backdrop-blur-md">
              {previewAssets.length} <Sparkles className="inline ml-0.5 h-2.5 w-2.5 opacity-60" />
            </StatusPill>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            onClick={() => onLike(post)}
            className={locked
              ? 'inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/10 transition hover:bg-black/60'
              : `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur-md ring-1 transition-all duration-300 ${
                  post.viewer_has_liked
                    ? 'bg-white text-black ring-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'bg-black/40 text-white/90 ring-white/10 hover:bg-black/60 hover:ring-white/20'
                }`}
          >
            {locked ? <Lock className="h-3.5 w-3.5 opacity-70" /> : <Heart className={`h-3.5 w-3.5 ${post.viewer_has_liked ? 'fill-current text-rose-500' : 'opacity-70'}`} />}
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
}: {
  post: PublicPost | null
  open: boolean
  onClose: () => void
}) {
  const [assetIndex, setAssetIndex] = useState(0)
  const { openLightbox } = useLightbox()

  useEffect(() => {
    setAssetIndex(0)
  }, [post?.id])

  useEffect(() => {
    if (!open) return undefined

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
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open, post])

  if (!open || !post) return null

  const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []
  const activeAsset = previewAssets[assetIndex] ?? previewAssets[0] ?? null
  const canStep = previewAssets.length > 1

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/88 px-4 py-6 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative grid w-full max-w-[1280px] gap-5 rounded-[28px] border border-white/[0.08] bg-[#0a0d12] p-4 shadow-[0_36px_120px_rgba(0,0,0,0.6)] md:grid-cols-[minmax(0,1fr)_320px] md:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-zinc-300 transition hover:bg-white hover:text-black"
          title="Close preview"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-w-0">
          <div className="group relative overflow-hidden rounded-[24px] bg-black/50">
            {activeAsset ? (
              <div className="relative">
                <img
                  src={activeAsset.url}
                  alt={activeAsset.title}
                  className="max-h-[78vh] min-h-[320px] w-full cursor-zoom-in object-contain"
                  onClick={() => openLightbox(activeAsset.url, activeAsset.title, {
                    title: post.title,
                    prompt: post.prompt,
                    authorName: post.owner_display_name,
                    authorUsername: post.owner_username,
                    likes: post.like_count,
                    aspectRatio: metadataString(activeAsset.metadata, 'aspect_ratio')
                  })}
                />
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center text-sm text-zinc-500">No preview available</div>
            )}

            {canStep ? (
              <>
                <button
                  type="button"
                  onClick={() => setAssetIndex((current) => (current - 1 + previewAssets.length) % previewAssets.length)}
                  className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-white hover:text-black"
                  title="Previous image"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setAssetIndex((current) => (current + 1) % previewAssets.length)}
                  className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-white hover:text-black"
                  title="Next image"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>

          {previewAssets.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {previewAssets.map((asset, index) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setAssetIndex(index)}
                  className={`overflow-hidden rounded-2xl border transition ${
                    index === assetIndex ? 'border-white/70 opacity-100' : 'border-white/[0.08] opacity-65 hover:opacity-100'
                  }`}
                >
                  <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="flex min-h-0 flex-col justify-between gap-5 rounded-[22px] bg-[#0d1117] p-4 ring-1 ring-white/[0.05] md:ml-1">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Gallery</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">{post.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <Link to={`/u/${post.owner_username}`} className="font-medium text-white transition hover:text-zinc-300">
                @{post.owner_username}
              </Link>
              <span className="text-zinc-600">/</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>

            {post.style_tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.style_tags.slice(0, 4).map((tag) => (
                  <StatusPill key={tag} tone="neutral">
                    {tag}
                  </StatusPill>
                ))}
              </div>
            ) : null}

            <p className="mt-5 line-clamp-5 text-sm leading-7 text-zinc-400">{post.prompt}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Heart className={`h-4 w-4 ${post.viewer_has_liked ? 'fill-current text-white' : ''}`} />
              <span>{post.like_count} likes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/u/${post.owner_username}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
              >
                View profile
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Back to Gallery
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  usePageMeta('Gallery', 'Discover AI-generated art, curated showcases, and creative atmospheres on Omnia Creata.')
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
    <AppPage className="max-w-[1500px] gap-0 py-8">

      {/* ── Gallery Header ── */}
      <section className="px-1 pb-8">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600 mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Omnia Creata</span>
        </div>
        <h1
          className="text-4xl font-bold tracking-tight sm:text-5xl"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Gallery
        </h1>
        <p className="mt-3 text-base text-zinc-400 max-w-xl">
          Discover AI art from the community, explore curated showcases, and browse visual atmosphere references.
        </p>
      </section>

      {/* ── Tab Bar ── */}
      <section className="mb-8 flex flex-wrap items-center gap-3 border-b border-white/[0.06] pb-5">
        <div className="flex items-center gap-1.5">
          {galleryTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = galleryTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'text-white ring-1 ring-white/10 shadow-[0_2px_16px_rgba(0,0,0,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, rgb(var(--primary)/0.25), rgb(var(--primary)/0.08))' } : undefined}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-[rgb(var(--primary-light))]' : ''}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Community sort + search */}
        {galleryTab === 'community' && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              {sortOptions.map((option) => (
                <button key={option.id} onClick={() => setSort(option.id)}>
                  <ButtonChip active={sort === option.id} className="text-[12px] py-1.5 px-3 border-white/5 bg-white/[0.03] hover:bg-white/[0.07]">
                    {option.label}
                  </ButtonChip>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3.5 py-2">
              <Search className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts, creators, styles..."
                className="bg-transparent text-[13px] text-white placeholder:text-zinc-600 outline-none w-44 sm:w-52"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-600 hover:text-white transition shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Community Tab ── */}
      {galleryTab === 'community' && (
        <section className="space-y-6">
          {postsQuery.isLoading ? (
            <SkeletonMasonry count={12} />
          ) : filteredPosts.length > 0 ? (
            <>
              <div className="text-[12px] text-zinc-600 font-medium">
                {filteredPosts.length} result{filteredPosts.length === 1 ? '' : 's'}
                {searchQuery ? ` for "${searchQuery}"` : ''}
                {' '}· {sortOptions.find((o) => o.id === sort)?.label ?? 'Trending'}
              </div>
              <div className="columns-2 gap-4 md:columns-3 xl:columns-4 2xl:columns-5 [column-fill:_balance]">
                {filteredPosts.map((post: PublicPost, index: number) => (
                  <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} index={index} onOpen={setSelectedPost} />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[20px] mb-6 ring-1 ring-white/[0.08]"
                style={{ background: 'linear-gradient(135deg, rgb(var(--primary-light)/0.08), rgb(var(--accent)/0.08))' }}
              >
                <Users className="h-7 w-7 text-zinc-500" />
              </div>
              <div className="text-xl font-semibold text-zinc-200">
                {searchQuery ? `No results for "${searchQuery}"` : 'Community gallery is warming up'}
              </div>
              <p className="mt-3 max-w-sm text-sm text-zinc-500 leading-relaxed">
                {searchQuery
                  ? 'Try different prompt words, creator names, or style tags.'
                  : 'Be the first to create and share your work with the community.'}
              </p>
              {!searchQuery && (
                <Link
                  to="/create"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:opacity-90"
                >
                  Start Creating
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── Showcase Tab ── */}
      {galleryTab === 'showcase' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-white">Curated References</div>
              <div className="text-[12px] text-zinc-600">{showcaseReferences.length} hand-selected Studio outputs</div>
            </div>
          </div>
          <div className="columns-2 gap-4 md:columns-3 xl:columns-4 [column-fill:_balance]">
            {showcaseReferences.map((item, i) => (
              <div key={item.id} className="group relative mb-5 break-inside-avoid shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(0,0,0,0.6),0_0_0_1px_rgb(var(--primary-light)/0.25)] rounded-[24px]">
                <button
                  type="button"
                  onClick={() => openLightbox(item.src, item.label, {
                    title: item.label,
                    authorName: 'OmniaCreata',
                    authorUsername: 'studio',
                    prompt: item.prompt,
                  })}
                  className="relative overflow-hidden rounded-[24px] bg-[#111216] border border-white/[0.04] w-full text-left block cursor-zoom-in"
                >
                  <img
                    src={item.src}
                    alt={item.label}
                    loading="lazy"
                    className={`w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04] ${
                      i % 3 === 0 ? 'aspect-[4/5]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[5/6]'
                    }`}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85 opacity-50 transition duration-500 group-hover:opacity-100" />

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end p-4 opacity-0 transition duration-500 translate-y-3 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="text-[13px] font-semibold text-white/95 leading-snug drop-shadow-md">{item.label}</div>
                    <div className="mt-1 text-[11px] text-zinc-400">{item.prompt.slice(0, 60)}…</div>
                  </div>

                  <div className="pointer-events-none absolute left-3 top-3 opacity-0 -translate-x-2 transition duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                    <StatusPill tone="brand" className="border-white/10 bg-black/50 backdrop-blur-md text-white/90 ring-1 ring-white/10">
                      {item.tag}
                    </StatusPill>
                  </div>

                  <div className="pointer-events-none absolute right-3 top-3 opacity-0 translate-x-2 transition duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                    <div className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[11px] text-zinc-300 ring-1 ring-white/10">
                      <Heart className="h-3 w-3 opacity-70" />
                      <span>{item.likes}</span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Atmospheres Tab ── */}
      {galleryTab === 'atmospheres' && (
        <section className="space-y-6">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-white">Atmosphere Boards</div>
            <div className="text-[12px] text-zinc-600">Visual mood references for prompt direction and style exploration</div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {atmosphereReferences.map((atm) => (
              <button
                key={atm.id}
                type="button"
                onClick={() => openLightbox(atm.src, atm.label, { title: atm.label, prompt: atm.mood })}
                className="group relative overflow-hidden rounded-[20px] border border-white/[0.04] bg-[#0d0e12] cursor-zoom-in transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={atm.src}
                    alt={atm.label}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
                <div className="absolute inset-x-0 bottom-0 p-3.5 text-left">
                  <div className="text-[13px] font-semibold text-white leading-tight">{atm.label}</div>
                  <div className="mt-1 text-[10px] text-zinc-500 leading-relaxed">{atm.mood}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-[20px] border border-white/[0.04] bg-white/[0.015] p-5 flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-zinc-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-300">Using atmospheres in your prompts</div>
              <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed max-w-2xl">
                Each atmosphere captures a distinct visual language. Click any board to view it full-size, then use the mood tags as prompt keywords — combine multiple atmospheres to build layered, unique styles.
              </p>
            </div>
          </div>
        </section>
      )}

      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
      <WelcomeOverlay open={showWelcome} onClose={() => setShowWelcome(false)} />
      <ExploreLightbox post={selectedPost} open={Boolean(selectedPost)} onClose={() => setSelectedPost(null)} />
    </AppPage>
  )
}
