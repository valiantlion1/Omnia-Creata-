import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION_LABEL } from '@/lib/appVersion'

export default function SplashPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Phase timing
    const enterTimer = window.setTimeout(() => setPhase('hold'), 600)
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2200)
    const navTimer = window.setTimeout(() => navigate('/landing', { replace: true }), 2800)

    // Smooth progress bar
    const progressInterval = window.setInterval(() => {
      setProgress((p) => Math.min(p + 1.2, 100))
    }, 28)

    return () => {
      window.clearTimeout(enterTimer)
      window.clearTimeout(exitTimer)
      window.clearTimeout(navTimer)
      window.clearInterval(progressInterval)
    }
  }, [navigate])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050508] text-white">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)',
            filter: 'blur(80px)',
            opacity: phase === 'enter' ? 0 : phase === 'hold' ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${phase === 'enter' ? 0.6 : phase === 'hold' ? 1 : 1.3})`,
            transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
            opacity: phase === 'enter' ? 0 : phase === 'hold' ? 0.8 : 0,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 200ms',
          }}
        />
        {/* Subtle radial grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            opacity: phase === 'hold' ? 0.6 : 0,
            transition: 'opacity 1s ease 400ms',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo mark */}
        <div
          style={{
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transform: phase === 'enter' ? 'scale(0.85) translateY(12px)' : phase === 'exit' ? 'scale(1.06) translateY(-8px)' : 'scale(1) translateY(0)',
            filter: phase === 'enter' ? 'blur(16px)' : phase === 'exit' ? 'blur(12px)' : 'blur(0)',
            transition: 'all 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="relative flex h-28 w-28 items-center justify-center">
            {/* Glow ring behind logo */}
            <div
              className="absolute inset-[-4px] rounded-[36px]"
              style={{
                background: 'conic-gradient(from 0deg, rgba(99,102,241,0.2), rgba(124,58,237,0.15), rgba(59,130,246,0.2), rgba(99,102,241,0.2))',
                filter: 'blur(12px)',
                opacity: phase === 'hold' ? 0.7 : 0,
                transition: 'opacity 0.8s ease 300ms',
              }}
            />
            <img src="/omnia-crest.png" alt="Omnia Creata" className="relative h-24 w-24 object-contain drop-shadow-[0_0_30px_rgba(99,102,241,0.15)]" />
          </div>
        </div>

        {/* Brand text */}
        <div
          className="text-center"
          style={{
            opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
            transform: phase === 'enter' ? 'translateY(10px)' : phase === 'exit' ? 'translateY(-6px)' : 'translateY(0)',
            transition: 'all 0.85s cubic-bezier(0.22, 1, 0.36, 1) 150ms',
          }}
        >
          <div className="text-[12px] font-semibold uppercase tracking-[0.30em] text-zinc-200">
            OmniaCreata
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.40em] text-zinc-500">
            Studio
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: phase === 'hold' ? 1 : 0,
            transform: phase === 'hold' ? 'translateY(0)' : 'translateY(6px)',
            transition: 'all 0.7s ease 400ms',
          }}
        >
          <p className="text-[11px] tracking-[0.16em] text-zinc-600">
            Create without limits
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="mt-2 w-[120px]"
          style={{
            opacity: phase === 'exit' ? 0 : phase === 'enter' ? 0 : 0.6,
            transition: 'opacity 0.5s ease 200ms',
          }}
        >
          <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500/60 via-violet-400/70 to-blue-500/60"
              style={{
                width: `${progress}%`,
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom subtle version */}
      <div
        className="absolute bottom-8 text-[10px] font-medium tracking-widest text-zinc-700"
        style={{
          opacity: phase === 'hold' ? 0.5 : 0,
          transition: 'opacity 0.6s ease 500ms',
        }}
      >
        {APP_VERSION_LABEL}
      </div>
    </div>
  )
}
