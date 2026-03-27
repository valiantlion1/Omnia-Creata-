import { Link } from 'react-router-dom'

import { AppPage, Surface } from '@/components/StudioPrimitives'

export default function LearnPage() {
  return (
    <AppPage>
      <div className="space-y-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Learn</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-[2rem]">How Studio works</h1>
        </div>

        <Surface tone="muted" className="space-y-2">
          {[
            ['Explore', 'Look for direction and references.'],
            ['Chat', 'Plan prompts, edits, and image changes.'],
            ['Create', 'Generate when the direction is clear.'],
            ['Library', 'Find saved work, collections, and trash.'],
          ].map(([title, body]) => (
            <div key={title} className="flex items-start justify-between gap-4 rounded-2xl px-1 py-2">
              <div>
                <div className="text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-sm text-zinc-400">{body}</div>
              </div>
            </div>
          ))}
        </Surface>

        <Surface tone="muted">
          <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">Docs</div>
          <div className="mt-2 text-lg font-semibold text-white">Formal pages</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/docs#faq" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
              FAQ
            </Link>
            <Link to="/docs#terms" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
              Terms
            </Link>
            <Link to="/docs#privacy" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
              Privacy
            </Link>
            <Link to="/docs#policy" className="rounded-full bg-white/[0.04] px-3.5 py-1.5 text-sm text-white ring-1 ring-white/8 transition hover:bg-white/[0.08]">
              Policy
            </Link>
          </div>
        </Surface>
      </div>
    </AppPage>
  )
}
