import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Heart, Layers, Palette, Plus, Sparkles, Wand2 } from 'lucide-react'

import { useLightbox } from '@/components/Lightbox'
import { useToast } from '@/components/Toast'
import { studioApi, type StudioStyle, type StyleCatalogEntry } from '@/lib/studioApi'
import { usePageMeta } from '@/lib/usePageMeta'

const categories = [
  { key: 'all', label: 'All Styles', icon: Layers },
  { key: 'photography', label: 'Photography', icon: Wand2 },
  { key: 'illustration', label: 'Illustration', icon: Palette },
  { key: 'abstract', label: 'Abstract', icon: Sparkles },
  { key: '3d', label: '3D Render', icon: Layers },
] as const

function previewImageForStyle(style: StudioStyle, catalog: StyleCatalogEntry[]) {
  if (style.preview_image_url) return style.preview_image_url
  const catalogMatch = style.source_style_id ? catalog.find((entry) => entry.id === style.source_style_id) : null
  return catalogMatch?.image ?? null
}

function useCreateRoute() {
  const navigate = useNavigate()

  return {
    applyPrompt(prompt: string) {
      navigate(`/create?prompt=${encodeURIComponent(prompt)}&source=styles`)
    },
    applyModifier(title: string, modifier: string) {
      navigate(
        `/create?style_name=${encodeURIComponent(title)}&style_modifier=${encodeURIComponent(modifier)}&source=styles`,
      )
    },
  }
}

function CatalogCard({
  entry,
  busy,
  onApply,
  onModifier,
  onSave,
  onFavorite,
  onImageClick,
}: {
  entry: StyleCatalogEntry
  busy: boolean
  onApply: () => void
  onModifier: () => void
  onSave: () => void
  onFavorite: () => void
  onImageClick: () => void
}) {
  return (
    <div className="group relative flex min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
      <div className="relative h-[220px] w-full overflow-hidden" onClick={onImageClick}>
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0e0f12] to-transparent" />
        <img
          src={entry.image}
          alt={entry.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
        />
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="rounded-full bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20">Preview</div>
        </div>
        <div className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
          {entry.category}
        </div>
      </div>

      <div className="relative z-20 flex flex-1 flex-col p-6 pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--primary))]">
            {entry.is_omnia ? 'Omnia Official' : 'Community'}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white">{entry.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{entry.description}</p>
        <div className="flex-1" />

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onApply()
              }}
              className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              Generate with this style
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onModifier()
              }}
              className="rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white"
            >
              Add to prompt
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation()
                onSave()
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3 w-3" />
              {entry.saved ? 'Saved to My Styles' : 'Save to My Styles'}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onFavorite()
              }}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                entry.favorite
                  ? 'bg-rose-500/12 text-rose-200 ring-1 ring-rose-500/20'
                  : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Heart className={`h-3.5 w-3.5 ${entry.favorite ? 'fill-current' : ''}`} />
              {entry.favorite ? 'Favorited' : 'Favorite'}
            </button>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
              <Heart className="h-3.5 w-3.5" />
              {entry.likes}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SavedStyleCard({
  style,
  catalog,
  busy,
  onApply,
  onModifier,
  onFavorite,
}: {
  style: StudioStyle
  catalog: StyleCatalogEntry[]
  busy: boolean
  onApply: () => void
  onModifier: () => void
  onFavorite: () => void
}) {
  const previewImage = previewImageForStyle(style, catalog)

  return (
    <div className="group relative flex min-h-[400px] flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
      <div className="relative h-[210px] w-full overflow-hidden">
        {previewImage ? (
          <>
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            <img
              src={previewImage}
              alt={style.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
        )}
        <div className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
          {style.category}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6 pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-[rgb(var(--primary-light))]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--primary-light))]">
            {style.source_kind === 'prompt' ? 'Saved from Prompt' : 'My Style'}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white">{style.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{style.description || 'Reusable direction for your next render.'}</p>
        <div className="flex-1" />

        <div className="mt-5 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onApply}
              className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              Generate with this style
            </button>
            <button
              onClick={onModifier}
              className="rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white"
            >
              Add to prompt
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onFavorite}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                style.favorite
                  ? 'bg-rose-500/12 text-rose-200 ring-1 ring-rose-500/20'
                  : 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Heart className={`h-3.5 w-3.5 ${style.favorite ? 'fill-current' : ''}`} />
              {style.favorite ? 'Favorited' : 'Favorite'}
            </button>
            <div className="ml-auto text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Updated {new Date(style.updated_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ElementsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [tab, setTab] = useState<'explore' | 'my'>('explore')
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { applyPrompt, applyModifier } = useCreateRoute()
  const { openLightbox } = useLightbox()

  usePageMeta('Styles & Presets', 'Browse and apply curated style presets to your Studio generations.')

  const stylesQuery = useQuery({
    queryKey: ['styles'],
    queryFn: () => studioApi.listStyles(),
  })
  const saveCatalogStyleMutation = useMutation({
    mutationFn: async ({
      entry,
      favorite = false,
    }: {
      entry: StyleCatalogEntry
      favorite?: boolean
    }) =>
      studioApi.saveStyle({
        title: entry.title,
        prompt_modifier: entry.prompt_modifier,
        description: entry.description,
        category: entry.category,
        preview_image_url: entry.image,
        source_kind: 'catalog',
        source_style_id: entry.id,
        favorite,
      }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['styles'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
      addToast('success', `"${variables.entry.title}" saved to My Styles.`)
    },
    onError: (error) => {
      addToast('error', error instanceof Error ? error.message : 'Style could not be saved.')
    },
  })

  const updateStyleMutation = useMutation({
    mutationFn: async ({ styleId, favorite }: { styleId: string; favorite: boolean }) =>
      studioApi.updateStyle(styleId, { favorite }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['styles'] })
      addToast('success', variables.favorite ? 'Style added to favorites.' : 'Style removed from favorites.')
    },
    onError: (error) => {
      addToast('error', error instanceof Error ? error.message : 'Style could not be updated.')
    },
  })

  const catalog = stylesQuery.data?.catalog ?? []
  const myStyles = stylesQuery.data?.my_styles ?? []
  const filteredCatalog = useMemo(
    () => (activeCategory === 'all' ? catalog : catalog.filter((entry) => entry.category === activeCategory)),
    [activeCategory, catalog],
  )
  const filteredMyStyles = useMemo(
    () => (activeCategory === 'all' ? myStyles : myStyles.filter((style) => style.category === activeCategory)),
    [activeCategory, myStyles],
  )

  const busyStyleId = useMemo(() => {
    if (updateStyleMutation.isPending) return updateStyleMutation.variables?.styleId ?? null
    if (saveCatalogStyleMutation.isPending) return saveCatalogStyleMutation.variables?.entry.saved_style_id ?? saveCatalogStyleMutation.variables?.entry.id ?? null
    return null
  }, [saveCatalogStyleMutation.isPending, saveCatalogStyleMutation.variables, updateStyleMutation.isPending, updateStyleMutation.variables])

  const handleSaveCatalogStyle = async (entry: StyleCatalogEntry, favorite = false) => {
    if (entry.saved && entry.saved_style_id) {
      addToast('info', `"${entry.title}" is already in My Styles.`)
      if (favorite !== entry.favorite) {
        await updateStyleMutation.mutateAsync({ styleId: entry.saved_style_id, favorite })
      }
      return
    }
    await saveCatalogStyleMutation.mutateAsync({ entry, favorite })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-zinc-500">
          <Palette className="h-4 w-4" />
          <span>Style Library</span>
        </div>
        <h1
          className="text-4xl font-semibold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Styles & Presets
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          Apply curated visual directions to your generations, save the looks you reuse, and bring them back into Create without rebuilding them from scratch.
        </p>
      </section>



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
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-[rgb(var(--primary))]' : ''}`} />
              {cat.label}
            </button>
          )
        })}
      </section>

      {tab === 'explore' ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => applyPrompt('soft cinematic lighting, clean composition, tactile detail')}
            className="group flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border border-dashed border-white/[0.15] bg-white/[0.02] p-6 text-center transition-all duration-300 hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.05)]"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full text-zinc-400 ring-1 ring-white/[0.1] transition-transform duration-300 group-hover:scale-110 group-hover:text-white" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.2))' }}>
              <Plus className="h-8 w-8" />
            </div>
            <div className="mt-6 text-xl font-semibold text-white">Start from a fresh style</div>
            <div className="mt-2 text-sm text-zinc-500">Open Create with a clean starting direction, then shape it into your own reusable style.</div>
          </button>

          {filteredCatalog.map((entry) => (
            <CatalogCard
              key={entry.id}
              entry={entry}
              busy={busyStyleId === entry.saved_style_id || saveCatalogStyleMutation.isPending}
              onApply={() => applyPrompt(entry.prompt_modifier)}
              onModifier={() => applyModifier(entry.title, entry.prompt_modifier)}
              onSave={() => void handleSaveCatalogStyle(entry)}
              onFavorite={() => void handleSaveCatalogStyle(entry, !entry.favorite || !entry.saved)}
              onImageClick={() => openLightbox(entry.image, entry.title, { title: entry.title, prompt: entry.prompt_modifier })}
            />
          ))}
        </section>
      ) : filteredMyStyles.length ? (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {filteredMyStyles.map((style) => (
            <SavedStyleCard
              key={style.id}
              style={style}
              catalog={catalog}
              busy={busyStyleId === style.id}
              onApply={() => applyPrompt(style.prompt_modifier)}
              onModifier={() => applyModifier(style.title, style.prompt_modifier)}
              onFavorite={() => void updateStyleMutation.mutateAsync({ styleId: style.id, favorite: !style.favorite })}
            />
          ))}
        </section>
      ) : (
        <section className="flex flex-col items-center justify-center py-20">
          <Palette className="mb-4 h-14 w-14 text-zinc-600" />
          <div className="text-lg font-semibold text-zinc-400">No saved styles yet.</div>
          <p className="mt-2 max-w-md text-center text-zinc-500">
            Save the looks you want to reuse and they will appear here as your own quick-start library.
          </p>
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
