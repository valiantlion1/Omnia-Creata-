import { useEffect } from 'react'
import { X, ZoomIn } from 'lucide-react'

type ImageLightboxProps = {
  url: string | null
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ url, alt = 'Image', onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!url) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [url, onClose])

  if (!url) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/92 backdrop-blur-xl"
        onClick={onClose}
      />
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-500 ring-1 ring-white/[0.07] transition hover:bg-white/[0.12] hover:text-white"
        title="Close (ESC)"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={url}
        alt={alt}
        className="relative max-h-[92vh] max-w-[92vw] rounded-2xl object-contain shadow-[0_40px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]"
        style={{ animation: 'oc-img-reveal 0.55s cubic-bezier(0.16,1,0.3,1) both' }}
      />
    </div>
  )
}

export function LightboxTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/60 opacity-0 backdrop-blur-md ring-1 ring-white/10 transition-all hover:bg-black/80 hover:text-white group-hover:opacity-100 focus:opacity-100"
      title="View fullscreen"
    >
      <ZoomIn className="h-3.5 w-3.5" />
    </button>
  )
}
