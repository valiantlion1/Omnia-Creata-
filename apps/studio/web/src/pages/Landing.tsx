import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, Layers, ShieldCheck, Zap, Compass, MessageSquare, Image as ImageIcon } from 'lucide-react'
import { usePageMeta } from '@/lib/usePageMeta'
// LegalFooter uses appVersion internally
import { LegalFooter } from '@/components/StudioPrimitives'

export default function LandingPage() {
  const navigate = useNavigate()
  usePageMeta(
    'Create Worlds Without Limits',
    'Omnia Creata Studio - protected-beta creative platform for image generation, direction, and visual workflows.',
  )

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#060608] text-white">
      {/* Ambient glows */}
      <div className="absolute left-[-10%] top-[-10%] h-[50vw] w-[50vw] rounded-full bg-[rgb(var(--primary))] opacity-[0.12] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40vw] w-[40vw] rounded-full bg-[rgb(var(--accent))] opacity-[0.08] blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 h-[30vw] w-[60vw] rounded-full bg-[rgb(var(--primary-light))] opacity-[0.04] blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-5 md:px-8 md:py-6">
        <button onClick={() => navigate('/landing')} className="flex items-center gap-3">
          <img src="/omnia-crest.png" alt="Omnia Creata" className="h-10 w-10 object-contain" />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold tracking-tight text-white/95">Omnia Creata</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Studio</div>
          </div>
        </button>
        <div className="flex items-center gap-3 md:gap-5">
          <button onClick={() => navigate('/explore')} className="hidden lg:block text-sm font-medium text-zinc-400 transition hover:text-white">
            Explore
          </button>
          <button onClick={() => navigate('/help')} className="hidden lg:block text-sm font-medium text-zinc-400 transition hover:text-white">
            Help
          </button>
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-zinc-300 transition hover:text-white">
            Log in
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-[0.98] md:px-5 md:py-2.5"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-[1000px] flex-col items-center justify-center px-6 pb-24 pt-24 text-center md:px-8 md:pt-32">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-[rgb(var(--primary-light)/0.3)] bg-[rgb(var(--primary-light)/0.08)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[rgb(var(--primary-light))] backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Protected Beta</span>
        </div>

        <h1
          className="mb-6 text-4xl font-black leading-[1.08] tracking-tighter sm:text-5xl md:text-6xl lg:text-8xl"
          style={{
            background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Create Worlds,
          <br />
          Without Limits.
        </h1>

        <p className="mb-12 max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          A creative studio that turns prompts into visual output through curated model lanes,
          honest provider controls, and a workspace built for real workflows.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={() => navigate('/signup')}
            className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-[rgb(var(--accent))] px-8 py-4 text-base font-bold shadow-[0_0_30px_rgba(var(--primary),0.3)] transition-all hover:scale-105 active:scale-[0.98]"
          >
            Start Creating Free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-8 py-4 text-base font-bold text-zinc-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.12]"
          >
            Explore Gallery
          </button>
        </div>
      </main>

      {/* Workspace preview strip */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#08090c]/80 py-16">
        <div className="mx-auto max-w-[900px] px-6 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-6">One workspace, four surfaces</div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Compass, label: 'Explore', desc: 'Browse & discover' },
              { icon: Sparkles, label: 'Create', desc: 'Generate images' },
              { icon: MessageSquare, label: 'Chat', desc: 'Creative copilot' },
              { icon: ImageIcon, label: 'Library', desc: 'Manage outputs' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-3 rounded-[20px] border border-white/[0.04] bg-white/[0.02] p-5 transition hover:border-white/[0.08] hover:bg-white/[0.04]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold text-white">{item.label}</div>
                <div className="text-[12px] text-zinc-500">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#070810] py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8">
          <div className="mb-12 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-3">Built for honest delivery</div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">What makes Studio different</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-8 transition hover:border-white/[0.08]">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary-light))]">
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-lg font-bold">Studio Workflow</h3>
              <p className="text-sm leading-relaxed text-zinc-400">Move between Explore, Create, Chat, and Library with one signed-in creative workspace.</p>
            </div>

            <div className="rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-8 transition hover:border-white/[0.08]">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent-light))]">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-lg font-bold">Protected Beta Controls</h3>
              <p className="text-sm leading-relaxed text-zinc-400">Signed-in routes, sharing, and owner diagnostics are hardened to behave honestly before broader rollout.</p>
            </div>

            <div className="rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-8 transition hover:border-white/[0.08]">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-lg font-bold">Reliable Delivery</h3>
              <p className="text-sm leading-relaxed text-zinc-400">Provider lanes prioritize dependable generations and clear failure behavior over inflated launch claims.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/[0.04] bg-[#060608] py-20">
        <div className="mx-auto max-w-[700px] px-6 text-center">
          <h2
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{
              background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Ready to create?
          </h2>
          <p className="mt-4 text-zinc-400">Join Studio free. Upgrade when you need more.</p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/signup')}
              className="group flex items-center gap-2.5 rounded-full bg-white px-8 py-4 text-base font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-[0.98]"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate('/subscription')}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-8 py-4 text-base font-medium text-zinc-300 transition-all hover:bg-white/[0.08]"
            >
              View Plans
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#050507] px-6 py-8 md:px-8">
        <LegalFooter className="mx-auto max-w-[1400px]" />
      </footer>
    </div>
  )
}
