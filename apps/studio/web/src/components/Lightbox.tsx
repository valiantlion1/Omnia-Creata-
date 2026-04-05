import { createContext, useContext, useState, type ReactNode, useEffect } from 'react'
import { X, Heart, UserPlus, Info } from 'lucide-react'
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
          <div className="flex-1 flex items-center justify-center p-4 md:p-12 h-screen relative group">
            <div className="relative flex items-center justify-center max-h-[90vh] max-w-[90vw]">
              <img 
                src={activeImage.url} 
                alt={activeImage.alt} 
                className="max-h-[90vh] max-w-[90vw] animate-in zoom-in-[0.98] duration-[500ms] ease-[cubic-bezier(0.16,1,0.3,1)] rounded-xl object-contain shadow-[0_0_120px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                onClick={(e) => e.stopPropagation()}
              />
              {/* OMNIACREATA Watermark for non-owners */}
              {activeImage.metadata?.authorUsername && activeImage.metadata.authorUsername !== useStudioAuth().auth?.identity.username && (
                <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 backdrop-blur-md opacity-80 animate-in fade-in duration-700">
                  <div className="text-[10px] font-bold tracking-[0.2em] text-white/90">OMNIACREATA</div>
                  <div className="h-3 w-[1px] bg-white/30" />
                  <div className="text-[11px] font-medium text-white/80">@{activeImage.metadata.authorUsername}</div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Sidebar */}
          {activeImage.metadata && (
            <div 
              className="w-full md:w-[420px] shrink-0 backdrop-blur-2xl border-l border-white/[0.08] p-6 md:p-8 flex flex-col h-screen overflow-y-auto animate-in slide-in-from-right duration-[400ms] ease-out shadow-2xl relative"
              style={{ background: 'linear-gradient(180deg, rgba(11, 11, 13, 0.7) 0%, rgba(11, 11, 13, 0.9) 100%)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,rgb(var(--primary-light)/0.05),transparent_50%)]" />
              <div className="flex flex-col space-y-8 mt-12 md:mt-4 text-white relative z-10">
                
                {/* Author Info */}
                {activeImage.metadata.authorUsername && (
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold shadow-md" style={{ background: 'linear-gradient(135deg, rgb(var(--primary-light)), rgb(var(--accent)))' }}>
                        {(activeImage.metadata.authorName || activeImage.metadata.authorUsername).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white/90 drop-shadow-sm">{activeImage.metadata.authorName}</div>
                        <div className="text-[13px] text-zinc-400 font-medium">@{activeImage.metadata.authorUsername}</div>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-all duration-300 hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgb(var(--primary-light)/0.3)]" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}>
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </button>
                  </div>
                )}

                {/* Prompt & Title */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-white/95 leading-snug drop-shadow-sm">{activeImage.metadata.title || activeImage.alt || 'Untitled Generation'}</h2>
                  </div>
                  {activeImage.metadata.prompt && (
                    <div className="space-y-2 p-4 rounded-xl ring-1 ring-white/[0.08] bg-[#1a1b23]/50 shadow-inner">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-[rgb(var(--primary-light))]" />
                        Prompt Details
                      </div>
                      <div className="text-[13px] leading-relaxed text-zinc-300 font-mono tracking-tight break-words">
                        {activeImage.metadata.prompt}
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Meta */}
                <div className="grid grid-cols-2 gap-4">
                  {activeImage.metadata.aspectRatio && (
                    <div className="rounded-[16px] border border-white/[0.06] p-4 text-center transition-all bg-[#111216]/60 backdrop-blur-md shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Aspect Ratio</div>
                      <div className="font-mono text-sm font-semibold text-white/90">{activeImage.metadata.aspectRatio}</div>
                    </div>
                  )}
                  <div className="rounded-[16px] border border-white/[0.06] p-4 text-center transition-all bg-[#111216]/60 backdrop-blur-md shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">Likes</div>
                    <div className="flex items-center justify-center gap-1.5 font-bold text-white/90">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      {activeImage.metadata.likes || 0}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <button className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white/95 transition-all duration-300 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ring-1 ring-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.3)] bg-white/[0.03] hover:bg-white/[0.06]">
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
