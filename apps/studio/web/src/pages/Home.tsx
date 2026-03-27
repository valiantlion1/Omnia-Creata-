import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Panel } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

const featureBlocks = [
  {
    eyebrow: 'Explore',
    title: 'Start with direction',
    body: 'See ideas, references, and recent work before you start generating.',
  },
  {
    eyebrow: 'Create',
    title: 'Generate without clutter',
    body: 'Write a prompt, upload a reference, or refine an image in one focused surface.',
  },
  {
    eyebrow: 'Library',
    title: 'Keep results organized',
    body: 'Every image, variation, and collection stays easy to find later.',
  },
]

const workflowSteps = [
  ['1', 'Explore', 'Find a direction or visual reference.'],
  ['2', 'Chat or Create', 'Plan with chat or generate directly.'],
  ['3', 'Save and return', 'Your results land in Library and stay organized.'],
]

const useCases = ['Brand visuals', 'Product images', 'Social content', 'Poster ideas', 'Prompt-based edits', 'Reference-led image work']

export default function HomePage() {
  const { isAuthenticated } = useStudioAuth()

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#091018_0%,#0c1622_56%,#0a111a_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[8%] h-72 w-72 rounded-full bg-sky-400/8 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-cyan-300/6 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6 md:px-6 md:py-8">
        <header className="flex items-center justify-between gap-4 rounded-[26px] border border-white/10 bg-[rgba(8,14,20,0.76)] px-5 py-4 backdrop-blur-xl">
          <Link to="/landing" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <img src="/omnia-crest.png" alt="Omnia Creata" className="h-6 w-6 object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">Studio</div>
            </div>
          </Link>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/explore" className="text-sm text-zinc-300 transition hover:text-white">
              Explore
            </Link>
            <Link to="/create" className="text-sm text-zinc-300 transition hover:text-white">
              Create
            </Link>
            <Link to="/subscription" className="text-sm text-zinc-300 transition hover:text-white">
              Subscription
            </Link>
            {!isAuthenticated ? (
              <Link to="/login" className="text-sm text-zinc-300 transition hover:text-white">
                Log in
              </Link>
            ) : null}
            <Link to="/studio" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:opacity-90">
              {isAuthenticated ? 'Open Studio' : 'Enter OmniaCreata'}
            </Link>
          </div>
        </header>

        <section>
          <Panel className="overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              OmniaCreata Studio
            </div>

            <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.02]">
              Create images with chat, prompts, and references in one place.
            </h1>

            <div className="mt-5 max-w-3xl space-y-2">
              <p className="text-base font-medium text-zinc-100 md:text-lg">OmniaCreata helps you turn ideas into visuals.</p>
              <p className="text-sm leading-7 text-zinc-400 md:text-base">
                Explore ideas, generate images, edit results, and keep everything organized without a cluttered workflow.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Open Studio
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated ? (
                <Link
                  to="/signup"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
                >
                  Start free
                </Link>
              ) : (
                <Link
                  to="/create"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
                >
                  Go to Create
                </Link>
              )}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {featureBlocks.map((block) => (
            <Panel key={block.title}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{block.eyebrow}</div>
              <h2 className="mt-3 text-2xl font-semibold text-white">{block.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{block.body}</p>
            </Panel>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">What it does</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">A simpler AI image workflow.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300">
              OmniaCreata is for exploring ideas, creating images, editing results, and keeping everything in order. It is made to feel calm and useful instead of overloaded.
            </p>
          </Panel>

          <Panel>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">How it works</div>
            <div className="mt-4 space-y-3">
              {workflowSteps.map(([step, title, body]) => (
                <div key={step} className="flex items-start gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">{step}</div>
                  <div>
                    <div className="text-base font-semibold text-white">{title}</div>
                    <div className="mt-1.5 text-sm leading-6 text-zinc-400">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Panel>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Use cases</div>
            <h2 className="mt-3 text-3xl font-semibold text-white">Built for everyday visual work.</h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {useCases.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200">
                  {item}
                </span>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Start</div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Open the part you need.</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">
              Explore for ideas, Chat for planning, Create for generation, and Library for saved work.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              >
                Open Studio
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!isAuthenticated ? (
                <Link
                  to="/signup"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06]"
                >
                  Start free
                </Link>
              ) : null}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  )
}
