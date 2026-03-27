import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import clsx from 'clsx'

import { AppPage, ButtonChip, EmptyState, PageHeader, StatusPill } from '@/components/StudioPrimitives'
import { studioApi } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type FeedItem = {
  id: string
  title: string
  caption: string
  tag: string
  image: string
  href: string
}

const previewFeed: FeedItem[] = [
  {
    id: 'preview-1',
    title: 'Kinetic poster study',
    caption: 'Bold typography, poster energy, sharp contrast.',
    tag: 'Poster',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-2',
    title: 'Luxury product frame',
    caption: 'Soft reflections, premium shadows, calm commercial lighting.',
    tag: 'Product',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-3',
    title: 'Editorial portrait',
    caption: 'Quiet background, stronger light direction, magazine feel.',
    tag: 'Portrait',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-4',
    title: 'Dream terrain',
    caption: 'Atmospheric color and longer environmental depth.',
    tag: 'Nature',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-5',
    title: 'Brand identity draft',
    caption: 'Symbol-first direction with softer ivory balance.',
    tag: 'Brand',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-6',
    title: 'Campaign concept',
    caption: 'Reference-aware styling with cleaner silhouette separation.',
    tag: 'Concept',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-7',
    title: 'Product splash frame',
    caption: 'Controlled reflections for cleaner campaign usage.',
    tag: 'Commercial',
    image: 'https://images.unsplash.com/photo-1511556670410-f5c2c2d2e147?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
  {
    id: 'preview-8',
    title: 'Story frame',
    caption: 'Calmer atmosphere with more visual separation.',
    tag: 'Narrative',
    image: 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?auto=format&fit=crop&w=1400&q=80',
    href: '/create',
  },
]

const filters = ['Top', 'Latest', 'People', 'Product', 'Nature', 'Poster', 'Logo']

function FeedCard({
  item,
  className,
  imageClassName,
}: {
  item: FeedItem
  className?: string
  imageClassName?: string
}) {
  return (
    <Link
      to={item.href}
      className={clsx(
        'group overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#141519] transition hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-[#181920]',
        className,
      )}
    >
      <div className={clsx('relative overflow-hidden', imageClassName)}>
        <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <StatusPill tone="neutral">{item.tag}</StatusPill>
          </div>
          <div className="text-xl font-semibold tracking-tight text-white">{item.title}</div>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { auth, isAuthenticated, isAuthSyncing, isLoading, signInDemo } = useStudioAuth()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest

  const assetsQuery = useQuery({
    queryKey: ['assets', 'explore'],
    queryFn: () => studioApi.listAssets(),
    enabled: canLoadPrivate,
  })

  const feed = useMemo<FeedItem[]>(() => {
    const assets = assetsQuery.data?.assets ?? []
    const realItems = assets.slice(0, 12).map((asset) => ({
      id: asset.id,
      title: asset.title,
      caption: asset.prompt || 'Saved from recent Studio work.',
      tag: String(asset.metadata.model ?? 'Image'),
      image: asset.thumbnail_url ?? asset.url,
      href: `/projects/${asset.project_id}`,
    }))

    return realItems.length ? [...realItems, ...previewFeed.slice(0, Math.max(0, 8 - realItems.length))] : previewFeed
  }, [assetsQuery.data])

  const featured = feed.slice(0, 5)
  const gridItems = feed.slice(5, 11)
  const assetsCount = assetsQuery.data?.assets.length ?? 0

  if (isLoading) {
    return <div className="px-6 py-12 text-sm text-zinc-500">Loading explore...</div>
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Explore"
        title="Explore"
        actions={
          <>
            {!auth?.guest ? (
              <Link
                to="/create"
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Create
                <Sparkles className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={() => signInDemo('free', 'Omnia User')}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Start free
                <Sparkles className="h-4 w-4" />
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter, index) => (
          <button key={filter} className="transition hover:opacity-100">
            <ButtonChip active={index === 0}>{filter}</ButtonChip>
          </button>
        ))}
        {!auth?.guest ? (
          <div className="ml-auto flex flex-wrap gap-2">
            <StatusPill tone="neutral">{assetsCount} images</StatusPill>
            <StatusPill tone="brand">{auth?.credits.remaining ?? 0} credits</StatusPill>
          </div>
        ) : null}
      </div>

      {featured.length ? (
        <div className="grid gap-6 xl:grid-cols-12">
          {featured[0] ? <FeedCard item={featured[0]} className="xl:col-span-7" imageClassName="aspect-[16/10]" /> : null}
          {featured[1] ? <FeedCard item={featured[1]} className="xl:col-span-5" imageClassName="aspect-[10/10]" /> : null}
          {featured[2] ? <FeedCard item={featured[2]} className="xl:col-span-4" imageClassName="aspect-[4/5]" /> : null}
          {featured[3] ? <FeedCard item={featured[3]} className="xl:col-span-4" imageClassName="aspect-[4/5]" /> : null}
          {featured[4] ? <FeedCard item={featured[4]} className="xl:col-span-4" imageClassName="aspect-[4/5]" /> : null}
        </div>
      ) : (
        <EmptyState title="Nothing yet" description="Saved work will show up here." />
      )}

      {gridItems.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {gridItems.map((item) => (
            <FeedCard key={item.id} item={item} imageClassName="aspect-[4/5]" />
          ))}
        </div>
      ) : null}
    </AppPage>
  )
}
