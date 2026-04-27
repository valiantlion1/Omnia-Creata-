import {
  ArrowRight,
  Download,
  ExternalLink,
  Folder,
  Heart,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { LegalFooter } from '@/components/StudioPrimitives'
import { studioGeneratedAssets } from '@/data/studioGeneratedAssets'
import { usePageMeta } from '@/lib/usePageMeta'
import alpineLake from '@/assets/landing/studio/alpine-lake.png'
import atelierInterior from '@/assets/landing/studio/atelier-interior.png'
import coralFlower from '@/assets/landing/studio/coral-flower.png'
import heroRiviera from '@/assets/landing/studio/hero-riviera.png'
import marbleBust from '@/assets/landing/studio/marble-bust.png'
import omniaSignature from '@/assets/landing/studio/omnia-signature.png'
import portraitFloral from '@/assets/landing/studio/portrait-floral.png'

type StudioAsset = {
  src: string
  alt: string
  label: string
  focus?: string
}

const galleryBelt: StudioAsset[] = [
  {
    src: portraitFloral,
    alt: 'Fine art portrait with a floral crown',
    label: 'Portrait',
    focus: '48% 34%',
  },
  {
    src: heroRiviera,
    alt: 'Italian Riviera villa terrace at golden hour',
    label: 'Cinematic',
    focus: '58% 48%',
  },
  {
    src: alpineLake,
    alt: 'Alpine lake and mountain range at sunrise',
    label: 'Landscape',
    focus: '46% 48%',
  },
  {
    src: coralFlower,
    alt: 'Dark coral flower macro with warm light',
    label: 'Macro',
    focus: '54% 46%',
  },
  {
    src: marbleBust,
    alt: 'Classical marble bust in a dim atelier',
    label: 'Fine art',
    focus: '42% 48%',
  },
  {
    src: atelierInterior,
    alt: 'Warm atelier interior with arched windows',
    label: 'Interior',
    focus: '42% 52%',
  },
  {
    src: portraitFloral,
    alt: 'Editorial portrait detail with warm studio shadow',
    label: 'Editorial',
    focus: '38% 42%',
  },
  {
    src: heroRiviera,
    alt: 'Golden coastal villa reference with sea light',
    label: 'Riviera',
    focus: '34% 44%',
  },
  {
    src: alpineLake,
    alt: 'Alpine sunrise environment concept',
    label: 'Environment',
    focus: '58% 42%',
  },
  {
    src: coralFlower,
    alt: 'Textural coral petal macro study',
    label: 'Texture',
    focus: '46% 38%',
  },
  {
    src: marbleBust,
    alt: 'Sculptural marble study with deep shadow',
    label: 'Sculpture',
    focus: '55% 48%',
  },
  {
    src: atelierInterior,
    alt: 'Library-like atelier interior with warm window light',
    label: 'Atelier',
    focus: '62% 48%',
  },
  {
    src: portraitFloral,
    alt: 'Painterly portrait crop with floral detail',
    label: 'Painterly',
    focus: '62% 38%',
  },
  {
    src: heroRiviera,
    alt: 'Bougainvillea terrace with cinematic sunset',
    label: 'Golden hour',
    focus: '72% 46%',
  },
  {
    src: alpineLake,
    alt: 'Wide alpine panorama with sunrise haze',
    label: 'Panorama',
    focus: '42% 44%',
  },
  {
    src: coralFlower,
    alt: 'Botanical macro rendered with dramatic light',
    label: 'Botanical',
    focus: '66% 50%',
  },
  {
    src: marbleBust,
    alt: 'Museum-like marble bust under warm atelier light',
    label: 'Classical',
    focus: '34% 48%',
  },
  {
    src: atelierInterior,
    alt: 'Warm interior product mood reference',
    label: 'Moodboard',
    focus: '30% 54%',
  },
  {
    src: portraitFloral,
    alt: 'Fashion portrait crop with flowered hair styling',
    label: 'Fashion',
    focus: '56% 36%',
  },
  {
    src: heroRiviera,
    alt: 'Italian coastal terrace framed as a film still',
    label: 'Film still',
    focus: '48% 46%',
  },
  {
    src: alpineLake,
    alt: 'Mountain lake environment with soft dawn light',
    label: 'Dawn lake',
    focus: '66% 48%',
  },
  {
    src: coralFlower,
    alt: 'Material study of warm coral petals',
    label: 'Material',
    focus: '40% 52%',
  },
  {
    src: marbleBust,
    alt: 'Chiaroscuro sculpture study with deep shadow',
    label: 'Chiaroscuro',
    focus: '60% 44%',
  },
  {
    src: atelierInterior,
    alt: 'Sunlit creative room with framed artwork and plants',
    label: 'Creative room',
    focus: '52% 42%',
  },
  {
    src: portraitFloral,
    alt: 'Character portrait with floral costume detail',
    label: 'Character',
    focus: '44% 40%',
  },
  {
    src: heroRiviera,
    alt: 'Travel editorial terrace on the Italian coastline',
    label: 'Travel',
    focus: '62% 42%',
  },
  {
    src: alpineLake,
    alt: 'Wilderness landscape reference with reflected sky',
    label: 'Wilderness',
    focus: '30% 52%',
  },
  {
    src: coralFlower,
    alt: 'Close botanical petal detail with rich red tone',
    label: 'Petal study',
    focus: '58% 42%',
  },
  {
    src: marbleBust,
    alt: 'Fine art plaster and ceramic still life detail',
    label: 'Gallery study',
    focus: '46% 52%',
  },
  {
    src: atelierInterior,
    alt: 'Product room reference with warm atelier shelves',
    label: 'Product room',
    focus: '70% 50%',
  },
  {
    src: portraitFloral,
    alt: 'Beauty portrait detail with dark painted backdrop',
    label: 'Beauty',
    focus: '70% 34%',
  },
  {
    src: heroRiviera,
    alt: 'Soft coastal sunset image-generation reference',
    label: 'Coastal',
    focus: '76% 50%',
  },
  {
    src: alpineLake,
    alt: 'Quiet mountain environment concept with lake reflection',
    label: 'Quiet wilds',
    focus: '52% 50%',
  },
  {
    src: coralFlower,
    alt: 'Red coral bloom used as a rich macro reference',
    label: 'Coral bloom',
    focus: '48% 48%',
  },
  {
    src: marbleBust,
    alt: 'Classical fine art reference with sculptural crop',
    label: 'Marble study',
    focus: '68% 48%',
  },
  {
    src: atelierInterior,
    alt: 'Still life interior corner with warm window light',
    label: 'Still life',
    focus: '36% 48%',
  },
  {
    src: portraitFloral,
    alt: 'Romantic editorial portrait with floral crown detail',
    label: 'Romantic',
    focus: '34% 36%',
  },
  {
    src: heroRiviera,
    alt: 'Mediterranean villa terrace with cinematic light',
    label: 'Mediterranean',
    focus: '28% 44%',
  },
  {
    src: alpineLake,
    alt: 'High alpine concept art style environment reference',
    label: 'Alpine',
    focus: '76% 42%',
  },
  {
    src: coralFlower,
    alt: 'Abstract floral macro texture in dark warm light',
    label: 'Abstract macro',
    focus: '72% 52%',
  },
  {
    src: marbleBust,
    alt: 'Antique sculpture reference beside ceramic forms',
    label: 'Antique',
    focus: '30% 50%',
  },
  {
    src: atelierInterior,
    alt: 'Warm library interior with art and plants',
    label: 'Library light',
    focus: '58% 46%',
  },
]

const atmosphereBelt: StudioAsset[] = studioGeneratedAssets.map(({ alt, focus, label, src }) => ({
  alt,
  focus,
  label,
  src,
}))

const genreBelt: StudioAsset[] = [...atmosphereBelt]

const [
  cyberpunkAsset,
  animeStormAsset,
  celCanyonAsset,
  fantasyDragonAsset,
  glamEditorialAsset,
  noirPortraitAsset,
  luxuryProductAsset,
  underwaterEditorialAsset,
  retrofutureCityAsset,
  liquidAbstractAsset,
  automotiveCampaignAsset,
  claymationWorkshopAsset,
] = genreBelt

const inspiredGalleryBelt = [
  ...galleryBelt.slice(0, 6),
  luxuryProductAsset,
  underwaterEditorialAsset,
  retrofutureCityAsset,
  liquidAbstractAsset,
  automotiveCampaignAsset,
  claymationWorkshopAsset,
]
const styleGenreBelt = [
  cyberpunkAsset,
  animeStormAsset,
  celCanyonAsset,
  fantasyDragonAsset,
  glamEditorialAsset,
  noirPortraitAsset,
  luxuryProductAsset,
  underwaterEditorialAsset,
  retrofutureCityAsset,
  liquidAbstractAsset,
  automotiveCampaignAsset,
  claymationWorkshopAsset,
]
const communityGalleryBelt = [
  underwaterEditorialAsset,
  luxuryProductAsset,
  liquidAbstractAsset,
  automotiveCampaignAsset,
  claymationWorkshopAsset,
  noirPortraitAsset,
  glamEditorialAsset,
  fantasyDragonAsset,
  cyberpunkAsset,
  animeStormAsset,
  celCanyonAsset,
  retrofutureCityAsset,
  ...galleryBelt.slice(0, 6),
]

const heroStyleCards = [cyberpunkAsset, animeStormAsset, luxuryProductAsset]
const ratios = ['1:1', '16:9', '9:16', '4:5', '3:4', '2:3']

const workflow = [
  {
    step: '01',
    title: 'Create',
    body: 'Turn a prompt into a composed first image without leaving the page flow.',
    icon: Sparkles,
  },
  {
    step: '02',
    title: 'Refine',
    body: 'Adjust style, ratio, and direction before the idea goes cold.',
    icon: Wand2,
  },
  {
    step: '03',
    title: 'Save',
    body: 'Keep the selected work in Library when it is worth returning to.',
    icon: Folder,
  },
]

export default function LandingPage() {
  const navigate = useNavigate()
  usePageMeta(
    'Omnia Creata Studio',
    'Premium AI image generation for creating, refining, and keeping visual work.',
  )

  const openCreate = () => navigate('/create?intent=first_creation')
  const openGallery = () => navigate('/explore')

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#080704] text-[#f6f0e6]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_16%,rgba(205,119,59,0.20),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(33,109,110,0.18),transparent_30%),linear-gradient(180deg,#12100b_0%,#080704_48%,#050403_100%)]" />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-soft-light"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      <header className="relative z-20 mx-auto flex max-w-[1560px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <button
          aria-label="Omnia Creata Studio home"
          className="group flex items-center"
          onClick={() => navigate('/landing')}
          type="button"
        >
          <img
            src={omniaSignature}
            alt="Omnia Creata"
            className="h-16 w-[136px] object-contain drop-shadow-[0_14px_30px_rgba(227,177,89,0.28)] transition duration-300 group-hover:-translate-y-0.5 sm:h-20 sm:w-[170px]"
          />
        </button>

        <nav className="hidden items-center gap-2 rounded-full border border-[#e6bb6d]/15 bg-black/25 p-1 text-sm text-[#d7ccbd] shadow-[0_18px_64px_rgba(0,0,0,0.26)] backdrop-blur-xl lg:flex">
          {[
            ['Create', openCreate],
            ['Gallery', openGallery],
            ['Styles', () => document.getElementById('styles')?.scrollIntoView({ behavior: 'smooth' })],
            ['Pricing', () => navigate('/subscription')],
          ].map(([label, handler]) => (
            <button
              className="rounded-full px-5 py-2.5 transition hover:bg-white/[0.05] hover:text-white"
              key={label as string}
              onClick={handler as () => void}
              type="button"
            >
              {label as string}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="hidden text-sm font-semibold text-[#d7ccbd] transition hover:text-white sm:inline-flex"
            onClick={() => navigate('/login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className="rounded-full border border-[#f6cf8b]/40 bg-gradient-to-r from-[#f4c979] to-[#c88f3d] px-4 py-2.5 text-sm font-bold text-[#1a1007] shadow-[0_18px_50px_rgba(199,136,55,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(199,136,55,0.3)] sm:px-5"
            onClick={openCreate}
            type="button"
          >
            Start creating
          </button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="relative mx-auto grid min-h-[calc(100svh-112px)] max-w-[1560px] gap-8 px-5 pb-8 pt-2 sm:px-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-center">
          <div className="pointer-events-none absolute left-[-12%] top-[8%] h-[28rem] w-[28rem] rounded-full bg-[#d4733f]/20 blur-[130px]" />
          <div className="pointer-events-none absolute right-[-10%] top-[12%] h-[34rem] w-[34rem] rounded-full bg-[#1f7777]/15 blur-[150px]" />

          <div className="relative z-10 max-w-xl">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.36em] text-[#f0c979]">
              AI image generation studio
            </p>
            <h1 className="max-w-[10ch] font-display text-[58px] font-black leading-[0.91] tracking-[-0.08em] text-[#f6f0e6] sm:text-[76px] lg:text-[92px] xl:text-[106px]">
              Your ideas.
              <span className="block text-[#f1bf67]">Extraordinary images.</span>
            </h1>
            <p className="mt-7 max-w-[34rem] text-[16px] leading-8 text-[#cfc4b5] sm:text-[18px]">
              Create polished images from a prompt, refine the direction, and keep the work worth saving.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#f6cf8b]/45 bg-gradient-to-r from-[#f4c979] to-[#c88f3d] px-7 py-4 text-base font-bold text-[#1a1007] shadow-[0_24px_70px_rgba(199,136,55,0.25)] transition hover:-translate-y-0.5"
                onClick={openCreate}
                type="button"
              >
                Start creating
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f6cf8b]/18 bg-white/[0.045] px-7 py-4 text-base font-semibold text-[#f6f0e6] backdrop-blur-xl transition hover:border-[#f6cf8b]/32 hover:bg-white/[0.07]"
                onClick={openGallery}
                type="button"
              >
                Explore gallery
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <TrustNote index="01" title="Open the canvas" body="Create is the next step from the landing page." />
              <TrustNote index="02" title="Keep the work" body="Library and history unlock when the project matters." />
            </div>
          </div>

          <div className="relative z-10 overflow-hidden rounded-[32px] border border-[#f1bf67]/18 bg-[#110e09]/72 shadow-[0_34px_110px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-[-20%] bg-[linear-gradient(112deg,transparent_25%,rgba(246,207,139,0.07)_44%,rgba(255,255,255,0.04)_52%,transparent_72%)] animate-[studio-panel-sweep_16s_linear_infinite]" />
            <div className="relative z-10 grid gap-4 p-4">
              <GeneratedPreview />
              <ComposerPanel onCreate={openCreate} />
            </div>
          </div>
        </section>

        <section className="relative z-10 space-y-5 pb-10" id="gallery">
          <GalleryRail items={inspiredGalleryBelt} title="Inspired creations" />
          <GalleryRail items={styleGenreBelt} title="Style genres" variant="slow" />
          <GalleryRail items={communityGalleryBelt} title="Community gallery" variant="offset" />
        </section>

        <section className="relative z-10 mx-auto grid max-w-[1560px] gap-4 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.15fr]">
          {workflow.map((item) => (
            <article
              className="rounded-[26px] border border-[#f1bf67]/14 bg-white/[0.04] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl"
              key={item.title}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-bold text-[#f1bf67]">{item.step}</span>
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#f1bf67]/18 bg-[#f1bf67]/8 text-[#f1bf67]">
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-[-0.05em] text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#cfc4b5]">{item.body}</p>
            </article>
          ))}

          <article className="rounded-[26px] border border-[#f1bf67]/14 bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f1bf67]">Library</p>
            <h2 className="mt-4 text-2xl font-bold tracking-[-0.05em] text-white">Your library, everywhere</h2>
            <p className="mt-3 text-sm leading-7 text-[#cfc4b5]">
              Save selected images, return to projects, and keep the creative thread intact.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Desktop', 'Tablet', 'Mobile', 'Cloud'].map((item) => (
                <span
                  className="rounded-full border border-[#f1bf67]/18 bg-[#f1bf67]/8 px-3 py-1.5 text-xs font-semibold text-[#f1bf67]"
                  key={item}
                >
                  {item}
                </span>
              ))}
            </div>
          </article>
        </section>

        <section className="relative z-10 px-5 pb-24 sm:px-8">
          <div className="mx-auto flex max-w-[1560px] flex-col gap-6 rounded-[32px] border border-[#f1bf67]/16 bg-white/[0.045] p-7 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:p-9">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#f1bf67]">Try the flow</p>
              <h2 className="mt-4 max-w-3xl text-[34px] font-black leading-[1.02] tracking-[-0.07em] text-white sm:text-[52px]">
                Start in Create. Save when the image is worth keeping.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-full border border-[#f6cf8b]/45 bg-gradient-to-r from-[#f4c979] to-[#c88f3d] px-7 py-4 text-base font-bold text-[#1a1007] shadow-[0_24px_70px_rgba(199,136,55,0.25)] transition hover:-translate-y-0.5"
                onClick={openCreate}
                type="button"
              >
                Start creating
              </button>
              <button
                className="rounded-full border border-[#f6cf8b]/18 bg-white/[0.045] px-7 py-4 text-base font-semibold text-[#f6f0e6] transition hover:bg-white/[0.07]"
                onClick={() => navigate('/login')}
                type="button"
              >
                Sign in
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#f1bf67]/10 bg-[#050403] px-6 py-8 md:px-8">
        <LegalFooter className="mx-auto max-w-[1560px]" />
      </footer>
    </div>
  )
}

function ComposerPanel({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid gap-3 rounded-[28px] border border-[rgba(124,90,43,0.48)] bg-[radial-gradient(circle_at_22%_0%,rgba(241,191,103,0.08),transparent_32%),linear-gradient(180deg,rgba(18,17,14,0.96),rgba(8,9,8,0.96))] p-3 shadow-[0_24px_86px_rgba(0,0,0,0.38)] xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-[24px] border border-[rgba(124,90,43,0.28)] bg-[linear-gradient(180deg,rgba(17,17,14,0.94),rgba(10,11,10,0.9))] p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9f9280]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#f1bf67]" />
            Describe your image
          </span>
          <span className="hidden text-[#8a7b68] sm:inline">Templates</span>
        </div>

        <div className="rounded-[18px] border border-white/[0.10] bg-[#171711] px-4 py-3 text-sm leading-7 text-[#cfc4b5]">
          Cyberpunk neon rain market at night, cinematic wet-street reflections, teal-magenta light, premium detail
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[#9f9280]">Save style</span>
          <span className="rounded-full border border-[#f1bf67]/18 bg-[#f1bf67]/7 px-3 py-1.5 text-[#f1bf67]">Refine prompt</span>
        </div>

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b68]">Aspect ratio</p>
          <div className="flex overflow-hidden rounded-[14px] border border-white/[0.08] bg-black/18">
            {ratios.map((ratio) => (
              <span
                className={[
                  'flex min-h-10 flex-1 items-center justify-center border-r border-white/[0.07] px-2 text-[12px] font-bold last:border-r-0',
                  ratio === '1:1'
                    ? 'bg-[#f1bf67]/14 text-[#f1bf67] shadow-[inset_0_0_0_1px_rgba(241,191,103,0.42)]'
                    : 'text-[#8f8170]',
                ].join(' ')}
                key={ratio}
              >
                {ratio}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[rgba(124,90,43,0.28)] bg-[linear-gradient(180deg,rgba(17,17,14,0.9),rgba(10,11,10,0.88))] p-4" id="styles">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b68]">Style</p>
        <div className="grid grid-cols-3 gap-2">
          {heroStyleCards.map((asset) => (
            <figure
              className="group relative h-[70px] overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#11110f]"
              key={asset.src}
            >
              <img
                alt=""
                className="h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105"
                src={asset.src}
                style={{ objectPosition: asset.focus ?? 'center' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/22 to-black/4" />
              <figcaption className="absolute inset-x-2 bottom-2 truncate text-[10px] font-bold text-white">
                {asset.label}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-3 rounded-[16px] border border-white/[0.08] bg-[#171711] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a7b68]">Model</p>
          <p className="mt-1 text-sm font-bold text-white">FLUX.2</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div>
            <p className="text-[12px] font-bold text-white">3 Credits</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a7b68]">1 variation reserve</p>
          </div>
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#c99849] px-5 text-sm font-black text-[#120b05] shadow-[0_20px_54px_rgba(201,152,73,0.22)] transition hover:-translate-y-0.5 hover:bg-[#f1bf67]"
            onClick={onCreate}
            type="button"
          >
            <Wand2 className="h-4 w-4" />
            Generate image
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-[18px] border border-white/[0.07] bg-[#11110f]/72 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a7b68]">
          <span>Optional controls</span>
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Advanced
          </span>
        </div>
      </div>
    </div>
  )
}

function GeneratedPreview() {
  return (
    <figure className="relative min-h-[300px] overflow-hidden rounded-[24px] border border-[#f1bf67]/20 bg-black/25 sm:min-h-[320px]">
      <img
        alt="Generated cyberpunk neon rain market preview"
        className="absolute inset-0 h-full w-full object-cover"
        src={cyberpunkAsset.src}
        style={{ objectPosition: cyberpunkAsset.focus ?? 'center' }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_54%,rgba(0,0,0,0.52)),linear-gradient(110deg,rgba(255,255,255,0.08),transparent_34%,rgba(241,191,103,0.10))]" />
      <div className="absolute right-4 top-4 grid gap-2 rounded-2xl border border-[#f1bf67]/18 bg-black/50 p-2 text-[#f1bf67] backdrop-blur-xl">
        <PreviewButton label="Like" icon={<Heart className="h-4 w-4" />} />
        <PreviewButton label="Download" icon={<Download className="h-4 w-4" />} />
        <PreviewButton label="Open" icon={<ExternalLink className="h-4 w-4" />} />
      </div>
      <figcaption className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f1bf67]">Generated preview</p>
          <p className="mt-1 text-sm text-white">Cyberpunk neon rain, cinematic reflections</p>
        </div>
        <img
          alt=""
          className="h-12 w-24 object-contain opacity-85"
          src={omniaSignature}
        />
      </figcaption>
    </figure>
  )
}

function PreviewButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-white/10"
      type="button"
    >
      {icon}
    </button>
  )
}

function GalleryRail({
  items,
  title,
  variant = 'base',
}: {
  items?: StudioAsset[]
  title: string
  variant?: 'base' | 'offset' | 'slow'
}) {
  const railItems = items ?? inspiredGalleryBelt
  const railAssets = [...railItems, ...railItems]
  const railClassName = [
    'landing-asset-rail',
    variant === 'offset' ? 'landing-asset-rail--offset' : '',
    variant === 'slow' ? 'landing-asset-rail--slow' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 px-5 sm:px-8">
        <span className="h-2 w-2 rounded-full bg-[#f1bf67] shadow-[0_0_24px_rgba(241,191,103,0.75)]" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#cfc4b5]">{title}</h2>
      </div>
      <div className="landing-rail-window overflow-hidden">
        <div className={railClassName}>
          {railAssets.map((asset, index) => (
            <figure
              className="group relative h-[118px] w-[260px] shrink-0 overflow-hidden rounded-[18px] border border-[#f1bf67]/16 bg-white/[0.04] shadow-[0_18px_54px_rgba(0,0,0,0.28)] sm:h-[138px] sm:w-[310px]"
              key={`${asset.src}-${asset.label}-${index}`}
            >
              <img
                alt={asset.alt}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                loading="lazy"
                src={asset.src}
                style={{ objectPosition: asset.focus ?? 'center' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <figcaption className="absolute bottom-3 left-3 text-xs font-bold uppercase tracking-[0.14em] text-white">
                {asset.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrustNote({ body, index, title }: { body: string; index: string; title: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-2xl border border-[#f1bf67]/14 bg-white/[0.045] p-4 backdrop-blur-xl">
      <span className="row-span-2 grid h-9 w-9 place-items-center rounded-full border border-[#f1bf67]/22 text-xs font-bold text-[#f1bf67]">
        {index}
      </span>
      <strong className="text-sm text-white">{title}</strong>
      <p className="text-xs leading-5 text-[#cfc4b5]">{body}</p>
    </div>
  )
}
