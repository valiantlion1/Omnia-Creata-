import { useNavigate } from 'react-router-dom'
import { Sparkles, Zap, ArrowRight, Layers, ShieldCheck } from 'lucide-react'
import { usePageMeta } from '@/lib/usePageMeta'

export default function LandingPage() {
  const navigate = useNavigate()
  usePageMeta('Create Worlds Without Limits', 'Omnia Creata Studio — AI-powered creative platform. Render hyper-realistic concepts in seconds with private GPU clusters.')

  return (
    <div className="min-h-screen bg-[#060608] text-white overflow-hidden relative">
      
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#7c3aed] blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-fuchsia-600 blur-[150px] opacity-20 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-[1400px] mx-auto border-b border-white/[0.05]">
        <div className="font-bold text-2xl tracking-tighter flex items-center gap-2">
           <Zap className="h-6 w-6 text-fuchsia-500" />
           OMNIA CREATA
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="text-sm font-semibold text-zinc-300 hover:text-white transition">Login</button>
          <button 
            onClick={() => navigate('/signup')} 
            className="text-sm rounded-full bg-white text-black px-5 py-2 font-bold hover:scale-105 transition shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 text-center px-4 max-w-[1000px] mx-auto">
        
        <div className="flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-semibold text-fuchsia-300 uppercase tracking-widest mb-8">
          <Sparkles className="h-4 w-4" />
          <span>The Next Generation AI Studio</span>
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] mb-6" style={{ background: 'linear-gradient(135deg, #fff 0%, #d8b4fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Create Worlds,<br /> Without Limits.
        </h1>
        
        <p className="text-xl text-zinc-400 mb-10 max-w-2xl">
          Omnia Creata Studio bridges the gap between imagination and reality. Harness the power of private A100 GPU clusters to render hyper-realistic concepts in seconds.
        </p>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/signup')} 
            className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-fuchsia-500 px-8 py-4 text-base font-bold transition-all hover:scale-105 shadow-[0_0_30px_rgba(124,58,237,0.4)]"
          >
            Start Creating Free
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button onClick={() => navigate('/explore')} className="rounded-full bg-white/[0.05] border border-white/[0.1] px-8 py-4 text-base font-bold text-zinc-300 hover:bg-white/[0.1] transition-colors">
            Explore Gallery
          </button>
        </div>

      </main>

      {/* Feature Section */}
      <section className="relative z-10 border-t border-white/[0.05] bg-[#0a0a0c] py-24">
         <div className="max-w-[1400px] mx-auto px-8 grid md:grid-cols-3 gap-8">
            
            <div className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.02]">
               <div className="h-14 w-14 rounded-full bg-[#7c3aed]/20 text-[#7c3aed] flex items-center justify-center mb-6">
                  <Layers className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-bold mb-3">Enterprise Workflow</h3>
               <p className="text-zinc-400">Collaborate with tools designed for high-throughput studios, right from your browser.</p>
            </div>

            <div className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.02]">
               <div className="h-14 w-14 rounded-full bg-fuchsia-500/20 text-fuchsia-500 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-bold mb-3">Total Privacy</h3>
               <p className="text-zinc-400">Zero data retention for enterprise plans. What you create on Omnia Creata, stays yours.</p>
            </div>

            <div className="p-8 rounded-[32px] border border-white/[0.05] bg-white/[0.02]">
               <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7" />
               </div>
               <h3 className="text-xl font-bold mb-3">Instant Speed</h3>
               <p className="text-zinc-400">Our dynamic load balancers guarantee generation speeds up to 400% faster than standard public endpoints.</p>
            </div>

         </div>
      </section>

    </div>
  )
}
