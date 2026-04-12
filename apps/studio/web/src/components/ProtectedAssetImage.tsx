import { useEffect, useMemo, useState } from 'react'
import { ImageOff } from 'lucide-react'

type ProtectedAssetImageProps = {
  sources: Array<string | null | undefined>
  alt: string
  className?: string
  fallbackClassName?: string
  loading?: 'eager' | 'lazy'
  onClick?: () => void
}

function normalizeSources(sources: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      sources
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  )
}

export function ProtectedAssetImage({
  sources,
  alt,
  className,
  fallbackClassName,
  loading = 'lazy',
  onClick,
}: ProtectedAssetImageProps) {
  const resolvedSources = useMemo(() => normalizeSources(sources), [sources])
  const sourceKey = resolvedSources.join('|')
  const [sourceIndex, setSourceIndex] = useState(0)

  useEffect(() => {
    setSourceIndex(0)
  }, [sourceKey])

  const currentSource = resolvedSources[sourceIndex] ?? null

  if (!currentSource) {
    return (
      <div
        className={
          fallbackClassName ??
          className ??
          'flex items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-600'
        }
      >
        <ImageOff className="h-5 w-5" />
      </div>
    )
  }

  return (
    <img
      src={currentSource}
      alt={alt}
      loading={loading}
      draggable={false}
      onClick={onClick}
      onContextMenu={(event) => event.preventDefault()}
      onError={() => {
        setSourceIndex((current) => (current + 1 < resolvedSources.length ? current + 1 : resolvedSources.length))
      }}
      className={className}
    />
  )
}
