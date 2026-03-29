import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Heart, Lock, Sparkles, X } from 'lucide-react'

import { AppPage, ButtonChip, EmptyState, PageHeader, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'

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
          {post.style_tags.slice(0, 2).map((tag) => (
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
  canUseAccount,
  onRequireAuth,
  onLike,
}: {
  post: PublicPost | null
  open: boolean
  onClose: () => void
  canUseAccount: boolean
  onRequireAuth: () => void
  onLike: (post: PublicPost) => void
}) {
  const [assetIndex, setAssetIndex] = useState(0)

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
          <div className="relative overflow-hidden rounded-[24px] bg-black/50">
            {activeAsset ? (
              <img
                src={activeAsset.url}
                alt={activeAsset.title}
                className="max-h-[78vh] min-h-[320px] w-full object-contain"
              />
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

            <div className="mt-5 text-xs uppercase tracking-[0.2em] text-zinc-600">Curated details in progress</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Heart className={`h-4 w-4 ${post.viewer_has_liked ? 'fill-current text-white' : ''}`} />
              <span>{post.like_count} likes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => (canUseAccount ? onLike(post) : onRequireAuth())}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
              >
                {canUseAccount ? 'Like' : 'Like (Sign in)'}
              </button>
              <button
                type="button"
                onClick={() => (canUseAccount ? onClose() : onRequireAuth())}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
              >
                {canUseAccount ? 'Save later' : 'Save later (Sign in)'}
              </button>
              <Link
                to={canUseAccount ? '/create' : '/login?next=%2Fcreate'}
                onClick={() => {
                  if (!canUseAccount) onRequireAuth()
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.1]"
              >
                Open compose
              </Link>
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [sort, setSort] = useState<ExploreSort>('trending')
  const [selectedPost, setSelectedPost] = useState<PublicPost | null>(null)
  const canUseAccount = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

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
      navigate('/login?next=%2Fexplore')
      return
    }
    toggleLikeMutation.mutate(post)
  }

  return (
    <AppPage className="max-w-[1380px] gap-8 py-8">
      <PageHeader
        eyebrow="Explore"
        title="See what people are making with OmniaCreata."
        description="Browse public work, spot strong directions, and save the ones worth chasing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {sortOptions.map((option) => (
              <button key={option.id} onClick={() => setSort(option.id)}>
                <ButtonChip active={sort === option.id}>{option.label}</ButtonChip>
              </button>
            ))}
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

      {postsQuery.isLoading ? (
        <div className="py-12 text-sm text-zinc-500">Loading community feed...</div>
      ) : posts.length ? (
        <section className="columns-2 gap-4 md:columns-3 xl:columns-4 2xl:columns-5 [column-fill:_balance]">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} index={index} onOpen={setSelectedPost} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No public posts yet"
          description="Public work will start showing up here as soon as people publish images from their own library."
        />
      )}

      <ExploreLightbox
        post={selectedPost}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        canUseAccount={canUseAccount}
        onRequireAuth={() => {
          setStudioPostAuthRedirect('/explore')
          navigate('/login?next=%2Fexplore')
        }}
        onLike={handleLike}
      />
    </AppPage>
  )
}
