import { useState } from 'react'
import { Plus, Palette, Wand2, Layers, Sparkles, Copy, Heart } from 'lucide-react'
import { usePageMeta } from '@/lib/usePageMeta'
import { useToast } from '@/components/Toast'

type StylePreset = {
  id: string
  title: string
  prompt_modifier: string
  image: string
  category: 'photography' | 'illustration' | 'abstract' | '3d'
  likes: number
  isOmnia: boolean
}

const presets: StylePreset[] = [
  {
    id: 'dramatic-cinema',
    title: 'Dramatic Cinema',
    prompt_modifier: 'cinematic lighting, anamorphic lens flare, film grain, 35mm photography, dramatic shadows, color grading',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
    category: 'photography',
    likes: 342,
    isOmnia: true,
  },
  {
    id: 'soft-editorial',
    title: 'Soft Editorial',
    prompt_modifier: 'soft natural lighting, editorial fashion photography, muted pastel tones, shallow depth of field, magazine quality',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
    category: 'photography',
    likes: 287,
    isOmnia: true,
  },
  {
    id: 'product-gloss',
    title: 'Product Gloss',
    prompt_modifier: 'studio lighting, product photography, sleek reflections, clean background, commercial grade, high polish',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
    category: 'photography',
    likes: 195,
    isOmnia: true,
  },
  {
    id: 'anime-cel',
    title: 'Anime Cel Shading',
    prompt_modifier: 'anime style, cel-shaded, vibrant colors, clean linework, studio ghibli inspired, 2D illustration',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=900&q=80',
    category: 'illustration',
    likes: 891,
    isOmnia: true,
  },
  {
    id: 'oil-painting',
    title: 'Renaissance Oil',
    prompt_modifier: 'oil painting, renaissance style, rich textures, dramatic chiaroscuro, classical composition, canvas texture',
    image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=80',
    category: 'illustration',
    likes: 456,
    isOmnia: true,
  },
  {
    id: 'neon-cyberpunk',
    title: 'Neon Cyberpunk',
    prompt_modifier: 'cyberpunk aesthetic, neon lights, rain-soaked streets, holographic displays, futuristic city, chromatic aberration',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=900&q=80',
    category: 'abstract',
    likes: 723,
    isOmnia: true,
  },
  {
    id: 'isometric-3d',
    title: 'Isometric World',
    prompt_modifier: 'isometric view, 3D render, miniature world, soft shadows, vibrant colors, clean geometry, low poly',
    image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=900&q=80',
    category: '3d',
    likes: 534,
    isOmnia: true,
  },
  {
    id: 'watercolor-dream',
    title: 'Watercolor Dream',
    prompt_modifier: 'watercolor painting, soft washes, bleeding edges, organic textures, dreamy atmosphere, handmade paper texture',
    image: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80',
    category: 'illustration',
    likes: 312,
    isOmnia: true,
  },
]

const categories = [
  { key: 'all', label: 'All Styles', icon: Layers },
  { key: 'photography', label: 'Photography', icon: Wand2 },
  { key: 'illustration', label: 'Illustration', icon: Palette },
  { key: 'abstract', label: 'Abstract', icon: Sparkles },
  { key: '3d', label: '3D Render', icon: Layers },
] as const

export default function ElementsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [tab, setTab] = useState<'explore' | 'my'>('explore')
  const { addToast } = useToast()
  usePageMeta('Styles & Presets', 'Browse and apply curated style presets to your AI generations.')

  const filtered = activeCategory === 'all'
    ? presets
    : presets.filter((p) => p.category === activeCategory)

  const copyPrompt = (preset: StylePreset) => {
    navigator.clipboard.writeText(preset.prompt_modifier)
    addToast('success', `"${preset.title}" style prompt copied to clipboard!`)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">

      {/* Header */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
          <Palette className="h-4 w-4" />
          <span>Style Engine</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Styles & Presets
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Apply curated visual styles to your generations. Copy a style prompt or save it to your collection for instant reuse.
        </p>
      </section>

      {/* Tabs */}
      <section className="flex items-center gap-3">
        <button
          onClick={() => setTab('explore')}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'explore'
              ? 'text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
              : 'bg-white/[0.04] text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]'
          }`}
          style={tab === 'explore' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        >
          Explore
        </button>
        <button
          onClick={() => setTab('my')}
          className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
            tab === 'my'
              ? 'text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
              : 'bg-white/[0.04] text-zinc-300 ring-1 ring-white/10 hover:bg-white/[0.08]'
          }`}
          style={tab === 'my' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        >
          My Styles
        </button>
      </section>

      {/* Category Filter */}
      {tab === 'explore' && (
        <section className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all ${
                  active
                    ? 'bg-white/[0.08] text-white ring-1 ring-white/[0.15]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#7c3aed]' : ''}`} />
                {cat.label}
              </button>
            )
          })}
        </section>
      )}

      {/* Grid */}
      {tab === 'explore' && (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* Create Custom */}
          <div className="group flex min-h-[420px] cursor-pointer flex-col justify-center items-center rounded-[32px] border border-dashed border-white/[0.15] bg-white/[0.02] p-6 transition-all duration-300 hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.05)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full text-zinc-400 ring-1 ring-white/[0.1] transition-transform duration-300 group-hover:scale-110 group-hover:text-white" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.2))' }}>
              <Plus className="h-8 w-8" />
            </div>
            <div className="mt-6 text-center">
              <div className="text-xl font-semibold text-white">Create Style</div>
              <div className="mt-2 text-sm text-zinc-500">Build your own prompt modifier preset from scratch.</div>
            </div>
          </div>

          {/* Style Cards */}
          {filtered.map((preset) => (
            <div key={preset.id} className="group relative flex min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
              <div className="relative h-[220px] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f12] to-transparent z-10" />
                <img
                  src={preset.image}
                  alt={preset.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Category badge */}
                <div className="absolute top-3 left-3 z-20 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                  {preset.category}
                </div>
              </div>

              <div className="relative z-20 flex flex-1 flex-col p-6 pt-0">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7c3aed]">{preset.isOmnia ? 'Omnia Official' : 'Community'}</span>
                </div>
                <h3 className="text-xl font-bold text-white">{preset.title}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-zinc-500 line-clamp-2">{preset.prompt_modifier}</p>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyPrompt(preset) }}
                    className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.12] hover:text-white"
                  >
                    <Copy className="h-3 w-3" /> Copy Prompt
                  </button>
                  <div className="ml-auto flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Heart className="h-3.5 w-3.5" />
                    {preset.likes}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* My Styles Tab */}
      {tab === 'my' && (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-zinc-600 text-6xl mb-4">🎨</div>
          <div className="text-zinc-400 font-semibold text-lg">No custom styles yet.</div>
          <p className="text-zinc-500 mt-2 text-center max-w-md">Create your own style presets or save community styles to build your personal collection.</p>
          <button
            onClick={() => setTab('explore')}
            className="mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 shadow-[0_0_15px_rgba(124,58,237,0.3)]"
            style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}
          >
            Browse Styles
          </button>
        </section>
      )}

    </div>
  )
}
