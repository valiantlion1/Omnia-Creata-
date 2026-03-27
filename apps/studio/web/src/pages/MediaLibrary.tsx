import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'

import { AppPage, EmptyState, StatusPill, Surface, SurfaceHeader } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

const imageFilters = ['All', 'Pins', 'Published', 'Unpublished']

type AssetGroup = {
  id: string
  title: string
  prompt: string
  model: string
  createdAt: string
  projectId: string
  items: Awaited<ReturnType<typeof studioApi.listAssets>>['assets']
}

export default function MediaLibraryPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const { auth, isAuthenticated, isAuthSyncing, isLoading, signInDemo } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

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

  const trashAssetMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.trashAsset(assetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const restoreAssetMutation = useMutation({
    mutationFn: (assetId: string) => studioApi.restoreAsset(assetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const section = useMemo<'images' | 'collections' | 'likes' | 'trash'>(() => {
    if (location.pathname.startsWith('/library/collections')) return 'collections'
    if (location.pathname.startsWith('/library/likes')) return 'likes'
    if (location.pathname.startsWith('/library/trash')) return 'trash'
    return 'images'
  }, [location.pathname])

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-500">Loading library...</div>
  }

  if (auth?.guest) {
    return (
      <AppPage className="max-w-[1480px]">
        <EmptyState
          title="Your library unlocks when you sign in."
          description="Saved work, collections, and liked visuals stay attached to your account."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia User')}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Start free
            </button>
          }
        />
      </AppPage>
    )
  }

  const assets = assetsQuery.data?.assets ?? []
  const activeAssets = assets.filter((asset) => !asset.deleted_at)
  const trashedAssets = assets.filter((asset) => Boolean(asset.deleted_at))
  const projects = projectsQuery.data?.projects ?? []
  const groupedAssets = useMemo<AssetGroup[]>(() => {
    const sorted = [...activeAssets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const groups = new Map<string, AssetGroup>()

    for (const asset of sorted) {
      const metadata = asset.metadata as Record<string, unknown>
      const groupId = String(metadata.generation_id ?? asset.id)
      const title = String(metadata.generation_title ?? asset.title ?? 'Untitled set')
      const existing = groups.get(groupId)
      if (existing) {
        existing.items.push(asset)
        continue
      }

      groups.set(groupId, {
        id: groupId,
        title,
        prompt: asset.prompt || 'Saved Studio result',
        model: String(metadata.model ?? 'Image'),
        createdAt: asset.created_at,
        projectId: asset.project_id,
        items: [asset],
      })
    }

    return Array.from(groups.values())
  }, [activeAssets])

  return (
    <AppPage className="max-w-[1620px] gap-6 py-6">
      {section === 'images' ? (
        <>
          <Surface tone="muted">
            <SurfaceHeader
              eyebrow="Library"
              title="My images"
              actions={
                <div className="flex flex-wrap gap-2">
                  {imageFilters.map((filter, index) => (
                    <button
                      key={filter}
                      className={`rounded-full px-4 py-2 text-sm transition ${
                        index === 0 ? 'bg-white text-black' : 'bg-white/[0.04] text-zinc-400 ring-1 ring-white/8 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              }
            />
            <div className="mt-5 flex items-center gap-3 rounded-[24px] bg-black/20 px-4 py-3 ring-1 ring-white/[0.06]">
              <Search className="h-4 w-4 text-zinc-500" />
              <div className="text-sm text-zinc-400">Hover a card for quick actions.</div>
            </div>
          </Surface>

          {groupedAssets.length ? (
            <section className="space-y-5">
              {groupedAssets.map((group) => (
                <Surface key={group.id} tone="muted" className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold tracking-tight text-white">{group.title}</h2>
                        <StatusPill tone="neutral">{group.items.length} variation{group.items.length > 1 ? 's' : ''}</StatusPill>
                        <StatusPill tone="neutral">{group.model}</StatusPill>
                      </div>
                      <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-zinc-400">{group.prompt}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                      <div>{new Date(group.createdAt).toLocaleString()}</div>
                      <Link to={`/projects/${group.projectId}`} className="transition hover:text-white">
                        Open project
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {group.items.map((asset, index) => (
                      <div
                        key={asset.id}
                        className="group overflow-hidden rounded-[24px] border border-white/8 bg-[#141519] shadow-[0_18px_50px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-white/14 hover:shadow-[0_28px_70px_rgba(0,0,0,0.32)]"
                      >
                        <div className="relative overflow-hidden">
                          <Link to={`/projects/${asset.project_id}`} className="block">
                            <img
                              src={asset.thumbnail_url ?? asset.url}
                              alt={`${group.title} variation ${index + 1}`}
                              className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                            />
                          </Link>
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/18 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                          <div className="absolute left-3 top-3 right-3 flex items-center justify-between gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
                            <StatusPill tone="neutral">V{index + 1}</StatusPill>
                            <div className="flex gap-2">
                              <button
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                                title="Save to favorites"
                              >
                                <Heart className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => trashAssetMutation.mutate(asset.id)}
                                disabled={trashAssetMutation.isPending}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-rose-500/90 disabled:opacity-50"
                                title="Move to trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Surface>
              ))}
            </section>
          ) : (
            <EmptyState title="No images yet" description="Once generations complete, your results land here automatically." />
          )}
        </>
      ) : null}

      {section === 'collections' ? (
        <>
          <section className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Collections</h1>
              <p className="mt-2 text-sm text-zinc-400">Group work by project so it stays easy to revisit later.</p>
            </div>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]"
            >
              <Plus className="h-4 w-4" />
              New collection
            </Link>
          </section>

          {projects.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="rounded-[28px] border border-white/8 bg-[#141519] p-5 transition hover:border-white/14 hover:bg-[#17181d]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-lg font-semibold text-white">{project.title}</div>
                    <StatusPill tone="neutral">{new Date(project.updated_at).toLocaleDateString()}</StatusPill>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{project.description || 'No description yet.'}</p>
                  <div className="mt-5 text-sm text-zinc-200">Open collection</div>
                </Link>
              ))}
            </section>
          ) : (
            <EmptyState title="No collections yet" description="Create a project and your library can start grouping work for you." />
          )}
        </>
      ) : null}

      {section === 'likes' ? (
        <section className="flex min-h-[65vh] items-center justify-center">
          <div className="w-full max-w-xl">
            <EmptyState title="You have not liked anything yet" description="Images you keep an eye on will show up here." />
          </div>
        </section>
      ) : null}

      {section === 'trash' ? (
        <>
          <Surface tone="muted">
            <SurfaceHeader eyebrow="Library" title="Trash" />
            <div className="mt-4 text-sm text-zinc-400">Deleted images land here first so you can recover them before they are gone.</div>
          </Surface>

          {trashedAssets.length ? (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {trashedAssets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-[28px] border border-white/8 bg-[#141519]">
                  <div className="relative overflow-hidden">
                    <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/5] w-full object-cover opacity-75" />
                    <div className="absolute inset-0 bg-black/35" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="truncate text-sm font-semibold text-white">{asset.title}</div>
                    <div className="text-xs text-zinc-500">
                      Deleted {asset.deleted_at ? new Date(asset.deleted_at).toLocaleString() : 'recently'}
                    </div>
                    <button
                      onClick={() => restoreAssetMutation.mutate(asset.id)}
                      disabled={restoreAssetMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <EmptyState title="Trash is empty" description="Deleted images will show up here until you restore them." />
          )}
        </>
      ) : null}
    </AppPage>
  )
}
