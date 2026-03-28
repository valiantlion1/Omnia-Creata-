import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Lock, Sparkles } from 'lucide-react'

import { AppPage, ButtonChip, EmptyState, LegalFooter, PageHeader, StatusPill } from '@/components/StudioPrimitives'
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
}: {
  post: PublicPost
  locked: boolean
  onLike: (post: PublicPost) => void
}) {
  const previewAssets = post.preview_assets.length ? post.preview_assets : post.cover_asset ? [post.cover_asset] : []

  return (
    <article className="border-b border-white/[0.06] pb-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {post.style_tags.slice(0, 3).map((tag) => (
              <StatusPill key={tag} tone="neutral">
                {tag}
              </StatusPill>
            ))}
            <StatusPill tone="brand">{post.like_count} likes</StatusPill>
          </div>

          <div>
            <div className="text-2xl font-semibold tracking-[-0.04em] text-white">{post.title}</div>
            <div className="mt-2 line-clamp-4 text-sm leading-7 text-zinc-400">{post.prompt}</div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link to={`/u/${post.owner_username}`} className="font-medium text-white transition hover:text-zinc-300">
              @{post.owner_username}
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-500">{new Date(post.created_at).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onLike(post)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                post.viewer_has_liked
                  ? 'bg-white text-black'
                  : 'bg-white/[0.05] text-white hover:bg-white/[0.08]'
              }`}
            >
              <Heart className={`h-4 w-4 ${post.viewer_has_liked ? 'fill-current' : ''}`} />
              {post.viewer_has_liked ? 'Liked' : 'Like'}
            </button>
            <Link
              to={locked ? '/signup' : '/create'}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08]"
            >
              {locked ? <Lock className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {locked ? 'Sign in to compose' : 'Open Compose'}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {previewAssets.slice(0, 4).map((asset, index) => (
            <div
              key={asset.id}
              className={`overflow-hidden rounded-[22px] bg-white/[0.03] ${index === 0 && previewAssets.length === 1 ? 'col-span-2' : ''}`}
            >
              <img
                src={asset.thumbnail_url ?? asset.url}
                alt={asset.title}
                className={`w-full object-cover ${index === 0 && previewAssets.length === 1 ? 'aspect-[5/4]' : 'aspect-square'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [sort, setSort] = useState<ExploreSort>('trending')
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
        description="Browse public work, discover directions, and get a feel for the range of output before you ever compose your own."
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
        <section className="space-y-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} locked={!canUseAccount} onLike={handleLike} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No public posts yet"
          description="Public work will start showing up here as soon as people publish images from their own library."
        />
      )}

      {!canUseAccount ? <LegalFooter /> : null}
    </AppPage>
  )
}
