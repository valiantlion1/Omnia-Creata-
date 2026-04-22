import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Heart, Layers, Palette, Pencil, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react'

import { useLightbox } from '@/components/Lightbox'
import { useToast } from '@/components/Toast'
import {
  getCreativeProfileLabel,
  studioApi,
  type ModelCatalogEntry,
  type StudioStyle,
  type StyleCatalogEntry,
} from '@/lib/studioApi'
import { usePageMeta } from '@/lib/usePageMeta'
import { toUserFacingErrorMessage } from '@/lib/uiError'

const categories = [
  { key: 'all', label: 'All Styles', icon: Layers },
  { key: 'photography', label: 'Photography', icon: Wand2 },
  { key: 'illustration', label: 'Illustration', icon: Palette },
  { key: 'abstract', label: 'Abstract', icon: Sparkles },
  { key: '3d', label: '3D Render', icon: Layers },
  { key: 'custom', label: 'Custom', icon: Pencil },
] as const

const aspectRatioOptions = ['1:1', '16:9', '9:16', '4:5', '3:4', '2:3'] as const

type EditableStylePayload = {
  title: string
  prompt_modifier: string
  text_mode: 'modifier' | 'prompt'
  description: string
  category: string
  negative_prompt: string
  preferred_model_id: string | null
  preferred_aspect_ratio: string | null
  preferred_steps: number | null
  preferred_cfg_scale: number | null
  preferred_output_count: number | null
}

function normalizeTextMode(value?: string | null) {
  return value === 'prompt' ? 'prompt' : 'modifier'
}

function previewImageForStyle(style: StudioStyle, catalog: StyleCatalogEntry[]) {
  if (style.preview_image_url) return style.preview_image_url
  const catalogMatch = style.source_style_id ? catalog.find((entry) => entry.id === style.source_style_id) : null
  return catalogMatch?.image ?? null
}

function resolveModelLabel(modelId: string | null | undefined, models: ModelCatalogEntry[]) {
  if (!modelId) return null
  const directMatch = models.find((model) => model.id === modelId)
  return directMatch?.label ?? getCreativeProfileLabel(modelId, modelId)
}

function buildStyleChips(style: StudioStyle, models: ModelCatalogEntry[]) {
  const chips = [
    normalizeTextMode(style.text_mode) === 'prompt' ? 'Prompt starter' : 'Prompt modifier',
  ]

  const modelLabel = resolveModelLabel(style.preferred_model_id, models)
  if (modelLabel) chips.push(modelLabel)
  if (style.preferred_aspect_ratio) chips.push(style.preferred_aspect_ratio)
  if (style.negative_prompt.trim()) chips.push('Has exclusions')
  if (style.preferred_output_count && style.preferred_output_count > 1) {
    chips.push(`${style.preferred_output_count} variations`)
  }
  return chips.slice(0, 4)
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
    applyStyle(style: Pick<
      StudioStyle,
      | 'title'
      | 'prompt_modifier'
      | 'text_mode'
      | 'negative_prompt'
      | 'preferred_model_id'
      | 'preferred_aspect_ratio'
      | 'preferred_steps'
      | 'preferred_cfg_scale'
      | 'preferred_output_count'
    >) {
      const params = new URLSearchParams()
      params.set('source', 'styles')

      if (normalizeTextMode(style.text_mode) === 'prompt') {
        params.set('prompt', style.prompt_modifier)
      } else {
        params.set('style_name', style.title)
        params.set('style_modifier', style.prompt_modifier)
      }

      if (style.negative_prompt?.trim()) params.set('negative_prompt', style.negative_prompt.trim())
      if (style.preferred_model_id) params.set('model', style.preferred_model_id)
      if (style.preferred_aspect_ratio) params.set('aspect_ratio', style.preferred_aspect_ratio)
      if (style.preferred_steps != null) params.set('steps', String(style.preferred_steps))
      if (style.preferred_cfg_scale != null) params.set('cfg_scale', String(style.preferred_cfg_scale))
      if (style.preferred_output_count != null) params.set('output_count', String(style.preferred_output_count))

      navigate(`/create?${params.toString()}`)
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
    <div className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
      <button
        type="button"
        className="relative h-[220px] w-full overflow-hidden text-left"
        onClick={onImageClick}
      >
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
      </button>

      <div className="relative z-20 flex flex-1 flex-col p-6 pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--primary))]">
            {entry.is_omnia ? 'Omnia Official' : 'Community'}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white">{entry.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{entry.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-300">
            Prompt modifier
          </span>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-400">
            Reusable text direction
          </span>
        </div>
        <div className="flex-1" />

        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onApply}
              className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              Open in Create
            </button>
            <button
              onClick={onModifier}
              className="rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white"
            >
              Add only text
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSave}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3 w-3" />
              {entry.saved ? 'Saved to My Styles' : 'Save to My Styles'}
            </button>
            <button
              onClick={onFavorite}
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
  models,
  busy,
  onApply,
  onModifier,
  onFavorite,
  onEdit,
  onDelete,
  onImageClick,
}: {
  style: StudioStyle
  catalog: StyleCatalogEntry[]
  models: ModelCatalogEntry[]
  busy: boolean
  onApply: () => void
  onModifier: () => void
  onFavorite: () => void
  onEdit: () => void
  onDelete: () => void
  onImageClick: () => void
}) {
  const previewImage = previewImageForStyle(style, catalog)
  const chips = buildStyleChips(style, models)

  return (
    <div className="group relative flex min-h-[430px] flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
      <button
        type="button"
        className="relative h-[210px] w-full overflow-hidden text-left"
        onClick={onImageClick}
      >
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
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="rounded-full bg-black/50 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20">Preview</div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
        )}
        <div className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
          {style.category}
        </div>
      </button>

      <div className="flex flex-1 flex-col p-6 pt-0">
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-[rgb(var(--primary-light))]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--primary-light))]">
            {style.source_kind === 'prompt' ? 'Saved from Create' : 'Saved style'}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white">{style.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">{style.description || 'Reusable direction for your next render.'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-zinc-300"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex-1" />

        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onApply}
              className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-black transition hover:opacity-90"
            >
              Use full preset
            </button>
            <button
              onClick={onModifier}
              className="rounded-full bg-white/[0.06] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white"
            >
              Add only text
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onEdit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit details
            </button>
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
            <button
              onClick={onDelete}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
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

function StyleEditorDialog({
  open,
  style,
  models,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  style: StudioStyle | null
  models: ModelCatalogEntry[]
  saving: boolean
  deleting: boolean
  onClose: () => void
  onSave: (payload: EditableStylePayload) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('custom')
  const [promptModifier, setPromptModifier] = useState('')
  const [textMode, setTextMode] = useState<'modifier' | 'prompt'>('modifier')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [preferredModelId, setPreferredModelId] = useState('')
  const [preferredAspectRatio, setPreferredAspectRatio] = useState('')
  const [preferredSteps, setPreferredSteps] = useState('')
  const [preferredCfgScale, setPreferredCfgScale] = useState('')
  const [preferredOutputCount, setPreferredOutputCount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open || !style) return
    setTitle(style.title)
    setDescription(style.description)
    setCategory(style.category || 'custom')
    setPromptModifier(style.prompt_modifier)
    setTextMode(normalizeTextMode(style.text_mode))
    setNegativePrompt(style.negative_prompt ?? '')
    setPreferredModelId(style.preferred_model_id ?? '')
    setPreferredAspectRatio(style.preferred_aspect_ratio ?? '')
    setPreferredSteps(style.preferred_steps != null ? String(style.preferred_steps) : '')
    setPreferredCfgScale(style.preferred_cfg_scale != null ? String(style.preferred_cfg_scale) : '')
    setPreferredOutputCount(style.preferred_output_count != null ? String(style.preferred_output_count) : '')
    setError(null)
    setConfirmDelete(false)
  }, [open, style])

  if (!open || !style) return null

  const normalizedTitle = title.trim()
  const normalizedPromptModifier = promptModifier.trim()
  const normalizedDescription = description.trim()
  const normalizedNegativePrompt = negativePrompt.trim()

  const currentState = JSON.stringify({
    title: style.title,
    description: style.description,
    category: style.category,
    prompt_modifier: style.prompt_modifier,
    text_mode: normalizeTextMode(style.text_mode),
    negative_prompt: style.negative_prompt ?? '',
    preferred_model_id: style.preferred_model_id ?? '',
    preferred_aspect_ratio: style.preferred_aspect_ratio ?? '',
    preferred_steps: style.preferred_steps != null ? String(style.preferred_steps) : '',
    preferred_cfg_scale: style.preferred_cfg_scale != null ? String(style.preferred_cfg_scale) : '',
    preferred_output_count: style.preferred_output_count != null ? String(style.preferred_output_count) : '',
  })

  const draftState = JSON.stringify({
    title: normalizedTitle,
    description: normalizedDescription,
    category,
    prompt_modifier: normalizedPromptModifier,
    text_mode: textMode,
    negative_prompt: normalizedNegativePrompt,
    preferred_model_id: preferredModelId,
    preferred_aspect_ratio: preferredAspectRatio,
    preferred_steps: preferredSteps.trim(),
    preferred_cfg_scale: preferredCfgScale.trim(),
    preferred_output_count: preferredOutputCount.trim(),
  })

  const canSave = normalizedTitle.length > 0 && normalizedPromptModifier.length > 0 && currentState !== draftState

  const handleSave = async () => {
    setError(null)

    const parsedSteps = preferredSteps.trim() ? Number.parseInt(preferredSteps.trim(), 10) : null
    const parsedCfgScale = preferredCfgScale.trim() ? Number.parseFloat(preferredCfgScale.trim()) : null
    const parsedOutputCount = preferredOutputCount.trim() ? Number.parseInt(preferredOutputCount.trim(), 10) : null

    if (parsedSteps != null && (!Number.isFinite(parsedSteps) || parsedSteps < 1 || parsedSteps > 50)) {
      setError('Steps must stay between 1 and 50.')
      return
    }
    if (parsedCfgScale != null && (!Number.isFinite(parsedCfgScale) || parsedCfgScale < 1 || parsedCfgScale > 20)) {
      setError('Guidance must stay between 1 and 20.')
      return
    }
    if (parsedOutputCount != null && (!Number.isFinite(parsedOutputCount) || parsedOutputCount < 1 || parsedOutputCount > 4)) {
      setError('Variations must stay between 1 and 4.')
      return
    }

    try {
      await onSave({
        title: normalizedTitle,
        prompt_modifier: normalizedPromptModifier,
        text_mode: textMode,
        description: normalizedDescription,
        category,
        negative_prompt: normalizedNegativePrompt,
        preferred_model_id: preferredModelId.trim() || null,
        preferred_aspect_ratio: preferredAspectRatio || null,
        preferred_steps: parsedSteps,
        preferred_cfg_scale: parsedCfgScale,
        preferred_output_count: parsedOutputCount,
      })
      onClose()
    } catch (saveError) {
      setError(toUserFacingErrorMessage(saveError, 'Style changes could not be saved.'))
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await onDelete()
      onClose()
    } catch (deleteError) {
      setError(toUserFacingErrorMessage(deleteError, 'Style could not be removed.'))
    }
  }

  const promptLabel = textMode === 'prompt' ? 'Starter prompt' : 'Prompt modifier'
  const promptHint =
    textMode === 'prompt'
      ? 'This becomes the starting prompt when you open Create from this style.'
      : 'This gets layered into a new prompt when you open Create from this style.'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit style"
        className="w-full max-w-4xl overflow-hidden rounded-[28px] bg-[#0c0d12]/95 shadow-[0_40px_140px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]"
      >
        <div className="border-b border-white/[0.06] px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">My Styles</p>
              <h2 className="mt-2 text-[1.6rem] font-bold tracking-tight text-white">Edit style</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                Styles can carry reusable text direction plus the Create defaults you want to keep around, such as model, ratio, guidance, and exclusions.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                <X className="h-4 w-4" />
                Close
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave || saving}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_320px]">
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Style name</span>
                <input
                  aria-label="Style name"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={72}
                  className="mt-2 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                />
              </label>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Category</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories
                    .filter((entry) => entry.key !== 'all')
                    .map((entry) => {
                      const active = category === entry.key
                      return (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => setCategory(entry.key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            active
                              ? 'bg-white text-black'
                              : 'border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          {entry.label}
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Description</span>
              <textarea
                aria-label="Style description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={240}
                className="mt-2 w-full resize-none rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
              />
            </label>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Prompt behavior</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {([
                  { value: 'modifier', label: 'Prompt modifier', description: 'Layer this into another prompt.' },
                  { value: 'prompt', label: 'Prompt starter', description: 'Open Create with this as the base prompt.' },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTextMode(option.value)}
                    className={`rounded-[18px] border px-4 py-3 text-left transition ${
                      textMode === option.value
                        ? 'border-white/20 bg-white text-black'
                        : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <div className="text-sm font-semibold">{option.label}</div>
                    <div className={`mt-1 text-xs leading-5 ${textMode === option.value ? 'text-black/70' : 'text-zinc-500'}`}>{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{promptLabel}</span>
              <textarea
                aria-label={promptLabel}
                value={promptModifier}
                onChange={(event) => setPromptModifier(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
              />
              <p className="mt-2 text-xs leading-6 text-zinc-500">{promptHint}</p>
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Negative prompt</span>
              <textarea
                aria-label="Negative prompt"
                value={negativePrompt}
                onChange={(event) => setNegativePrompt(event.target.value)}
                rows={3}
                className="mt-2 w-full resize-none rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                placeholder="Things this style should keep avoiding."
              />
            </label>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Create defaults</p>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-zinc-400">Preferred model</span>
                  <select
                    aria-label="Preferred model"
                    value={preferredModelId}
                    onChange={(event) => setPreferredModelId(event.target.value)}
                    className="mt-2 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                  >
                    <option value="">Stay flexible</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-xs font-medium text-zinc-400">Preferred ratio</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreferredAspectRatio('')}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        preferredAspectRatio === ''
                          ? 'bg-white text-black'
                          : 'border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      Flexible
                    </button>
                    {aspectRatioOptions.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setPreferredAspectRatio(ratio)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          preferredAspectRatio === ratio
                            ? 'bg-white text-black'
                            : 'border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-400">Steps</span>
                    <input
                      aria-label="Preferred steps"
                      type="number"
                      min={1}
                      max={50}
                      value={preferredSteps}
                      onChange={(event) => setPreferredSteps(event.target.value)}
                      className="mt-2 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                      placeholder="Auto"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-400">Guidance</span>
                    <input
                      aria-label="Preferred guidance"
                      type="number"
                      min={1}
                      max={20}
                      step={0.5}
                      value={preferredCfgScale}
                      onChange={(event) => setPreferredCfgScale(event.target.value)}
                      className="mt-2 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                      placeholder="Auto"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-zinc-400">Variations</span>
                    <input
                      aria-label="Preferred variations"
                      type="number"
                      min={1}
                      max={4}
                      value={preferredOutputCount}
                      onChange={(event) => setPreferredOutputCount(event.target.value)}
                      className="mt-2 w-full rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]"
                      placeholder="Auto"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Library controls</p>
              <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-zinc-300">
                <Heart className={`h-4 w-4 ${style.favorite ? 'fill-current text-rose-300' : 'text-zinc-500'}`} />
                {style.favorite ? 'This style is pinned as a favorite.' : 'Favorite it from the card if you want faster recall.'}
              </div>

              {confirmDelete ? (
                <div className="mt-4 rounded-[18px] border border-rose-500/20 bg-rose-500/8 p-4">
                  <div className="text-sm font-semibold text-rose-200">Remove this saved style?</div>
                  <p className="mt-2 text-sm leading-6 text-rose-100/80">
                    This only removes the preset from My Styles. It does not delete images or projects.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    >
                      Keep style
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete()}
                      disabled={deleting}
                      className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deleting ? 'Removing...' : 'Delete style'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove style
                </button>
              )}
            </section>

            {error ? (
              <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function ElementsPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [tab, setTab] = useState<'explore' | 'my'>('explore')
  const [editingStyle, setEditingStyle] = useState<StudioStyle | null>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { applyPrompt, applyModifier, applyStyle } = useCreateRoute()
  const { openLightbox } = useLightbox()

  usePageMeta('Styles & Presets', 'Browse and apply curated style presets to your Studio generations.')

  const stylesQuery = useQuery({
    queryKey: ['styles'],
    queryFn: () => studioApi.listStyles(),
  })
  const modelsQuery = useQuery({
    queryKey: ['models', 'styles'],
    queryFn: () => studioApi.listModels(),
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
        text_mode: normalizeTextMode(entry.text_mode),
        description: entry.description,
        category: entry.category,
        preview_image_url: entry.image,
        negative_prompt: entry.negative_prompt ?? '',
        preferred_model_id: entry.preferred_model_id ?? null,
        preferred_aspect_ratio: entry.preferred_aspect_ratio ?? null,
        preferred_steps: entry.preferred_steps ?? null,
        preferred_cfg_scale: entry.preferred_cfg_scale ?? null,
        preferred_output_count: entry.preferred_output_count ?? null,
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
      addToast('error', toUserFacingErrorMessage(error, 'Style could not be saved.'))
    },
  })

  const updateStyleMutation = useMutation({
    mutationFn: async ({ styleId, payload }: { styleId: string; payload: Partial<EditableStylePayload> & { favorite?: boolean } }) =>
      studioApi.updateStyle(styleId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['styles'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
      if (variables.payload.favorite === true) {
        addToast('success', 'Style added to favorites.')
      } else if (variables.payload.favorite === false) {
        addToast('success', 'Style removed from favorites.')
      } else {
        addToast('success', 'Style details updated.')
      }
    },
    onError: (error) => {
      addToast('error', toUserFacingErrorMessage(error, 'Style could not be updated.'))
    },
  })

  const deleteStyleMutation = useMutation({
    mutationFn: async ({ styleId }: { styleId: string }) => studioApi.deleteStyle(styleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['styles'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
      addToast('success', 'Style removed from My Styles.')
    },
    onError: (error) => {
      addToast('error', toUserFacingErrorMessage(error, 'Style could not be removed.'))
    },
  })

  const catalog = stylesQuery.data?.catalog ?? []
  const myStyles = stylesQuery.data?.my_styles ?? []
  const models = modelsQuery.data?.models ?? []

  const filteredCatalog = useMemo(
    () => (activeCategory === 'all' ? catalog : catalog.filter((entry) => entry.category === activeCategory)),
    [activeCategory, catalog],
  )
  const filteredMyStyles = useMemo(
    () => (activeCategory === 'all' ? myStyles : myStyles.filter((style) => style.category === activeCategory)),
    [activeCategory, myStyles],
  )

  const busyStyleId = useMemo(() => {
    if (deleteStyleMutation.isPending) return deleteStyleMutation.variables?.styleId ?? null
    if (updateStyleMutation.isPending) return updateStyleMutation.variables?.styleId ?? null
    if (saveCatalogStyleMutation.isPending) {
      return saveCatalogStyleMutation.variables?.entry.saved_style_id ?? saveCatalogStyleMutation.variables?.entry.id ?? null
    }
    return null
  }, [
    deleteStyleMutation.isPending,
    deleteStyleMutation.variables,
    saveCatalogStyleMutation.isPending,
    saveCatalogStyleMutation.variables,
    updateStyleMutation.isPending,
    updateStyleMutation.variables,
  ])

  const handleSaveCatalogStyle = async (entry: StyleCatalogEntry, favorite = false) => {
    if (entry.saved && entry.saved_style_id) {
      addToast('info', `"${entry.title}" is already in My Styles.`)
      if (favorite !== entry.favorite) {
        await updateStyleMutation.mutateAsync({ styleId: entry.saved_style_id, payload: { favorite } })
      }
      return
    }
    await saveCatalogStyleMutation.mutateAsync({ entry, favorite })
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-zinc-500">
            <Palette className="h-4 w-4" />
            <span>Style Library</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-[40px]">
            Styles & Presets
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-400">
            Explore curated visual directions and keep the ones you reuse. Styles carry your preferred prompts, exclusions, and Create settings.
          </p>
        </section>

        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] p-1 backdrop-blur-md">
            <button
              onClick={() => setTab('explore')}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                tab === 'explore'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => setTab('my')}
              className={`relative rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                tab === 'my'
                  ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
              }`}
            >
              My Styles
            </button>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/[0.04] bg-white/[0.02] p-1 backdrop-blur-md overflow-x-auto scrollbar-hide">
            {categories.map((cat) => {
              const Icon = cat.icon
              const active = activeCategory === cat.key
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`relative flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                    active
                      ? 'bg-white/[0.08] text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-1 ring-white/[0.12]'
                      : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-zinc-500'}`} />
                  {cat.label}
                </button>
              )
            })}
          </div>
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
              <div className="mt-2 text-sm text-zinc-500">Open Create with a clean starting direction, then save the version that becomes worth reusing.</div>
            </button>

            {filteredCatalog.map((entry) => (
              <CatalogCard
                key={entry.id}
                entry={entry}
                busy={busyStyleId === entry.saved_style_id || saveCatalogStyleMutation.isPending}
                onApply={() =>
                  applyStyle({
                    title: entry.title,
                    prompt_modifier: entry.prompt_modifier,
                    text_mode: normalizeTextMode(entry.text_mode),
                    negative_prompt: entry.negative_prompt ?? '',
                    preferred_model_id: entry.preferred_model_id ?? null,
                    preferred_aspect_ratio: entry.preferred_aspect_ratio ?? null,
                    preferred_steps: entry.preferred_steps ?? null,
                    preferred_cfg_scale: entry.preferred_cfg_scale ?? null,
                    preferred_output_count: entry.preferred_output_count ?? null,
                  })
                }
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
                models={models}
                busy={busyStyleId === style.id}
                onApply={() => applyStyle(style)}
                onModifier={() => applyModifier(style.title, style.prompt_modifier)}
                onFavorite={() => void updateStyleMutation.mutateAsync({ styleId: style.id, payload: { favorite: !style.favorite } })}
                onEdit={() => setEditingStyle(style)}
                onDelete={() => setEditingStyle(style)}
                onImageClick={() => {
                  const previewImage = previewImageForStyle(style, catalog)
                  if (!previewImage) return
                  openLightbox(previewImage, style.title, { title: style.title, prompt: style.prompt_modifier })
                }}
              />
            ))}
          </section>
        ) : (
          <section className="flex flex-col items-center justify-center py-20">
            <Palette className="mb-4 h-14 w-14 text-zinc-600" />
            <div className="text-lg font-semibold text-zinc-400">No saved styles yet.</div>
            <p className="mt-2 max-w-md text-center text-zinc-500">
              Save the looks you want to reuse and they will appear here as real Create presets, not just loose notes.
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

      <StyleEditorDialog
        open={editingStyle !== null}
        style={editingStyle}
        models={models}
        saving={updateStyleMutation.isPending}
        deleting={deleteStyleMutation.isPending}
        onClose={() => setEditingStyle(null)}
        onSave={(payload) => {
          if (!editingStyle) return Promise.resolve()
          return updateStyleMutation.mutateAsync({ styleId: editingStyle.id, payload }).then(() => undefined)
        }}
        onDelete={() => {
          if (!editingStyle) return Promise.resolve()
          return deleteStyleMutation.mutateAsync({ styleId: editingStyle.id }).then(() => undefined)
        }}
      />
    </>
  )
}
