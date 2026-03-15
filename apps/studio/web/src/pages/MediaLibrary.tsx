import { useQuery } from '@tanstack/react-query'

import { EmptyState, PageIntro, Panel, StatusPill } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { studioApi } from '@/lib/studioApi'

export default function MediaLibraryPage() {
  const { auth, isAuthenticated, isLoading, signInDemo } = useStudioAuth()
  const assetsQuery = useQuery({
    queryKey: ['assets'],
    queryFn: () => studioApi.listAssets(),
    enabled: isAuthenticated,
  })

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-400">Loading media library...</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <EmptyState
          title="Media library is unlocked for signed-in creators."
          description="Guest mode stays browse-only so the asset store remains tied to a real identity and quota model."
          action={
            <button
              onClick={() => signInDemo('free', 'Omnia Creator')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            >
              Continue as Free Creator
            </button>
          }
        />
      </div>
    )
  }

  const assets = assetsQuery.data?.assets ?? []

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Media Library"
        title="History and media now read from the same generated assets."
        description="This page is fed by persistent asset records instead of placeholder gallery cards, which gives Studio a real content system foundation."
      />

      <Panel>
        {assets.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset) => (
              <div key={asset.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/3] w-full object-cover" />
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="neutral">{String(asset.metadata.model ?? 'image')}</StatusPill>
                    <StatusPill tone="neutral">{String(asset.metadata.provider ?? 'provider')}</StatusPill>
                  </div>
                  <div className="text-sm font-semibold text-white">{asset.title}</div>
                  <p className="line-clamp-4 text-sm leading-6 text-zinc-400">{asset.prompt}</p>
                  <a href={asset.url} target="_blank" rel="noreferrer" className="inline-flex text-sm text-cyan-200 transition hover:text-cyan-100">
                    Open asset file
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No assets yet" description="Once a generation completes, the output is saved as a media asset and will appear here automatically." />
        )}
      </Panel>
    </div>
  )
}
