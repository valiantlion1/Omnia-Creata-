import { useEffect, useRef, useState, useCallback } from 'react'
import { ArrowRight, Eye, Sparkles, FolderHeart, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

/* ─── hero floating cards ─── */
const heroCards = [
  { src: '/atmosphere/showcase-01-neon-cityscape.png', w: 220, h: 280, top: '2%', right: '2%', rotate: '6deg', z: 4 },
  { src: '/atmosphere/showcase-07-fashion-editorial.png', w: 190, h: 250, top: '8%', right: '28%', rotate: '-4deg', z: 3 },
  { src: '/atmosphere/showcase-05-product-photo.png', w: 180, h: 220, top: '42%', right: '6%', rotate: '-5deg', z: 5 },
  { src: '/atmosphere/showcase-02-editorial-portrait.png', w: 200, h: 260, top: '36%', right: '30%', rotate: '3deg', z: 2 },
  { src: '/atmosphere/showcase-04-fantasy-dragon.png', w: 170, h: 210, top: '68%', right: '18%', rotate: '7deg', z: 3 },
]

/* ─── showcase gallery ─── */
const showcaseImages = [
  { src: '/atmosphere/showcase-06-luxury-interior.png', label: 'Luxury Interior', prompt: 'Minimalist luxury penthouse, floor-to-ceiling windows, sunset' },
  { src: '/atmosphere/showcase-08-anime-warrior.png', label: 'Anime Art', prompt: 'Samurai on cliff during thunderstorm, cherry blossoms' },
  { src: '/atmosphere/showcase-09-scifi-cityscape.png', label: 'Sci-Fi City', prompt: 'Futuristic megalopolis at dusk, holographic billboards, neon glow' },
  { src: '/atmosphere/showcase-03-architecture.png', label: 'Architecture', prompt: 'Cliff-side villa overlooking ocean, golden hour, glass and concrete' },
  { src: '/atmosphere/showcase-10-food-photography.png', label: 'Food Photography', prompt: 'Gourmet chocolate dessert, gold leaf, dark moody lighting' },
  { src: '/atmosphere/showcase-11-nature-macro.png', label: 'Nature Macro', prompt: 'Dewdrop on emerald leaf, morning golden hour, macro lens' },
  { src: '/atmosphere/showcase-01-neon-cityscape.png', label: 'Neon Cityscape', prompt: 'Neon-lit Tokyo alley at midnight, rain-soaked reflections' },
  { src: '/atmosphere/showcase-02-editorial-portrait.png', label: 'Editorial Portrait', prompt: 'Fashion editorial, flowing golden silk, soft bokeh' },
  { src: '/atmosphere/showcase-05-product-photo.png', label: 'Product Photo', prompt: 'Perfume bottle on dark marble, studio lighting, commercial' },
]

/* ─── use case tabs ─── */
const useCaseTabs = [
  {
    id: 'social',
    label: 'Social Media',
    title: 'Create scroll-stopping content',
    description: 'Generate eye-catching visuals for Instagram, TikTok, and Twitter. Stand out in every feed with unique AI-generated images that match your brand.',
    image: '/atmosphere/showcase-09-scifi-cityscape.png',
    features: ['Custom visuals for every post', 'Consistent brand aesthetics', 'Unlimited creative variations'],
  },
  {
    id: 'ecommerce',
    label: 'E-Commerce',
    title: 'Transform your product visuals',
    description: 'Generate professional product images in any setting, mood, or style — without expensive photo shoots. Perfect for listings, ads, and catalogs.',
    image: '/atmosphere/showcase-05-product-photo.png',
    features: ['Lifestyle product photos', 'Multiple angles & settings', 'Campaign-ready visuals'],
  },
  {
    id: 'creative',
    label: 'Creative Projects',
    title: 'Bring your imagination to life',
    description: 'From concept art to book covers, from game assets to editorial illustrations — turn any creative vision into a stunning visual in seconds.',
    image: '/atmosphere/showcase-04-fantasy-dragon.png',
    features: ['Concept art & illustration', 'Fantasy & sci-fi worlds', 'Character design'],
  },
  {
    id: 'branding',
    label: 'Brand & Marketing',
    title: 'Build a visual identity that stands out',
    description: 'Create on-brand marketing visuals, presentation backgrounds, and campaign imagery — all consistent with your brand\'s unique style.',
    image: '/atmosphere/showcase-06-luxury-interior.png',
    features: ['Brand-consistent imagery', 'Ad campaign visuals', 'Presentation backgrounds'],
  },
]

/* ─── workflow steps ─── */
const steps = [
  { icon: Eye, title: 'Explore', description: 'Browse trending images and discover styles that inspire you.' },
  { icon: Sparkles, title: 'Create', description: 'Write a prompt, pick a model, and generate stunning visuals.' },
  { icon: FolderHeart, title: 'Organize', description: 'Save to collections, build your library, find anything instantly.' },
]

/* ─── scroll hooks ─── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function useParallax(speed = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)

  const handleScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewH = window.innerHeight
    if (rect.bottom < 0 || rect.top > viewH) return
    const progress = (viewH - rect.top) / (viewH + rect.height)
    setOffset((progress - 0.5) * speed * 200)
  }, [speed])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return { ref, offset }
}

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal()
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(36px)', transition: `all 0.8s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms` }}>
      {children}
    </div>
  )
}

function RevealScale({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal(0.15)
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'scale(1) translateY(0)' : 'scale(0.92) translateY(24px)', transition: `all 0.9s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

function RevealSlide({ children, className = '', delay = 0, direction = 'left' }: { children: React.ReactNode; className?: string; delay?: number; direction?: 'left' | 'right' }) {
  const { ref, visible } = useReveal(0.1)
  const x = direction === 'left' ? '-60px' : '60px'
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : `translateX(${x})`, transition: `all 0.85s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms` }}>
      {children}
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useStudioAuth()
  const [activeTab, setActiveTab] = useState('social')
  const activeCase = useCaseTabs.find((t) => t.id === activeTab) || useCaseTabs[0]
  const showcaseParallax = useParallax(0.12)

  const cta = isAuthenticated ? '/studio' : '/signup'
  const ctaLabel = isAuthenticated ? 'Open Studio' : 'Start Creating — Free'

  return (
    <div className="min-h-screen bg-[#07111a] text-white overflow-x-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-[34rem] w-[34rem] rounded-full bg-cyan-400/[0.04] blur-[200px]" />
        <div className="absolute right-[-6%] top-[22%] h-[26rem] w-[26rem] rounded-full bg-blue-400/[0.03] blur-[180px]" />
        <div className="absolute bottom-[-4%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-indigo-400/[0.03] blur-[160px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1360px] px-5 py-6 md:px-8">
        {/* ═══ NAVBAR ═══ */}
        <header className="flex items-center justify-between gap-6 py-4">
          <Link to="/landing" className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="OmniaCreata" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <Link to="/explore" className="transition hover:text-white">Explore</Link>
            <Link to="/subscription" className="transition hover:text-white">Pricing</Link>
            <Link to="/help" className="transition hover:text-white">Help</Link>
            {!isAuthenticated && <Link to="/login" className="transition hover:text-white">Log in</Link>}
            <Link to={cta} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">{ctaLabel}</Link>
          </nav>
        </header>

        {/* ═══ HERO ═══ */}
        <Reveal>
          <section className="relative flex min-h-[85vh] items-center py-16">
            <div className="relative z-10 max-w-[540px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Now in public beta
              </div>
              <h1 className="mt-6 text-[3.2rem] font-semibold leading-[1.05] tracking-[-0.05em] text-white md:text-[4.2rem]">
                Create stunning<br />
                <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">AI images</span> in seconds.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-zinc-300">
                Write a prompt, choose a style, and generate. Save your favorites, organize them into collections, and share them with the world.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={cta} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-black transition hover:shadow-[0_0_40px_rgba(255,255,255,0.12)] hover:opacity-90">
                  {ctaLabel} <ArrowRight className="h-4 w-4" />
                </Link>
                {!isAuthenticated && (
                  <Link to="/explore" className="rounded-full border border-white/[0.12] px-7 py-4 text-sm font-medium text-white transition hover:bg-white/[0.06]">
                    Browse Explore
                  </Link>
                )}
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-zinc-500">
                <span>✓ Free to start</span>
                <span>✓ No credit card</span>
                <span>✓ 60 monthly credits</span>
              </div>
            </div>

            {/* right floating cards */}
            <div className="absolute right-0 top-0 hidden h-full w-[55%] md:block">
              {heroCards.map((card, i) => (
                <div
                  key={card.src}
                  className="absolute overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.03] shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out hover:z-[50] hover:scale-[1.08] hover:shadow-[0_30px_80px_rgba(0,0,0,0.6)] hover:border-white/[0.16] cursor-pointer"
                  style={{
                    width: card.w,
                    height: card.h,
                    top: card.top,
                    right: card.right,
                    transform: `rotate(${card.rotate})`,
                    zIndex: card.z,
                    animationDelay: `${i * 150}ms`,
                  }}
                >
                  <img src={card.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent transition-opacity duration-300 hover:opacity-0" />
                </div>
              ))}
              <div className="absolute right-[15%] top-[12%] text-white/30 animate-pulse">✦</div>
              <div className="absolute right-[45%] top-[30%] text-white/20 animate-pulse" style={{ animationDelay: '0.7s' }}>✦</div>
              <div className="absolute right-[8%] top-[60%] text-white/25 animate-pulse" style={{ animationDelay: '1.4s' }}>✦</div>
            </div>
          </section>
        </Reveal>

        {/* ═══ SHOWCASE GRID — with parallax stagger ═══ */}
        <Reveal>
          <section className="border-t border-white/[0.06] py-20 md:py-28">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-zinc-400">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Stunning AI Images
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                Every image here was generated with OmniaCreata.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-500">
                From product photography to concept art — see what's possible.
              </p>
            </div>

            <div ref={showcaseParallax.ref} className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showcaseImages.map((img, i) => {
                const parallaxY = (i % 3 === 0) ? showcaseParallax.offset * 0.6 : (i % 3 === 1) ? -showcaseParallax.offset * 0.3 : showcaseParallax.offset * 0.45
                return (
                  <Reveal key={`${img.src}-${i}`} delay={i * 70}>
                    <div
                      className="group relative overflow-hidden rounded-[20px] border border-white/[0.06] bg-white/[0.02] will-change-transform"
                      style={{ transform: `translateY(${parallaxY}px)` }}
                    >
                      <img src={img.src} alt={img.label} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                      <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                        <div className="text-sm font-semibold text-white">{img.label}</div>
                        <p className="mt-1 text-xs text-zinc-300/80 line-clamp-1">"{img.prompt}"</p>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 opacity-40 group-hover:opacity-0 transition duration-300">
                        <p className="text-[10px] text-white/60 line-clamp-1 italic">"{img.prompt}"</p>
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </section>
        </Reveal>

        {/* ═══ USE CASES — slide-in animation ═══ */}
        <section className="border-t border-white/[0.06] py-20 md:py-28">
          <RevealSlide direction="left">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-600">Real-World Use Cases</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                See what you can create with OmniaCreata.
              </h2>
            </div>
          </RevealSlide>

          <Reveal>
            <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2">
              {useCaseTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'border border-white/[0.08] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </Reveal>

          <RevealScale delay={100}>
            <div className="mt-10 overflow-hidden rounded-[28px] border border-white/[0.06] bg-gradient-to-br from-[#0c1520] via-[#0a1018] to-[#0d1420]">
              <div className="grid gap-0 lg:grid-cols-2">
                <RevealSlide direction="left" delay={200}>
                  <div className="flex flex-col justify-center p-8 md:p-12">
                    <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">{activeCase.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">{activeCase.description}</p>
                    <ul className="mt-6 space-y-3">
                      {activeCase.features.map((f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-zinc-300">
                          <Zap className="h-4 w-4 shrink-0 text-cyan-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      <Link to={cta} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90">
                        Try it now <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </RevealSlide>
                <RevealSlide direction="right" delay={300}>
                  <div className="relative min-h-[320px] overflow-hidden lg:min-h-0">
                    <img
                      src={activeCase.image}
                      alt={activeCase.title}
                      className="h-full w-full object-cover transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c1520] via-transparent to-transparent lg:block hidden" />
                  </div>
                </RevealSlide>
              </div>
            </div>
          </RevealScale>
        </section>

        {/* ═══ HOW IT WORKS — scale entrance ═══ */}
        <section className="border-t border-white/[0.06] py-20 md:py-28">
          <Reveal>
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-[0.28em] text-zinc-600">How it works</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                Three simple steps to your perfect image.
              </h2>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <RevealScale key={step.title} delay={i * 180}>
                <div className="group relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-8 transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
                  {/* subtle gradient glow on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-br from-cyan-500/[0.03] to-blue-500/[0.03] opacity-0 transition duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 text-white transition group-hover:from-cyan-500/20 group-hover:to-blue-500/20">
                        <step.icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-medium text-zinc-600">0{i + 1}</div>
                    </div>
                    <h3 className="mt-6 text-xl font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{step.description}</p>
                  </div>
                </div>
              </RevealScale>
            ))}
          </div>
        </section>

        {/* ═══ GRADIENT CTA BLOCK ═══ */}
        <RevealScale>
          <section className="py-10 md:py-16">
            <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-cyan-600/90 via-blue-600/90 to-indigo-700/90 p-10 md:p-16">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">
                  Your next image is one prompt away.
                </h2>
                <p className="mt-4 text-base text-white/80">
                  Sign up for free and start generating in under a minute. No credit card required.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link to={cta} className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-black transition hover:opacity-90">
                    {ctaLabel} <ArrowRight className="h-4 w-4" />
                  </Link>
                  {!isAuthenticated && (
                    <Link to="/subscription" className="rounded-full border border-white/30 px-7 py-4 text-sm font-medium text-white transition hover:bg-white/10">
                      View pricing
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        </RevealScale>

        <LegalFooter className="mt-auto pb-6" />
      </div>
    </div>
  )
}
