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

  const filteredPosts = searchQuery.trim()
    ? posts.filter((p) =>
        p.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.owner_display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title?.toLowerCase().includes(searchQuery.toLowerCase())
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
              style={isActive ? { background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(124,58,237,0.05))' } : undefined}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#7c3aed]' : ''}`} />
              {tab.label}
            </button>
          )
        })}

        {/* Search */}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-white placeholder-zinc-500 outline-none w-40"
          />
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-3 text-zinc-500 font-medium py-12 justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          Gathering inspirations from the network...
        </div>
      )}
      
      {!loading && filteredPosts.length === 0 && (
         <div className="text-center py-20">
           <div className="text-zinc-600 text-6xl mb-4">🎨</div>
           <div className="text-zinc-400 font-semibold text-lg">No community posts deployed yet.</div>
           <p className="text-zinc-500 mt-2">Be the first to share an art block!</p>
         </div>
      )}

      {/* Feed Layout */}
      {!loading && filteredPosts.length > 0 && (
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <div key={post.id} className="group relative flex flex-col overflow-hidden rounded-[32px] border border-white/[0.05] bg-[#0a0a0c] transition-all duration-500 hover:border-white/[0.15] hover:shadow-[0_12px_45px_rgba(0,0,0,0.5)]">
              
              {/* Image Container */}
              <div className="relative aspect-square w-full overflow-hidden">
                <img 
                  src={post.cover_asset?.thumbnail_url || post.cover_asset?.url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80"} 
                  alt={post.prompt} 
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                
                {/* Overlay Gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                
                {/* Prompt Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="line-clamp-3 text-sm font-medium text-white shadow-sm leading-relaxed">{post.prompt || "No prompt available."}</p>
                </div>

                {/* Style Tags */}
                {post.style_tags && post.style_tags.length > 0 && (
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    {post.style_tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white/80">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Metadata Footer */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-[#7c3aed]/20 text-[#7c3aed]">
                    {post.owner_display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-zinc-200">{post.owner_display_name || "Unknown Creator"}</span>
                </div>
                
                <div className="flex items-center gap-4 text-zinc-400">
                  <button
                    onClick={() => handleLike(post.id, post.viewer_has_liked)}
                    className={`flex items-center gap-1.5 transition-colors ${post.viewer_has_liked ? 'text-rose-400' : 'hover:text-white'}`}
                  >
                    <Heart className={`h-4 w-4 ${post.viewer_has_liked ? 'fill-current' : ''}`} />
                    <span className="text-xs font-medium">{post.like_count || 0}</span>
                  </button>
                  <button className="flex items-center justify-center transition-colors hover:text-white">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
            </div>
          ))}
        </section>
      )}

    </div>
  )
}
