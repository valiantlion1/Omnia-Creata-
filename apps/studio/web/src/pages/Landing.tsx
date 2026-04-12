import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, ArrowRight, Layers, ShieldCheck } from 'lucide-react'
import { usePageMeta } from '@/lib/usePageMeta'

export default function LandingPage() {
  const navigate = useNavigate()
  usePageMeta(
    'Create Worlds Without Limits',
    'Omnia Creata Studio - protected-beta creative platform for image generation, direction, and visual workflows.',
  )

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#060608] text-white">
      <div className="absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7c3aed] opacity-20 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-fuchsia-600 opacity-20 blur-[150px] pointer-events-none" />

      <nav className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between border-b border-white/[0.05] px-8 py-6">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
          <Zap className="h-6 w-6 text-fuchsia-500" />
          OMNIA CREATA
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-zinc-300 transition hover:text-white">
            Login
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] transition hover:scale-105"
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex max-w-[1000px] flex-col items-center justify-center px-4 pb-20 pt-32 text-center">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
          <Sparkles className="h-4 w-4" />
          <span>Protected Beta Creative Studio</span>
        </div>

        <h1
          className="mb-6 text-6xl font-black leading-[1.1] tracking-tighter md:text-8xl"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, #d8b4fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Create Worlds,
          <br />
          Without Limits.
        </h1>

        <p className="mb-10 max-w-2xl text-xl text-zinc-400">
          Omnia Creata Studio turns prompts, references, and creative direction into visual output through curated model
          lanes designed for reliable protected-beta workflows.
        </p>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-fuchsia-500 px-8 py-4 text-base font-bold shadow-[0_0_30px_rgba(124,58,237,0.4)] transition-all hover:scale-105"
          >
            Start Creating Free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="rounded-full border border-white/[0.1] bg-white/[0.05] px-8 py-4 text-base font-bold text-zinc-300 transition-colors hover:bg-white/[0.1]"
          >
            Explore Gallery
          </button>
        </div>
      </main>

      <section className="relative z-10 border-t border-white/[0.05] bg-[#0a0a0c] py-24">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-8 md:grid-cols-3">
          <div className="rounded-[32px] border border-white/[0.05] bg-white/[0.02] p-8">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#7c3aed]/20 text-[#7c3aed]">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Studio Workflow</h3>
            <p className="text-zinc-400">Move between Explore, Create, Chat, and Library with one signed-in creative workspace.</p>
          </div>

          <div className="rounded-[32px] border border-white/[0.05] bg-white/[0.02] p-8">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-fuchsia-500/20 text-fuchsia-500">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Protected Beta Controls</h3>
            <p className="text-zinc-400">Signed-in routes, sharing, and owner diagnostics are hardened to behave honestly before broader rollout.</p>
          </div>

          <div className="rounded-[32px] border border-white/[0.05] bg-white/[0.02] p-8">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <Zap className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold">Reliable Delivery</h3>
            <p className="text-zinc-400">Protected-beta provider lanes prioritize dependable generations and clear failure behavior over inflated launch claims.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
