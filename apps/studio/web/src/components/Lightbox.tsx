import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Copy, X } from 'lucide-react'
import { useStudioAuth } from '@/lib/studioAuth'

export type LightboxMetadata = {
  title?: string
  prompt?: string
  authorName?: string
  authorUsername?: string
  aspectRatio?: string
  likes?: number
  model?: string
}

type LightboxPayload = {
  url: string
  alt?: string
  metadata?: LightboxMetadata
}

type LightboxContextType = {
  openLightbox: (url: string, alt?: string, metadata?: LightboxMetadata) => void
  closeLightbox: () => void
}

const LightboxContext = createContext<LightboxContextType | null>(null)

export function useLightbox() {
  const ctx = useContext(LightboxContext)
  if (!ctx) throw new Error('useLightbox must be used within LightboxProvider')
  return ctx
}

/* ─── Modal (extracted so hooks are always called at component level) ─── */

function LightboxModal({ image, onClose }: { image: LightboxPayload; onClose: () => void }) {
  const { auth } = useStudioAuth()
  const isOwn = image.metadata?.authorUsername === auth?.identity.username
  const isStudio = image.metadata?.authorUsername === 'studio'
  const hasSidebar = Boolean(image.metadata?.title || image.metadata?.prompt || image.metadata?.authorUsername || image.metadata?.aspectRatio || image.metadata?.model)

  const [copied, setCopied] = useState(false)
  const copyPrompt = () => {
    if (!image.metadata?.prompt) return
    navigator.clipboard.writeText(image.metadata.prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex bg-black/92 backdrop-blur-xl"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-500 ring-1 ring-white/[0.07] transition hover:bg-white/[0.12] hover:text-white"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        title="Close (ESC)"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Image area */}
      <div
        className="flex flex-1 items-center justify-center p-6 md:p-12 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={image.url}
          alt={image.alt}
          className="max-h-[90vh] max-w-full rounded-2xl object-contain shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]"
          style={{ animation: 'oc-img-reveal 0.55s cubic-bezier(0.16,1,0.3,1) both' }}
        />

        {/* Watermark — only for other users' content */}
        {!isOwn && !isStudio && image.metadata?.authorUsername && (
          <div className="pointer-events-none absolute bottom-7 right-7 select-none">
            <img
              src="/omnia-crest.png"
              alt=""
              draggable={false}
              className="h-5 w-5"
              style={{ opacity: 0.38, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.55))' }}
            />
          </div>
        )}
      </div>

      {/* Sidebar */}
      {hasSidebar && (
        <aside
          className="hidden md:flex w-[320px] shrink-0 flex-col gap-5 border-l border-white/[0.05] bg-[#08090b] p-6 overflow-y-auto"
          style={{ animation: 'oc-fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Author */}
          {image.metadata?.authorUsername && (
            <div className="flex items-center gap-3 pb-5 border-b border-white/[0.05]">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, rgb(var(--primary)/0.4), rgb(var(--accent)/0.3))' }}
              >
                {(image.metadata.authorName || image.metadata.authorUsername).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {image.metadata.authorName || (isStudio ? 'OmniaCreata' : image.metadata.authorUsername)}
                </div>
                {!isStudio && (
                  <div className="text-[12px] text-zinc-600">@{image.metadata.authorUsername}</div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          {image.metadata?.title && (
            <h2 className="text-base font-semibold text-white/90 leading-snug">
              {image.metadata.title}
            </h2>
          )}

          {/* Prompt */}
          {image.metadata?.prompt && (
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Prompt</div>
              <p className="text-[13px] leading-[1.7] text-zinc-400">{image.metadata.prompt}</p>
              <button
                onClick={copyPrompt}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-300"
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy prompt'}
              </button>
            </div>
          )}

          {/* Meta chips */}
          {(image.metadata?.aspectRatio || image.metadata?.model || image.metadata?.likes !== undefined) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {image.metadata?.aspectRatio && (
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-zinc-600">Ratio</div>
                  <div className="text-[13px] font-medium text-zinc-300 mt-0.5">{image.metadata.aspectRatio}</div>
                </div>
              )}
              {image.metadata?.model && (
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 max-w-[140px]">
                  <div className="text-[10px] text-zinc-600">Model</div>
                  <div className="text-[13px] font-medium text-zinc-300 mt-0.5 truncate">{image.metadata.model}</div>
                </div>
              )}
              {image.metadata?.likes !== undefined && (
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <div className="text-[10px] text-zinc-600">Likes</div>
                  <div className="text-[13px] font-medium text-zinc-300 mt-0.5">{image.metadata.likes}</div>
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  )
}

/* ─── Provider ─── */

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [activeImage, setActiveImage] = useState<LightboxPayload | null>(null)

  useEffect(() => {
    if (!activeImage) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveImage(null) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [activeImage])

  return (
    <LightboxContext.Provider value={{
      openLightbox: (url, alt, metadata) => setActiveImage({ url, alt, metadata }),
      closeLightbox: () => setActiveImage(null),
    }}>
      {children}
      {activeImage && typeof document !== 'undefined'
        ? createPortal(<LightboxModal image={activeImage} onClose={() => setActiveImage(null)} />, document.body)
        : null}
    </LightboxContext.Provider>
  )
}
