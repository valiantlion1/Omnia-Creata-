import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { X, Heart, UserPlus, Info } from 'lucide-react'

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

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [activeImage, setActiveImage] = useState<LightboxPayload | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveImage(null)
    }
    if (activeImage) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [activeImage])

  return (
    <LightboxContext.Provider value={{
      openLightbox: (url, alt, metadata) => setActiveImage({ url, alt, metadata }),
      closeLightbox: () => setActiveImage(null)
    }}>
      {children}
      {activeImage && (
        <div 
          className="fixed inset-0 z-[100] flex animate-in fade-in duration-300 md:flex-row flex-col bg-black/95 backdrop-blur-2xl transition-all"
          onClick={() => setActiveImage(null)}
        >
          {/* Close Button Mobile/TopRight */}
          <button 
            className="absolute right-6 top-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white/[0.6] backdrop-blur-md transition hover:bg-white/10 hover:text-white border border-white/10"
            onClick={(e) => { e.stopPropagation(); setActiveImage(null); }}
          >
            <X className="h-6 w-6" />
          </button>
          
          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-12 h-screen">
            <img 
              src={activeImage.url} 
              alt={activeImage.alt} 
              className="max-h-full max-w-full animate-in zoom-in-95 duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-lg object-contain shadow-[0_0_120px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Metadata Sidebar */}
          {activeImage.metadata && (
            <div 
              className="w-full md:w-[400px] shrink-0 bg-zinc-900/50 backdrop-blur-md border-l border-white/[0.05] p-6 md:p-8 flex flex-col h-screen overflow-y-auto animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col space-y-8 mt-12 md:mt-4 text-white">
                
                {/* Author Info */}
                {activeImage.metadata.authorUsername && (
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-lg font-bold">
                        {(activeImage.metadata.authorName || activeImage.metadata.authorUsername).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white/90">{activeImage.metadata.authorName}</div>
                        <div className="text-[13px] text-zinc-500">@{activeImage.metadata.authorUsername}</div>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 rounded-full bg-white text-black px-4 py-1.5 text-xs font-bold hover:bg-zinc-200 transition">
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </button>
                  </div>
                )}

                {/* Prompt & Title */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white/90">{activeImage.metadata.title || activeImage.alt || 'Untitled Generation'}</h2>
                  </div>
                  {activeImage.metadata.prompt && (
                    <div className="space-y-2 p-4 rounded-xl bg-black/40 ring-1 ring-white/5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <Info className="h-3 w-3" />
                        Prompt Details
                      </div>
                      <div className="text-[13px] leading-relaxed text-zinc-300 font-mono">
                        {activeImage.metadata.prompt}
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Meta */}
                <div className="grid grid-cols-2 gap-4">
                  {activeImage.metadata.aspectRatio && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Aspect Ratio</div>
                      <div className="font-mono text-sm text-white/80">{activeImage.metadata.aspectRatio}</div>
                    </div>
                  )}
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Likes</div>
                    <div className="flex items-center justify-center gap-1.5 font-bold text-white/80">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      {activeImage.metadata.likes || 0}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <button className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] py-3 text-sm font-semibold text-white/90 transition hover:bg-white/[0.1] border border-white/10 shadow-lg">
                  <Heart className="h-4 w-4" />
                  Like Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </LightboxContext.Provider>
  )
}
