import { ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Panel } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signInDemo } = useStudioAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signInDemo('free', displayName.trim() || email.trim().split('@')[0] || 'Omnia User')
      navigate('/studio')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your entry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#091018_0%,#0c1622_56%,#0a111a_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[8%] h-72 w-72 rounded-full bg-sky-400/8 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[12%] h-72 w-72 rounded-full bg-cyan-300/6 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[460px_1fr]">
          <Panel className="order-2 p-6 md:p-7 lg:order-1">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Start free</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Create your entry</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Enter once and go straight into Explore, Create, Chat, and Library.</p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-zinc-200">Name</div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-zinc-200">Email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@omniacreata.com"
                    className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a password"
                    className="w-full rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                  />
                </label>
              </div>

              {error ? <div className="rounded-[18px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Entering...' : 'Enter OmniaCreata'}
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="text-sm text-zinc-400">
                Already inside?{' '}
                <Link to="/login" className="font-medium text-white transition hover:text-zinc-200">
                  Log in
                </Link>
              </div>
            </form>
          </Panel>

          <div className="order-1 flex flex-col justify-between gap-10 lg:order-2">
            <div>
              <Link to="/landing" className="inline-flex items-center gap-3">
                <img src="/omnia-crest.png" alt="Omnia Creata" className="h-10 w-10 object-contain" />
                <div>
                  <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-400">Studio</div>
                </div>
              </Link>

              <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                OmniaCreata Studio
              </div>

              <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">A calmer way to turn ideas into visuals.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
                Explore references, chat through direction, generate images, and keep everything organized without losing focus.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Panel className="p-5">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                  <Wand2 className="h-3.5 w-3.5" />
                  Create
                </div>
                <div className="mt-3 text-lg font-semibold text-white">Generate directly when you already know the direction.</div>
              </Panel>
              <Panel className="p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Library</div>
                <div className="mt-3 text-lg font-semibold text-white">Every result stays organized and easy to revisit.</div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
