import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { PageIntro, Panel } from '@/components/StudioPrimitives'
import { studioApi } from '@/lib/studioApi'

export default function SharedPage() {
  const { token = '' } = useParams()
  const shareQuery = useQuery({
    queryKey: ['shared', token],
    queryFn: () => studioApi.getPublicShare(token),
    enabled: Boolean(token),
  })

  const payload = shareQuery.data as
    | {
        project?: { title: string; description: string }
        assets?: Array<{ id: string; title: string; prompt: string; url: string; thumbnail_url?: string | null }>
        asset?: { title: string; prompt: string; url: string; thumbnail_url?: string | null }
      }
    | undefined

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <PageIntro
        eyebrow="Shared View"
        title={payload?.project?.title ?? payload?.asset?.title ?? 'Shared Studio Output'}
        description={payload?.project?.description ?? payload?.asset?.prompt ?? 'Public project or asset share generated from Studio.'}
      />

      <Panel>
        {payload?.asset ? (
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
            <img src={payload.asset.url} alt={payload.asset.title} className="max-h-[70vh] w-full object-contain" />
          </div>
        ) : null}

        {payload?.assets?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {payload.assets.map((asset) => (
              <div key={asset.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                <img src={asset.thumbnail_url ?? asset.url} alt={asset.title} className="aspect-[4/3] w-full object-cover" />
                <div className="p-4">
                  <div className="text-sm font-semibold text-white">{asset.title}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{asset.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!payload?.asset && !payload?.assets?.length ? <div className="text-sm text-zinc-500">Nothing is shared at this link yet.</div> : null}
      </Panel>
    </div>
  )
}
