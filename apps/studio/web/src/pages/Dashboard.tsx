import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Crown, Heart, Lock, Sparkles, X, Zap } from 'lucide-react'

import { AppPage, ButtonChip, PageHeader, StatusPill } from '@/components/StudioPrimitives'
import { useLightbox } from '@/components/Lightbox'
import { studioApi, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'

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
          Create a free account to continue
        </h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Sign up to like images, create your own, save favorites, and join the community. It takes less than a minute.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/signup"
            className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Sign up for free
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

/* ─── welcome pricing overlay ─── */
function WelcomePricingOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  const miniTiers = [
    { id: 'free', label: 'Free', icon: Sparkles, price: '$0', credits: '60', features: ['Core models', '1024px max', 'Standard queue'], style: 'outline' as const },
    { id: 'pro', label: 'Pro', icon: Zap, price: 'TBD', credits: '1,200', features: ['All models', '2048px max', 'Priority queue', 'Commercial license'], style: 'gradient' as const },
    { id: 'creator', label: 'Creator', icon: Crown, price: 'TBD', credits: '5,000', features: ['All + early access', '4096px max', 'Priority+', 'API (soon)'], style: 'white' as const },
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
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">Welcome to OmniaCreata</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">Choose a plan to get started. You can always change later.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {miniTiers.map((tier) => {
            const isPro = tier.id === 'pro'
            return (
              <div
                key={tier.id}
                className={`rounded-[20px] border p-5 transition ${
                  isPro
                    ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 to-transparent'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                }`}
              >
                <tier.icon className={`h-5 w-5 ${isPro ? 'text-cyan-400' : 'text-white'}`} />
                <div className="mt-3 text-lg font-semibold text-white">{tier.label}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${isPro ? 'text-cyan-400' : 'text-white'}`}>{tier.price}</span>
                  {tier.price !== '$0' && tier.price !== 'TBD' ? <span className="text-xs text-zinc-500">/mo</span> : null}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{tier.credits} credits/month</div>
                <ul className="mt-4 space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                      <Check className={`h-3 w-3 ${isPro ? 'text-cyan-400' : 'text-zinc-600'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/subscription"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] transition hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:brightness-110"
          >
            Compare plans <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={onClose}
            className="rounded-full border border-white/[0.12] px-6 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            Skip for now
          </button>
        </div>

        <div className="mt-4 text-center text-[10px] text-zinc-600">Pricing is subject to change during the alpha period.</div>
      </div>
    </div>
  )
}

type ExploreSort = 'trending' | 'newest' | 'top' | 'styles'

const sortOptions: Array<{ id: ExploreSort; label: string }> = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'top', label: 'Top liked' },
  { id: 'styles', label: 'Styles' },
]

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
    <article className="group mb-4 break-inside-avoid">
      <div className="relative overflow-hidden rounded-[22px] bg-white/[0.03]">
        <button type="button" onClick={() => onOpen(post)} className="block w-full text-left">
          {heroAsset ? (
            <img
              src={heroAsset.thumbnail_url ?? heroAsset.url}
              alt={heroAsset.title}
              className={`w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02] ${aspectClass}`}
            />
          ) : (
            <div className={`w-full bg-white/[0.03] ${aspectClass}`} />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent opacity-45 transition duration-300 group-hover:opacity-90" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
            <div className="max-w-[82%]">
              <div className="line-clamp-1 text-sm font-semibold tracking-[-0.03em] text-white">{post.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-zinc-300">
                <span className="font-medium text-white/95">@{post.owner_username}</span>
                <span className="text-zinc-500">/</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              </div>
            </div>
        </button>

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 opacity-70 transition duration-300 group-hover:opacity-100">
          {post.style_tags.slice(0, 1).map((tag) => (
            <StatusPill key={tag} tone="neutral">
              {tag}
            </StatusPill>
          ))}
          {previewAssets.length > 1 ? <StatusPill tone="neutral">{previewAssets.length}</StatusPill> : null}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            onClick={() => onLike(post)}
            className={locked
              ? 'inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1.5 text-[11px] text-white backdrop-blur-md transition hover:bg-black/60'
              : `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs backdrop-blur-md transition ${
                  post.viewer_has_liked
                    ? 'bg-white text-black'
                    : 'bg-black/45 text-white hover:bg-black/60'
                }`}
          >
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Heart className={`h-3.5 w-3.5 ${post.viewer_has_liked ? 'fill-current' : ''}`} />}
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">Explore</div>
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
                Back to Explore
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [sort, setSort] = useState<ExploreSort>('trending')
  const [selectedPost, setSelectedPost] = useState<PublicPost | null>(null)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const canUseAccount = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  // Welcome pricing overlay — show once after first signup
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

  const [searchQuery, setSearchQuery] = useState('')

  const posts = postsQuery.data?.posts ?? []
  
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts
    const lowerQuery = searchQuery.toLowerCase()
    return posts.filter((p: PublicPost) => 
      p.prompt?.toLowerCase().includes(lowerQuery) || 
      p.title?.toLowerCase().includes(lowerQuery) ||
      p.style_tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery)) ||
      p.owner_display_name?.toLowerCase().includes(lowerQuery)
    )
  }, [posts, searchQuery])

  const styleTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.style_tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag)
  }, [posts])

  const handleLike = (post: PublicPost) => {
    if (!canUseAccount) {
      setStudioPostAuthRedirect('/explore')
      setAuthPromptOpen(true)
      return
    }
    toggleLikeMutation.mutate(post)
  }

  return (
    <AppPage className="max-w-[1380px] gap-8 py-8">
      <PageHeader
        eyebrow="Explore"
        title="See what people are creating."
        description="Explore public images, discover new styles, and get inspired for your next creation."
        actions={
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-2 focus-within:border-white/20 transition backdrop-blur-md max-w-md">
              <Sparkles className="h-4 w-4 text-zinc-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by prompt, title, style or creator..."
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 w-full min-w-[280px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sortOptions.map((option) => (
                <button key={option.id} onClick={() => setSort(option.id)}>
                  <ButtonChip active={sort === option.id}>{option.label}</ButtonChip>
                </button>
              ))}
            </div>
          </div>
        }
        aside={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {styleTags.slice(0, 4).map((tag) => (
              <StatusPill key={tag} tone="neutral">
                {tag}
              </StatusPill>
            ))}
            <Link
              to={canUseAccount ? '/create' : '/signup'}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              {canUseAccount ? 'Open Compose' : 'Start free'}
              <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <AuthPromptModal open={authPromptOpen} onClose={() => setAuthPromptOpen(false)} />
      <WelcomePricingOverlay open={showWelcome} onClose={() => setShowWelcome(false)} />

      {postsQuery.isLoading ? (
        <div className="py-12 text-sm text-zinc-500">Loading community feed...</div>
      ) : filteredPosts.length ? (
        <section className="columns-2 gap-4 md:columns-3 xl:columns-4 2xl:columns-5 [column-fill:_balance]">
          {filteredPosts.map((post: PublicPost, index: number) => (
            <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} index={index} onOpen={setSelectedPost} />
          ))}
        </section>
      ) : (
        <section>
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-cyan-400" />
            <div className="mt-3 text-lg font-semibold text-white">Community gallery is warming up</div>
            <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-400">
              Be the first to publish — or get inspired by these sample generations made with OmniaCreata.
            </p>
          </div>
          <div className="mt-6 columns-2 gap-4 md:columns-3 xl:columns-4 2xl:columns-5 [column-fill:_balance]">
            {[
              { src: '/atmosphere/showcase-01-neon-cityscape.png', label: 'Neon Cityscape' },
              { src: '/atmosphere/showcase-02-editorial-portrait.png', label: 'Editorial Portrait' },
              { src: '/atmosphere/showcase-03-architecture.png', label: 'Architecture' },
              { src: '/atmosphere/showcase-04-fantasy-dragon.png', label: 'Fantasy Art' },
              { src: '/atmosphere/showcase-05-product-photo.png', label: 'Product Photo' },
              { src: '/atmosphere/showcase-06-luxury-interior.png', label: 'Luxury Interior' },
              { src: '/atmosphere/showcase-08-anime-warrior.png', label: 'Anime Art' },
              { src: '/atmosphere/showcase-09-scifi-cityscape.png', label: 'Sci-Fi City' },
              { src: '/atmosphere/showcase-10-food-photography.png', label: 'Food Photography' },
              { src: '/atmosphere/showcase-11-nature-macro.png', label: 'Nature Macro' },
            ].map((img, i) => (
              <div key={img.src} className="group mb-4 break-inside-avoid">
                <div className="relative overflow-hidden rounded-[22px] border border-white/[0.06] bg-white/[0.03]">
                  <img
                    src={img.src}
                    alt={img.label}
                    loading="lazy"
                    className={`w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03] ${
                      i % 3 === 0 ? 'aspect-[4/5]' : i % 3 === 1 ? 'aspect-square' : 'aspect-[5/6]'
                    }`}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                    <div className="text-sm font-semibold text-white">{img.label}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-400">Showcase · OmniaCreata</div>
                  </div>
                  <div className="pointer-events-none absolute left-3 top-3 opacity-60">
                    <StatusPill tone="brand">Showcase</StatusPill>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ExploreLightbox post={selectedPost} open={Boolean(selectedPost)} onClose={() => setSelectedPost(null)} />
    </AppPage>
  )
}
