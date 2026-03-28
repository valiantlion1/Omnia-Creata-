import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Folder, Grid2X2, Heart, Image as ImageIcon, List, MoreHorizontal, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react'

import { AppPage, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type Generation, type MediaAsset, type Project } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type LibrarySection = 'images' | 'collections' | 'likes' | 'trash'
type ViewMode = 'grid' | 'list'
type ImageFilter = 'all' | 'processing' | 'recent'
type CollectionFilter = 'all' | 'with-work' | 'empty'
type TrashFilter = 'all' | 'recent'

type ConfirmState =
  | { kind: 'permanent-delete'; asset: MediaAsset }
  | { kind: 'empty-trash'; count: number }
  | null

type AssetGroup = {
  id: string
  title: string
  prompt: string
  model: string
  createdAt: string
  projectId: string
  projectTitle: string
  items: MediaAsset[]
}

const imageFilters: Array<{ id: ImageFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'recent', label: 'Recent' },
]

const collectionFilters: Array<{ id: CollectionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'with-work', label: 'With work' },
  { id: 'empty', label: 'Empty' },
]

const trashFilters: Array<{ id: TrashFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'recent', label: 'Recent' },
]

function matchesQuery(query: string, ...parts: Array<string | null | undefined>) {
  if (!query.trim()) return true
  const normalized = query.trim().toLowerCase()
  return parts.some((value) => value?.toLowerCase().includes(normalized))
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function variantOrder(asset: MediaAsset) {
  const raw = Number((asset.metadata as Record<string, unknown>).variation_index ?? 0)
  return Number.isFinite(raw) ? raw : 0
}

function ConfirmDialog({
  state,
  busy,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!state) return null

  const title = state.kind === 'empty-trash' ? 'Empty trash?' : 'Delete forever?'
  const body =
    state.kind === 'empty-trash'
      ? `This will permanently remove ${state.count} item${state.count > 1 ? 's' : ''} from Trash. This cannot be undone.`
      : `"${state.asset.title}" will be removed permanently. This cannot be undone.`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#101115] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">{title}</div>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
          </div>
          <button
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-zinc-300 transition hover:text-white">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Working...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InlineActionMenu({ children }: { children: ReactNode }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-2 min-w-[220px] bg-[#111216] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.48)] ring-1 ring-white/8">
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function MenuAction({
  children,
  tone = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'default' | 'danger' }) {
  return (
    <button
      {...props}
      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
        tone === 'danger'
          ? 'text-rose-300 hover:bg-rose-500/[0.08] hover:text-rose-200'
          : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
      } ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${value === 'grid' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${value === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function FilterBar<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`rounded-full px-3 py-1.5 text-xs transition ${value === option.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Toolbar({
  title,
  description,
  search,
  onSearchChange,
  view,
  onViewChange,
  filters,
  actions,
}: {
  title: string
  description: string
  search: string
  onSearchChange: (value: string) => void
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  filters?: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="border-b border-white/[0.06] pb-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">{description}</p>
          {filters ? <div className="mt-4">{filters}</div> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <label className="flex min-w-[220px] items-center gap-2 rounded-full bg-white/[0.03] px-3.5 py-2.5 text-sm text-zinc-400 ring-1 ring-white/8">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
            />
          </label>
          <ViewToggle value={view} onChange={onViewChange} />
          {actions}
        </div>
      </div>
    </section>
  )
}

function EmptyInline({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.03] text-zinc-300 ring-1 ring-white/8">{icon}</div>
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="max-w-xl text-sm leading-7 text-zinc-500">{description}</div>
    </section>
  )
}

function PendingPreview({ generation, view }: { generation: Generation; view: ViewMode }) {
  const detail = generation.status === 'processing' ? 'Processing preview...' : 'Queued for render...'

  if (view === 'grid') {
    return (
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-[22px] bg-white/[0.03]">
          <div className="aspect-[4/5] w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.6))]" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{generation.title}</div>
          <div className="mt-1 text-xs text-zinc-500">{detail}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 py-3">
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))]" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{generation.title}</div>
        <div className="mt-1 text-xs text-zinc-500">{detail}</div>
      </div>
    </div>
  )
}

export default function MediaLibraryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const [search, setSearch] = useState('')
  const [views, setViews] = useState<Record<LibrarySection, ViewMode>>({
    images: 'grid',
    collections: 'grid',
    likes: 'grid',
    trash: 'grid',
  })
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all')
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all')
  const [trashFilter, setTrashFilter] = useState<TrashFilter>('all')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)

  const section = useMemo<LibrarySection>(() => {
    if (location.pathname.startsWith('/library/collections')) return 'collections'
    if (location.pathname.startsWith('/library/likes')) return 'likes'
    if (location.pathname.startsWith('/library/trash')) return 'trash'
    return 'images'
  }, [location.pathname])

  const assetsQuery = useQuery({
    queryKey: ['assets', 'library', 'all'],
    queryFn: () => studioApi.listAssets(undefined, true),
    enabled: canLoadPrivate,
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', 'library'],
    queryFn: () => studioApi.listProjects(),
    enabled: canLoadPrivate,
  })

  const generationsQuery = useQuery({
    queryKey: ['generations', 'library', 'all'],
    queryFn: () => studioApi.listGenerations(),
    enabled: canLoadPrivate,
    refetchInterval: 2000,
  })

  async function invalidateLibrary() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['assets'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['generations'] }),
      queryClient.invalidateQueries({ queryKey: ['public-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ])
  }

  const restoreAssetMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.restoreAsset(assetId),
    onSuccess: invalidateLibrary,
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.permanentlyDeleteAsset(assetId),
    onSuccess: async () => {
      setConfirmState(null)
      await invalidateLibrary()
    },
  })

  const emptyTrashMutation = useMutation({
    mutationFn: () => studioApi.emptyTrash(),
    onSuccess: async () => {
      setConfirmState(null)
      await invalidateLibrary()
    },
  })

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, payload }: { postId: string; payload: { title?: string; visibility?: 'public' | 'private' } }) =>
      studioApi.updatePost(postId, payload),
    onSuccess: invalidateLibrary,
  })

  const movePostMutation = useMutation({
    mutationFn: ({ postId, projectId }: { postId: string; projectId: string }) => studioApi.movePost(postId, { project_id: projectId }),
    onSuccess: invalidateLibrary,
  })

  const trashPostMutation = useMutation({
    mutationFn: (postId: string) => studioApi.trashPost(postId),
    onSuccess: invalidateLibrary,
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, title, description }: { projectId: string; title: string; description?: string }) =>
      studioApi.updateProject(projectId, { title, description }),
    onSuccess: invalidateLibrary,
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => studioApi.deleteProject(projectId),
    onSuccess: invalidateLibrary,
  })

  const menuBusy =
    permanentDeleteMutation.isPending ||
    emptyTrashMutation.isPending ||
    updatePostMutation.isPending ||
    movePostMutation.isPending ||
    trashPostMutation.isPending ||
    updateProjectMutation.isPending ||
    deleteProjectMutation.isPending

  const assets = assetsQuery.data?.assets ?? []
  const projects = projectsQuery.data?.projects ?? []
  const generations = generationsQuery.data?.generations ?? []
  const activeAssets = assets.filter((asset) => !asset.deleted_at)
  const trashedAssets = assets.filter((asset) => Boolean(asset.deleted_at))
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects])
  const assetsByProject = useMemo(() => {
    const next = new Map<string, MediaAsset[]>()
    for (const asset of activeAssets) {
      const existing = next.get(asset.project_id) ?? []
      existing.push(asset)
      next.set(asset.project_id, existing)
    }
    return next
  }, [activeAssets])

  const groupedAssets = useMemo<AssetGroup[]>(() => {
    const groups = new Map<string, AssetGroup>()

    for (const asset of [...activeAssets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())) {
      const metadata = asset.metadata as Record<string, unknown>
      const groupId = String(metadata.generation_id ?? asset.id)
      const project = projectMap.get(asset.project_id)
      const existing = groups.get(groupId)

      if (existing) {
        existing.items.push(asset)
        continue
      }

      groups.set(groupId, {
        id: groupId,
        title: String(metadata.generation_title ?? asset.title ?? 'Untitled set'),
        prompt: asset.prompt || 'Saved Studio result',
        model: String(metadata.model ?? 'Image'),
        createdAt: asset.created_at,
        projectId: asset.project_id,
        projectTitle: project?.title ?? 'Project',
        items: [asset],
      })
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => variantOrder(a) - variantOrder(b)),
    }))
  }, [activeAssets, projectMap])

  const pendingGenerations = useMemo(
    () =>
      generations
        .filter((generation) => generation.status === 'pending' || generation.status === 'processing')
        .filter((generation) => matchesQuery(search, generation.title, generation.prompt_snapshot.prompt, generation.model)),
    [generations, search],
  )

  const filteredImageGroups = useMemo(
    () =>
      groupedAssets.filter((group) => {
        if (!matchesQuery(search, group.title, group.prompt, group.model, group.projectTitle)) return false
        if (imageFilter === 'recent') return Date.now() - new Date(group.createdAt).getTime() <= 1000 * 60 * 60 * 24 * 3
        if (imageFilter === 'processing') return false
        return true
      }),
    [groupedAssets, imageFilter, search],
  )

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const projectAssets = assetsByProject.get(project.id) ?? []
        if (!matchesQuery(search, project.title, project.description)) return false
        if (collectionFilter === 'with-work') return projectAssets.length > 0
        if (collectionFilter === 'empty') return projectAssets.length === 0
        return true
      }),
    [assetsByProject, collectionFilter, projects, search],
  )

  const filteredTrash = useMemo(
    () =>
      trashedAssets.filter((asset) => {
        if (!matchesQuery(search, asset.title, asset.prompt)) return false
        if (trashFilter === 'recent' && asset.deleted_at) {
          return Date.now() - new Date(asset.deleted_at).getTime() <= 1000 * 60 * 60 * 24 * 3
        }
        return true
      }),
    [search, trashFilter, trashedAssets],
  )

  const activeView = views[section]
  const isBusy = permanentDeleteMutation.isPending || emptyTrashMutation.isPending

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-library-menu-root="true"]')) return
      setActionMenu(null)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const openComposeWith = (params: Record<string, string>) => {
    const next = new URLSearchParams(params)
    navigate(`/create?${next.toString()}`)
  }

  const handleMenuError = (error: unknown) => {
    window.alert(error instanceof Error ? error.message : 'That action could not be completed.')
  }

  if (isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading library...</div>
  }

  if (!canLoadPrivate) {
    return (
      <AppPage className="max-w-[1180px] py-8">
        <EmptyInline
          icon={<ImageIcon className="h-4 w-4" />}
          title="Your Library unlocks after sign in."
          description="Saved images, collections, favorites, and trash only appear once you are inside Studio."
        />
      </AppPage>
    )
  }

  return (
    <>
      <AppPage className="max-w-[1500px] gap-6 py-4">
        {section === 'images' ? (
          <>
            <Toolbar
              title="My Images"
              description="Finished results stay here. Running generations preview here until they complete."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, images: view }))}
              filters={<FilterBar options={imageFilters} value={imageFilter} onChange={setImageFilter} />}
            />

            {pendingGenerations.length ? (
              <section className="border-b border-white/[0.06] pb-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-sm font-medium text-white">In progress</div>
                  <StatusPill tone="brand">{pendingGenerations.length} running</StatusPill>
                </div>
                <div className={activeView === 'grid' ? 'mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'mt-4 divide-y divide-white/[0.06]'}>
                  {pendingGenerations.map((generation) => (
                    <PendingPreview key={generation.job_id} generation={generation} view={activeView} />
                  ))}
                </div>
              </section>
            ) : null}

            {imageFilter === 'processing' ? (
              pendingGenerations.length ? null : (
                <EmptyInline
                  icon={<Sparkles className="h-4 w-4" />}
                  title="Nothing is rendering right now."
                  description="Start a new generation from Compose and it will preview here until it lands in Library."
                />
              )
            ) : filteredImageGroups.length ? (
              <section className="space-y-8">
                {filteredImageGroups.map((group) => (
                  <section key={group.id} className="border-b border-white/[0.06] pb-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold text-white">{group.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span>{formatDate(group.createdAt)}</span>
                          <span>/</span>
                          <span>{group.model}</span>
                          <span>/</span>
                          <span>{group.items.length} variation{group.items.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="mt-2 max-w-4xl text-sm leading-7 text-zinc-500">{group.prompt}</div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Link to={`/projects/${group.projectId}`} className="pt-1 text-sm text-white transition hover:text-zinc-200">
                          {group.projectTitle}
                        </Link>
                        <div className="relative" data-library-menu-root="true">
                          <button
                            onClick={() => setActionMenu((current) => (current === `post:${group.id}` ? null : `post:${group.id}`))}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                            title="Image set actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `post:${group.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  const nextTitle = window.prompt('Rename image set', group.title)
                                  if (!nextTitle || nextTitle === group.title) return
                                  try {
                                    await updatePostMutation.mutateAsync({ postId: group.id, payload: { title: nextTitle } })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Rename
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openComposeWith({ prompt: group.prompt, model: group.model, projectId: group.projectId })
                                  setActionMenu(null)
                                }}
                              >
                                Reuse prompt
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openComposeWith({ model: group.model, projectId: group.projectId })
                                  setActionMenu(null)
                                }}
                              >
                                Reuse style
                              </MenuAction>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await updatePostMutation.mutateAsync({ postId: group.id, payload: { visibility: 'public' } })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Set public
                              </MenuAction>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await updatePostMutation.mutateAsync({ postId: group.id, payload: { visibility: 'private' } })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Set private
                              </MenuAction>
                              {(projects.filter((project) => project.id !== group.projectId)).map((project) => (
                                <MenuAction
                                  key={project.id}
                                  disabled={menuBusy}
                                  onClick={async () => {
                                    try {
                                      await movePostMutation.mutateAsync({ postId: group.id, projectId: project.id })
                                      setActionMenu(null)
                                    } catch (error) {
                                      handleMenuError(error)
                                    }
                                  }}
                                >
                                  Move to {project.title}
                                </MenuAction>
                              ))}
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={async () => {
                                  try {
                                    await trashPostMutation.mutateAsync(group.id)
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Move to trash
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {activeView === 'grid' ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                        {group.items.map((asset) => (
                          <div key={asset.id} className="space-y-3">
                            <Link to={`/projects/${asset.project_id}`} className="block overflow-hidden rounded-[22px] bg-white/[0.03]">
                              <img
                                src={asset.thumbnail_url ?? asset.url}
                                alt={asset.title}
                                className="aspect-[4/5] w-full object-cover transition duration-300 hover:scale-[1.02]"
                              />
                            </Link>
                            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                              <span>V{variantOrder(asset) + 1}</span>
                              <span className="truncate">{asset.title}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 divide-y divide-white/[0.06]">
                        {group.items.map((asset) => (
                          <div key={asset.id} className="flex items-center gap-4 py-3">
                            <Link to={`/projects/${asset.project_id}`} className="block h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
                              <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-full w-full object-cover" />
                            </Link>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                              <div className="mt-1 text-xs text-zinc-500">Variation {variantOrder(asset) + 1}</div>
                            </div>
                            <Link to={`/projects/${asset.project_id}`} className="text-sm text-white transition hover:text-zinc-200">
                              Open
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </section>
            ) : (
              <EmptyInline icon={<ImageIcon className="h-4 w-4" />} title="No images yet." description="Generate something in Compose and it will land here automatically." />
            )}
          </>
        ) : null}

        {section === 'collections' ? (
          <>
            <Toolbar
              title="Collections"
              description="Projects keep related images together so you can return to them later without digging."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, collections: view }))}
              filters={<FilterBar options={collectionFilters} value={collectionFilter} onChange={setCollectionFilter} />}
            />

            {filteredProjects.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    const cover = projectAssets[0]
                    return (
                      <div key={project.id} className="space-y-3">
                        <div className="relative" data-library-menu-root="true">
                          <Link to={`/projects/${project.id}`} className="block overflow-hidden rounded-[22px] bg-white/[0.03]">
                            {cover ? (
                              <img src={cover.thumbnail_url ?? cover.url} alt={project.title} className="aspect-[16/10] w-full object-cover transition duration-300 hover:scale-[1.02]" />
                            ) : (
                              <div className="flex aspect-[16/10] items-center justify-center bg-white/[0.02] text-zinc-600">
                                <Folder className="h-5 w-5" />
                              </div>
                            )}
                          </Link>
                          <button
                            onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur transition hover:bg-black/50 hover:text-white"
                            title="Collection actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenu === `project:${project.id}` ? (
                            <InlineActionMenu>
                              <MenuAction
                                disabled={menuBusy}
                                onClick={async () => {
                                  const nextTitle = window.prompt('Rename collection', project.title)
                                  if (!nextTitle || nextTitle === project.title) return
                                  try {
                                    await updateProjectMutation.mutateAsync({ projectId: project.id, title: nextTitle, description: project.description })
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Rename
                              </MenuAction>
                              <MenuAction
                                onClick={() => {
                                  openComposeWith({ projectId: project.id })
                                  setActionMenu(null)
                                }}
                              >
                                Open in Compose
                              </MenuAction>
                              <MenuAction
                                tone="danger"
                                disabled={menuBusy}
                                onClick={async () => {
                                  if (!window.confirm(`Delete "${project.title}"? Empty collections can be removed permanently.`)) return
                                  try {
                                    await deleteProjectMutation.mutateAsync(project.id)
                                    setActionMenu(null)
                                  } catch (error) {
                                    handleMenuError(error)
                                  }
                                }}
                              >
                                Delete
                              </MenuAction>
                            </InlineActionMenu>
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{project.title}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {projectAssets.length} image{projectAssets.length !== 1 ? 's' : ''} / {formatDate(project.updated_at)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              ) : (
                <section className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {filteredProjects.map((project) => {
                    const projectAssets = assetsByProject.get(project.id) ?? []
                    return (
                      <div key={project.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                        <Link to={`/projects/${project.id}`} className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">{project.title}</div>
                          <div className="mt-1 text-xs text-zinc-500">{project.description || 'No description yet.'}</div>
                        </Link>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-zinc-500">
                            {projectAssets.length} image{projectAssets.length !== 1 ? 's' : ''} / {formatDate(project.updated_at)}
                          </div>
                          <div className="relative" data-library-menu-root="true">
                            <button
                              onClick={() => setActionMenu((current) => (current === `project:${project.id}` ? null : `project:${project.id}`))}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {actionMenu === `project:${project.id}` ? (
                              <InlineActionMenu>
                                <MenuAction
                                  disabled={menuBusy}
                                  onClick={async () => {
                                    const nextTitle = window.prompt('Rename collection', project.title)
                                    if (!nextTitle || nextTitle === project.title) return
                                    try {
                                      await updateProjectMutation.mutateAsync({ projectId: project.id, title: nextTitle, description: project.description })
                                      setActionMenu(null)
                                    } catch (error) {
                                      handleMenuError(error)
                                    }
                                  }}
                                >
                                  Rename
                                </MenuAction>
                                <MenuAction
                                  onClick={() => {
                                    openComposeWith({ projectId: project.id })
                                    setActionMenu(null)
                                  }}
                                >
                                  Open in Compose
                                </MenuAction>
                                <MenuAction
                                  tone="danger"
                                  disabled={menuBusy}
                                  onClick={async () => {
                                    if (!window.confirm(`Delete "${project.title}"? Empty collections can be removed permanently.`)) return
                                    try {
                                      await deleteProjectMutation.mutateAsync(project.id)
                                      setActionMenu(null)
                                    } catch (error) {
                                      handleMenuError(error)
                                    }
                                  }}
                                >
                                  Delete
                                </MenuAction>
                              </InlineActionMenu>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            ) : (
              <EmptyInline icon={<Folder className="h-4 w-4" />} title="No collections yet." description="Collections appear as your projects start holding real work." />
            )}
          </>
        ) : null}

        {section === 'likes' ? (
          <>
            <Toolbar
              title="Favorites"
              description="Pinned and saved visuals can live here later. For now this surface stays intentionally clean."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, likes: view }))}
            />
            <EmptyInline
              icon={<Heart className="h-4 w-4" />}
              title="No favorites yet."
              description="When you start saving references or favorite generations, they will show up here."
            />
          </>
        ) : null}

        {section === 'trash' ? (
          <>
            <Toolbar
              title="Trash"
              description="Deleted images stay here until you restore them or remove them forever."
              search={search}
              onSearchChange={setSearch}
              view={activeView}
              onViewChange={(view) => setViews((current) => ({ ...current, trash: view }))}
              filters={<FilterBar options={trashFilters} value={trashFilter} onChange={setTrashFilter} />}
              actions={
                filteredTrash.length ? (
                  <button
                    onClick={() => setConfirmState({ kind: 'empty-trash', count: filteredTrash.length })}
                    className="rounded-full bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Empty trash
                  </button>
                ) : null
              }
            />

            {filteredTrash.length ? (
              activeView === 'grid' ? (
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredTrash.map((asset) => (
                    <div key={asset.id} className="space-y-3">
                      <div className="relative overflow-hidden rounded-[22px] bg-white/[0.03]" data-library-menu-root="true">
                        <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/5] w-full object-cover opacity-75" />
                        <button
                          onClick={() => setActionMenu((current) => (current === `trash:${asset.id}` ? null : `trash:${asset.id}`))}
                          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-zinc-300 backdrop-blur transition hover:bg-black/50 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === `trash:${asset.id}` ? (
                          <InlineActionMenu>
                            <MenuAction
                              disabled={menuBusy}
                              onClick={() => {
                                restoreAssetMutation.mutate(asset.id)
                                setActionMenu(null)
                              }}
                            >
                              Restore
                            </MenuAction>
                            <MenuAction
                              tone="danger"
                              onClick={() => {
                                setConfirmState({ kind: 'permanent-delete', asset })
                                setActionMenu(null)
                              }}
                            >
                              Delete forever
                            </MenuAction>
                          </InlineActionMenu>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                        <div className="text-xs text-zinc-500">Deleted {asset.deleted_at ? formatDate(asset.deleted_at) : 'recently'}</div>
                      </div>
                    </div>
                  ))}
                </section>
              ) : (
                <section className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                  {filteredTrash.map((asset) => (
                    <div key={asset.id} className="flex flex-wrap items-center gap-4 py-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.03]">
                        <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="h-full w-full object-cover opacity-80" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{asset.title}</div>
                        <div className="mt-1 text-xs text-zinc-500">Deleted {asset.deleted_at ? formatDate(asset.deleted_at) : 'recently'}</div>
                      </div>
                      <div className="relative" data-library-menu-root="true">
                        <button
                          onClick={() => setActionMenu((current) => (current === `trash:${asset.id}` ? null : `trash:${asset.id}`))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {actionMenu === `trash:${asset.id}` ? (
                          <InlineActionMenu>
                            <MenuAction
                              disabled={menuBusy}
                              onClick={() => {
                                restoreAssetMutation.mutate(asset.id)
                                setActionMenu(null)
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                              </span>
                            </MenuAction>
                            <MenuAction
                              tone="danger"
                              onClick={() => {
                                setConfirmState({ kind: 'permanent-delete', asset })
                                setActionMenu(null)
                              }}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete forever
                              </span>
                            </MenuAction>
                          </InlineActionMenu>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </section>
              )
            ) : (
              <EmptyInline icon={<Trash2 className="h-4 w-4" />} title="Trash is empty." description="Restore or permanently delete work here when you need to clean up." />
            )}
          </>
        ) : null}
      </AppPage>

      <ConfirmDialog
        state={confirmState}
        busy={isBusy}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return
          if (confirmState.kind === 'permanent-delete') {
            permanentDeleteMutation.mutate(confirmState.asset.id)
            return
          }
          emptyTrashMutation.mutate()
        }}
      />
    </>
  )
}
