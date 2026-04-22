import { useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, Download, Images, Lock } from 'lucide-react'

import { LightboxTrigger } from '@/components/ImageLightbox'
import { useLightbox } from '@/components/Lightbox'
import { ProtectedAssetImage } from '@/components/ProtectedAssetImage'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'
import { studioApi } from '@/lib/studioApi'
import { toUserFacingErrorMessage } from '@/lib/uiError'

function assetPreviewSources(asset: Awaited<ReturnType<typeof studioApi.getProject>>['recent_assets'][number]) {
  if (asset.protection_state === 'blocked') {
    return [asset.blocked_preview_url, asset.preview_url, asset.thumbnail_url, asset.url]
  }
  return [asset.preview_url, asset.thumbnail_url, asset.url]
}

function aspectRatioStyle(aspectRatio?: string | null): CSSProperties | undefined {
  if (!aspectRatio) return undefined
  const [width, height] = aspectRatio.split(':').map((value) => value.trim())
  if (!width || !height) return undefined
  const parsedWidth = Number(width)
  const parsedHeight = Number(height)
  if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight) || parsedWidth <= 0 || parsedHeight <= 0) {
    return undefined
  }
  return { aspectRatio: `${parsedWidth} / ${parsedHeight}` }
}

function cleanedProjectDescription(description: string | null | undefined) {
  const value = description?.trim()
  if (!value) return null
  if (/^images from this chat\.?$/i.test(value)) return null
  if (/^a focused space for this set\.?$/i.test(value)) return null
  if (/^created from studio /i.test(value)) return null
  return value
}

function classifyProjectPageError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalized = message.trim().toLowerCase()

  if (/offline right now|request failed with 503|temporarily unavailable|timed out|timeout/.test(normalized)) {
    return {
      eyebrow: 'Connection issue',
      title: 'Studio is unavailable right now.',
      detail: 'Try again in a moment.',
      primaryAction: 'retry' as const,
      primaryLabel: 'Try again',
      secondaryHref: '/library/projects',
      secondaryLabel: 'Projects',
    }
  }

  if (/invalid or expired session|authentication required/.test(normalized)) {
    return {
      eyebrow: 'Session expired',
      title: 'Sign in again to open this project.',
      detail: null,
      primaryAction: 'link' as const,
      primaryHref: '/login',
      primaryLabel: 'Sign in',
      secondaryHref: '/library/projects',
      secondaryLabel: 'Projects',
    }
  }

  return {
    eyebrow: 'Project unavailable',
    title: 'This project is no longer here.',
    detail: 'Open Projects or start a new set.',
    primaryAction: 'link' as const,
    primaryHref: '/library/projects',
    primaryLabel: 'Projects',
    secondaryHref: '/create',
    secondaryLabel: 'Create',
  }
}

async function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function ProjectRecoveryState({
  eyebrow,
  title,
  detail,
  primaryAction,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  onRetry,
}: {
  eyebrow: string
  title: string
  detail: string | null
  primaryAction: 'retry' | 'link'
  primaryHref?: string
  primaryLabel: string
  secondaryHref: string
  secondaryLabel: string
  onRetry?: () => void
}) {
  return (
    <section className="mx-auto flex min-h-[62vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-10 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
        {eyebrow}
      </div>
      <h1 className="mt-5 text-[32px] font-semibold tracking-[-0.05em] text-white md:text-[40px]">
        {title}
      </h1>
      {detail ? (
        <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">{detail}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {primaryAction === 'retry' ? (
          <button
            onClick={onRetry}
            className="rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95"
          >
            {primaryLabel}
          </button>
        ) : (
          <Link
            to={primaryHref ?? '/library/projects'}
            className="rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95"
          >
            {primaryLabel}
          </Link>
        )}
        <Link
          to={secondaryHref}
          className="rounded-[20px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-95"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  )
}

export default function ProjectPage() {
  usePageMeta('Project', 'Project workspace in Omnia Creata Studio.')
  const { projectId = '' } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const { openLightbox } = useLightbox()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const [shareMessage, setShareMessage] = useState('')

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => studioApi.getProject(projectId),
    enabled: Boolean(projectId && canLoadPrivate),
  })

  const shareMutation = useMutation({
    mutationFn: () => studioApi.createShare({ project_id: projectId }),
    onSuccess: async (response) => {
      const shareUrl = `${window.location.origin}${response.url}`
      await navigator.clipboard.writeText(shareUrl)
      setShareMessage('Project share link copied to clipboard.')
    },
    onError: (error) => {
      setShareMessage(toUserFacingErrorMessage(error, 'Unable to create share link.'))
    },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await studioApi.exportProject(projectId)
      const projectTitle = projectQuery.data?.project.title ?? 'project'
      await downloadBlob(blob, `${projectTitle.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase() || 'project'}.zip`)
    },
    onSuccess: () => {
      setShareMessage('Project export is ready and has started downloading.')
    },
    onError: (error) => {
      setShareMessage(toUserFacingErrorMessage(error, 'Unable to export this project.'))
    },
  })

  if (isLoading) {
    return <div className="flex items-center gap-3 px-6 py-12 text-sm text-zinc-400"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your project…</div>
  }

  if (auth?.guest) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
        <section className="flex min-h-[38vh] flex-col items-center justify-center rounded-[32px] border border-white/[0.05] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)] px-8 py-16 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            Projects
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
            Projects open after sign-in.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Sign in to view your saved directions and image groups.
          </p>
          <button
            onClick={() => window.location.assign('/signup')}
            className="mt-8 rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Get started free
          </button>
        </section>
      </div>
    )
  }

  if (projectQuery.isLoading) {
    return <div className="flex items-center gap-3 px-6 py-12 text-sm text-zinc-400"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your project…</div>
  }

  if (projectQuery.isError || !projectQuery.data) {
    const recovery = classifyProjectPageError(projectQuery.error)
    return (
      <ProjectRecoveryState
        eyebrow={recovery.eyebrow}
        title={recovery.title}
        detail={recovery.detail}
        primaryAction={recovery.primaryAction}
        primaryHref={recovery.primaryHref}
        primaryLabel={recovery.primaryLabel}
        secondaryHref={recovery.secondaryHref}
        secondaryLabel={recovery.secondaryLabel}
        onRetry={() => {
          void projectQuery.refetch()
        }}
      />
    )
  }

  const { project, recent_assets: assets } = projectQuery.data
  const isChatSurface = project.surface === 'chat'
  const projectImageLabel = `${assets.length} image${assets.length === 1 ? '' : 's'}`
  const projectDescription = cleanedProjectDescription(project.description)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6">
      <Link
        to="/library/projects"
        className="group flex w-fit items-center gap-1.5 rounded-full bg-white/[0.03] px-3.5 py-1.5 text-[12px] font-semibold text-zinc-400 ring-1 ring-white/[0.06] transition-all duration-300 hover:bg-white/[0.06] hover:text-white hover:ring-white/[0.1]"
      >
        <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Projects
      </Link>

      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[30px] font-semibold tracking-[-0.05em] text-white md:text-[38px]">
            {project.title}
          </h1>
          {projectDescription ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{projectDescription}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {!isChatSurface ? (
            <Link
              to={`/create?projectId=${project.id}`}
              className="group inline-flex items-center gap-2 rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Open Create
            </Link>
          ) : null}
          {!isChatSurface ? (
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="group rounded-[20px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white/[0.02] disabled:hover:border-white/10"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                {exportMutation.isPending ? 'Exporting...' : 'Export'}
              </span>
            </button>
          ) : null}
          <button
            onClick={() => shareMutation.mutate()}
            className="group rounded-[20px] border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-95"
          >
            Share
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-zinc-400">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
          {projectImageLabel}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1">
          Updated {new Date(project.updated_at).toLocaleDateString()}
        </span>
      </div>

      {shareMessage ? <p className="text-sm text-cyan-200/85">{shareMessage}</p> : null}

      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.05] pb-5">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.04em] text-white">
              Images
            </h2>
          </div>
          <Link
            to="/library/images"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-zinc-200 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
          >
            <Images className="h-3.5 w-3.5" />
            Open library
          </Link>
        </div>

        {assets.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {assets.map((asset) => {
              const previewSrc = assetPreviewSources(asset).find(Boolean) ?? ''
              const canOpenPreview =
                Boolean(previewSrc) &&
                asset.can_open !== false &&
                asset.protection_state !== 'blocked'
              const aspectRatio = typeof asset.metadata.aspect_ratio === 'string' ? asset.metadata.aspect_ratio : undefined
              const likeCount = typeof asset.metadata.like_count === 'number' ? asset.metadata.like_count : 0
              const mediaFrameStyle = aspectRatioStyle(aspectRatio)

              return (
                <article key={asset.id} className="group/projectasset">
                  <div
                    className={`group relative overflow-hidden rounded-[24px] bg-[#0b0d12] ring-1 ring-white/[0.06] transition-all duration-500 hover:ring-white/[0.12] hover:shadow-[0_24px_50px_rgba(0,0,0,0.32)] ${mediaFrameStyle ? '' : 'aspect-square'}`}
                    style={mediaFrameStyle}
                  >
                    <ProtectedAssetImage
                      sources={assetPreviewSources(asset)}
                      alt={asset.display_title ?? asset.title}
                      className={`h-full w-full object-cover transition-transform duration-700 group-hover/projectasset:scale-[1.03] ${canOpenPreview ? 'cursor-zoom-in' : ''} ${asset.protection_state === 'blocked' ? 'blur-[10px] saturate-50' : ''}`}
                      fallbackClassName="flex h-full min-h-[220px] w-full items-center justify-center bg-white/[0.04] text-zinc-600"
                      onClick={() => {
                        if (!canOpenPreview) return
                        openLightbox(previewSrc, asset.display_title ?? asset.title, {
                          title: asset.display_title ?? asset.title,
                          prompt: asset.prompt,
                          authorName: auth?.identity.display_name ?? 'You',
                          authorUsername: auth?.identity.username ?? 'creator',
                          aspectRatio,
                          likes: likeCount,
                        })
                      }}
                    />
                    {canOpenPreview ? (
                      <LightboxTrigger
                        onClick={() =>
                          openLightbox(previewSrc, asset.display_title ?? asset.title, {
                            title: asset.display_title ?? asset.title,
                            prompt: asset.prompt,
                            authorName: auth?.identity.display_name ?? 'You',
                            authorUsername: auth?.identity.username ?? 'creator',
                            aspectRatio,
                            likes: likeCount,
                          })
                        }
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent" />
                      <div className="relative flex items-end justify-between gap-3 px-3 pb-3 pt-10">
                        <div className="min-w-0 rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-semibold text-white/92 backdrop-blur-md ring-1 ring-white/[0.08]">
                          <span className="block truncate">{asset.display_title ?? asset.title}</span>
                        </div>
                        {aspectRatio ? (
                          <span className="shrink-0 rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/78 backdrop-blur-md ring-1 ring-white/[0.08]">
                            {aspectRatio}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {asset.protection_state === 'blocked' ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md">
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(252,211,77,0.2)]">
                          <Lock className="h-4 w-4" />
                          Blocked
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <section className="mt-8 flex min-h-[38vh] flex-col items-center justify-center px-6 text-center">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">No images yet</h3>
            {!isChatSurface ? (
              <Link
                to={`/create?projectId=${project.id}`}
                className="mt-5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-zinc-200 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
              >
                Open Create
              </Link>
            ) : null}
          </section>
        )}
      </section>
    </div>
  )
}
