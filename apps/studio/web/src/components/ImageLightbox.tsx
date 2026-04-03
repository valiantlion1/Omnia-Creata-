import { useEffect } from 'react'
import { X, ZoomIn } from 'lucide-react'

type ImageLightboxProps = {
  url: string | null
  alt?: string
  onClose: () => void
}

export function ImageLightbox({ url, alt = 'Image', onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (url) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [url, onClose])

  if (!url) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      {/* Blurred dark backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
        title="Close (ESC)"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Image container */}
      <div className="relative max-h-full max-w-full animate-in zoom-in-95 duration-300 ease-out">
        <img
          src={url}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
        />
      </div>
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
      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-md transition-all hover:bg-black/70 hover:scale-110 group-hover:opacity-100 focus:opacity-100"
      title="View fullscreen"
    >
      <ZoomIn className="h-4 w-4" />
    </button>
  )
}
