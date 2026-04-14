import { useState, useEffect, useCallback } from 'react'
import { Heart, Share2, Compass, Flame, Clock, Search, Sparkles } from 'lucide-react'
import { studioApi, type PublicPost } from '@/lib/studioApi'
import { usePageMeta } from '@/lib/usePageMeta'

type SortMode = 'trending' | 'newest' | 'top' | 'styles'

export default function CommunityPage() {
  const [posts, setPosts] = useState<PublicPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('trending')
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedSearch = searchQuery.trim().toLowerCase()
  usePageMeta('Explore AI Creations', 'Discover breathtaking AI-generated art and connect with creators on the Omnia Creata community.')

  const fetchFeed = useCallback(async (sortMode: SortMode) => {
    setLoading(true)
    try {
      const res = await studioApi.listPublicPosts(sortMode)
      setPosts(res.posts || [])
    } catch (err) {
      console.error('Failed to fetch community posts', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(sort)
  }, [sort, fetchFeed])

  const handleLike = async (postId: string, hasLiked: boolean) => {
    try {
      const res = hasLiked
        ? await studioApi.unlikePost(postId)
        : await studioApi.likePost(postId)
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, like_count: res.post.like_count, viewer_has_liked: res.post.viewer_has_liked } : p))
      )
    } catch (err) {
      console.error('Like toggle failed', err)
    }
  }

  const filteredPosts = normalizedSearch
    ? posts.filter((p) =>
        p.prompt?.toLowerCase().includes(normalizedSearch) ||
        p.owner_display_name?.toLowerCase().includes(normalizedSearch) ||
        p.title?.toLowerCase().includes(normalizedSearch) ||
        p.style_tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
        p.cover_asset?.display_title?.toLowerCase().includes(normalizedSearch) ||
        p.cover_asset?.title?.toLowerCase().includes(normalizedSearch) ||
        p.cover_asset?.derived_tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
        p.preview_assets?.some((asset) =>
          asset.display_title?.toLowerCase().includes(normalizedSearch) ||
          asset.title?.toLowerCase().includes(normalizedSearch) ||
          asset.derived_tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch))
        )
      )
    : posts

  const tabs: { mode: SortMode; label: string; icon: typeof Flame }[] = [
    { mode: 'trending', label: 'Trending', icon: Flame },
    { mode: 'newest', label: 'Recent', icon: Clock },
    { mode: 'top', label: 'Top Rated', icon: Heart },
    { mode: 'styles', label: 'Styles', icon: Sparkles },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">
      
      {/* Header Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
          <Compass className="h-4 w-4" />
          <span>Global Community</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Explore Creations
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Discover breathtaking art, copy the exact prompts, and connect with other creators across the Omnia Creata ecosystem.
        </p>
      </section>

      {/* Navigation Tabs + Search */}
      <section className="flex flex-wrap items-center gap-3 border-b border-white/[0.08] pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = sort === tab.mode
          return (
            <button
              key={tab.mode}
              onClick={() => setSort(tab.mode)}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'text-white ring-1 ring-white/10'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, rgb(var(--primary)/0.2), rgb(var(--primary)/0.05))' } : undefined}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[rgb(var(--primary))]' : ''}`} />
              {tab.label}
            </button>
          )
        })}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search prompts, creators, styles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-40 sm:w-56"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-zinc-500 transition hover:text-white"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="w-full text-[12px] font-medium text-zinc-500">
          {loading
            ? 'Refreshing the current feed...'
            : `${filteredPosts.length} result${filteredPosts.length === 1 ? '' : 's'} in ${tabs.find((tab) => tab.mode === sort)?.label.toLowerCase() ?? 'current'} view${searchQuery ? ` for "${searchQuery}"` : ''}.`}
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 text-zinc-500 font-medium py-12 justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          Discovering amazing creations…
        </div>
      )}

      {!loading && filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/[0.03] ring-1 ring-white/[0.08] mb-6">
            <Sparkles className="h-7 w-7 text-zinc-500" />
          </div>
          <div className="text-zinc-200 font-semibold text-xl">
            {searchQuery ? `No results for "${searchQuery}"` : 'Nothing here yet'}
          </div>
          <p className="text-zinc-500 mt-3 max-w-sm text-sm leading-relaxed">
            {searchQuery ? 'Try different prompt words, creator names, or style tags.' : 'Be the first to create and share your work with the community.'}
          </p>
        </div>
      )}

      {/* Feed Layout */}
      {!loading && filteredPosts.length > 0 && (
        <section className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 [column-fill:_balance]">
          {filteredPosts.map((post, i) => {
            const aspectClass = i % 5 === 0 ? 'aspect-[4/5]' : i % 5 === 1 ? 'aspect-square' : i % 5 === 2 ? 'aspect-[5/6]' : i % 5 === 3 ? 'aspect-[3/4]' : 'aspect-square'
            return (
              <div key={post.id} className="group relative mb-5 break-inside-avoid overflow-hidden rounded-[24px] border border-white/[0.05] bg-[#0a0a0c] shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_16px_48px_rgba(0,0,0,0.6)]">

                {/* Image Container */}
                <div className={`relative w-full overflow-hidden ${aspectClass}`}>
                  {post.cover_asset?.thumbnail_url || post.cover_asset?.url ? (
                    <img
                      src={post.cover_asset.thumbnail_url || post.cover_asset.url}
                      alt={post.prompt || post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/[0.03] flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-zinc-700" />
                    </div>
                  )}

                  {/* Vignette */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                  {/* Prompt Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="line-clamp-2 text-[13px] font-medium text-white/95 leading-relaxed drop-shadow-md">{post.prompt || post.title}</p>
                  </div>

                  {/* Style Tags */}
                  {post.style_tags && post.style_tags.length > 0 && (
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1 opacity-0 -translate-x-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                      {post.style_tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full bg-black/50 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white/80 ring-1 ring-white/10">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Like button */}
                  <div className="absolute top-3 right-3 opacity-0 translate-x-1 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0">
                    <button
                      onClick={() => handleLike(post.id, post.viewer_has_liked)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur-md ring-1 transition-all duration-300 ${
                        post.viewer_has_liked
                          ? 'bg-white text-black ring-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'bg-black/40 text-white/90 ring-white/10 hover:bg-black/60'
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${post.viewer_has_liked ? 'fill-current text-rose-500' : 'opacity-70'}`} />
                      <span>{post.like_count || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Author Footer */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))]/20 text-[11px] font-bold text-[rgb(var(--primary-light))]">
                      {post.owner_display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-[13px] font-medium text-zinc-300 truncate">{post.owner_display_name || 'Creator'}</span>
                  </div>
                  <button className="flex items-center justify-center text-zinc-600 transition-colors hover:text-zinc-300 ml-2 shrink-0">
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}

    </div>
  )
}
