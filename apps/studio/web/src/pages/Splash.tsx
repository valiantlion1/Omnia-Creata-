import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate('/landing', { replace: true })
    }, 2400)

    return () => window.clearTimeout(timeout)
  }, [navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#09090b] text-white">
      <style>{`
        @keyframes omniaSplashMark {
          0% { opacity: 0; transform: scale(0.88) translateY(10px); filter: blur(12px); }
          22% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          78% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.04) translateY(-6px); filter: blur(10px); }
        }

        @keyframes omniaSplashGlow {
          0% { opacity: 0; transform: scale(0.92); }
          28% { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.12); }
        }

        @keyframes omniaSplashWord {
          0% { opacity: 0; transform: translateY(8px); letter-spacing: 0.28em; }
          30% { opacity: 1; transform: translateY(0); letter-spacing: 0.22em; }
          100% { opacity: 0; transform: translateY(-4px); letter-spacing: 0.18em; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(191,219,254,0.18),rgba(59,130,246,0.08),transparent_72%)] blur-3xl"
          style={{ animation: 'omniaSplashGlow 2.4s ease forwards' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_48%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-5">
        <div
          className="flex h-28 w-28 items-center justify-center rounded-[32px]"
          style={{ animation: 'omniaSplashMark 2.25s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
        >
          <img src="/omnia-crest.png" alt="Omnia Creata" className="h-24 w-24 object-contain" />
        </div>
        <div
          className="text-center text-[11px] font-semibold uppercase text-zinc-300"
          style={{ animation: 'omniaSplashWord 2.2s ease forwards' }}
        >
          <div className="tracking-[0.28em]">OmniaCreata</div>
          <div className="mt-1 tracking-[0.38em] text-zinc-500">Studio</div>
        </div>
        <div className="mt-4 flex items-center gap-1.5" style={{ animation: 'omniaSplashWord 2.2s ease forwards' }}>
          <span className="h-1 w-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '0ms' }} />
          <span className="h-1 w-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '200ms' }} />
          <span className="h-1 w-1 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  )
}
