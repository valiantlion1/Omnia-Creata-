import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Coins, ShieldCheck } from 'lucide-react'

import alpineLake from '@/assets/landing/studio/alpine-lake.png'
import atelierInterior from '@/assets/landing/studio/atelier-interior.png'
import coralFlower from '@/assets/landing/studio/coral-flower.png'
import heroRiviera from '@/assets/landing/studio/hero-riviera.png'
import marbleBust from '@/assets/landing/studio/marble-bust.png'
import portraitFloral from '@/assets/landing/studio/portrait-floral.png'

const artTiles = [
  { src: portraitFloral, alt: 'Editorial portrait reference', className: 'left-[29%] top-[3%] h-[36%] w-[28%] rotate-[-3deg]', delay: '0ms' },
  { src: heroRiviera, alt: 'Cinematic landscape reference', className: 'left-[58%] top-[5%] h-[38%] w-[28%] rotate-[2deg]', delay: '180ms' },
  { src: atelierInterior, alt: 'Atelier interior reference', className: 'left-[28%] top-[45%] h-[29%] w-[30%] rotate-[1.5deg]', delay: '340ms' },
  { src: alpineLake, alt: 'Mountain landscape reference', className: 'left-[60%] top-[47%] h-[30%] w-[30%] rotate-[-2deg]', delay: '520ms' },
  { src: marbleBust, alt: 'Sculptural portrait reference', className: 'left-[30%] top-[78%] h-[28%] w-[27%] rotate-[-1deg]', delay: '680ms' },
  { src: coralFlower, alt: 'Macro detail reference', className: 'left-[60%] top-[80%] h-[27%] w-[28%] rotate-[2.5deg]', delay: '820ms' },
]

function AuthArtWall({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <section className="sticky top-0 hidden h-screen overflow-hidden border-r border-white/[0.06] bg-[#060504] lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_38%_18%,rgba(241,191,103,0.14),transparent_26%),radial-gradient(circle_at_72%_62%,rgba(255,255,255,0.06),transparent_34%),linear-gradient(90deg,rgba(0,0,0,0.35),transparent_42%,rgba(0,0,0,0.65))]" />
      <div className="absolute inset-y-0 left-0 z-10 w-[31%] bg-[linear-gradient(90deg,#060504_0%,rgba(6,5,4,0.92)_64%,rgba(6,5,4,0)_100%)]" />
      <div className="absolute inset-y-0 right-0 z-10 w-[20%] bg-[linear-gradient(270deg,#060504_0%,rgba(6,5,4,0)_100%)]" />

      <div className="absolute left-14 top-12 z-20">
        <Link to="/landing" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/50">
          <img src="/omnia-crest.png" alt="Omnia Creata" className="h-12 w-12 object-contain" />
          <div>
            <div className="text-[15px] font-semibold tracking-[0.18em] text-zinc-100">OMNIACREATA</div>
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgb(var(--primary-light))]">Studio</div>
          </div>
        </Link>
      </div>

      <div className="absolute inset-0">
        <div className="auth-wall-drift absolute inset-0 motion-reduce:animate-none">
          {artTiles.map((tile) => (
            <div
              key={tile.alt}
              className={`auth-art-tile absolute overflow-hidden rounded-[12px] border border-white/[0.08] bg-white/[0.03] shadow-[0_28px_90px_rgba(0,0,0,0.52)] ${tile.className}`}
              style={{ animationDelay: tile.delay }}
            >
              <img src={tile.src} alt={tile.alt} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.36))]" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 left-14 z-20 max-w-[360px]">
        <h2 className="font-display text-[3.2rem] font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-100">
          {title}
        </h2>
        <p className="mt-5 max-w-[280px] text-sm leading-6 text-zinc-400">{subtitle}</p>
      </div>

      <div className="absolute bottom-10 left-14 z-20 flex items-center gap-3 text-xs text-[rgb(var(--primary-light))]/80">
        <div className="flex -space-x-2">
          {[portraitFloral, marbleBust, alpineLake, heroRiviera].map((src, index) => (
            <img
              key={src}
              src={src}
              alt=""
              className="h-8 w-8 rounded-full border border-[#060504] object-cover"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </div>
        <span className="font-semibold">Create, save, and return anytime</span>
      </div>
    </section>
  )
}

function MobileArtStrip() {
  return (
    <div className="grid grid-cols-4 gap-2 lg:hidden" aria-hidden="true">
      {[portraitFloral, heroRiviera, atelierInterior, alpineLake].map((src, index) => (
        <div
          key={src}
          className="auth-art-tile h-20 overflow-hidden rounded-[14px] border border-white/[0.07] bg-white/[0.03]"
          style={{ animationDelay: `${index * 120}ms` }}
        >
          <img src={src} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  )
}

export function AuthExperience({
  children,
  title,
  subtitle,
  visualTitle,
  visualSubtitle,
  switchTo,
  switchLabel,
}: {
  children: ReactNode
  title: string
  subtitle: string
  visualTitle: string
  visualSubtitle: string
  switchTo: string
  switchLabel: string
}) {
  return (
    <div className="min-h-screen bg-[#060504] text-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.72fr)]">
        <AuthArtWall title={visualTitle} subtitle={visualSubtitle} />

        <main className="relative flex min-h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_90%_12%,rgba(241,191,103,0.1),transparent_30%),linear-gradient(180deg,#0b0907_0%,#060504_100%)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(241,191,103,0.06),transparent_20%,transparent_80%,rgba(241,191,103,0.05))]" />
          <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
            <header className="flex items-center justify-between gap-4">
              <Link to="/landing" className="flex items-center gap-3 lg:hidden">
                <img src="/omnia-crest.png" alt="Omnia Creata" className="h-10 w-10 object-contain" />
                <div>
                  <div className="text-sm font-semibold tracking-[0.18em] text-zinc-100">OMNIACREATA</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[rgb(var(--primary-light))]">Studio</div>
                </div>
              </Link>
              <Link to={switchTo} className="ml-auto text-sm font-medium text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/50">
                {switchLabel}
              </Link>
            </header>

            <div className="flex flex-1 items-center py-8 lg:py-10">
              <div className="w-full">
                <MobileArtStrip />
                <div className="mt-8 rounded-[24px] border border-[rgb(var(--primary-light))]/[0.14] bg-[linear-gradient(180deg,rgba(19,16,12,0.88),rgba(8,7,6,0.96))] p-5 shadow-[0_32px_120px_rgba(0,0,0,0.45)] sm:p-7 lg:mt-0 lg:p-8">
                  <div className="mb-7">
                    <h1 className="text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">{title}</h1>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
                  </div>
                  {children}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.035] p-4 text-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--primary-light))]/10 text-[rgb(var(--primary-light))]">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-100">Protected sign-in</span>
                      <span className="text-xs text-zinc-500">Your account stays yours</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.035] p-4 text-sm">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--primary-light))]/10 text-[rgb(var(--primary-light))]">
                      <Coins className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-zinc-100">Studio credits</span>
                      <span className="text-xs text-zinc-500">Ready after sign-in</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
