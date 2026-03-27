import { ArrowRight, MonitorSmartphone, Sparkles } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Panel } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

function getDisplayName(email: string) {
  const value = email.trim().split('@')[0]?.replace(/[._-]+/g, ' ')?.trim()
  if (!value) return 'Omnia User'
  return value
    .split(/\s+/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInDemo, signInLocalOwner } = useStudioAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayName = useMemo(() => getDisplayName(email), [email])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signInDemo('free', displayName)
      navigate('/studio')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to enter Studio.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOwnerMode() {
    setSubmitting(true)
    setError(null)
    try {
      await signInLocalOwner('', 'Omnia Owner')
      navigate('/studio')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to enter owner mode.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#091018_0%,#0c1622_56%,#0a111a_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[10%] h-72 w-72 rounded-full bg-sky-400/8 blur-[120px]" />
        <div className="absolute bottom-[12%] right-[14%] h-72 w-72 rounded-full bg-cyan-300/6 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_460px]">
          <div className="flex flex-col justify-between gap-10">
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
                Log in
              </div>

              <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">Enter Studio and keep working.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
                Explore ideas, chat through edits, generate images, and keep everything organized in one calm workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Panel className="p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Explore</div>
                <div className="mt-3 text-lg font-semibold text-white">See what is possible first.</div>
              </Panel>
              <Panel className="p-5">
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Create</div>
                <div className="mt-3 text-lg font-semibold text-white">Generate without a cluttered screen.</div>
              </Panel>
            </div>
          </div>

          <Panel className="p-6 md:p-7">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Welcome back</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">Log in</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Use your email to enter. Full account auth will plug into this flow.</p>
              </div>

              <div className="space-y-3">
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
                    placeholder="Enter your password"
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
                {submitting ? 'Entering...' : 'Open Studio'}
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleOwnerMode}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MonitorSmartphone className="h-4 w-4" />
                Enter owner local mode
              </button>

              <div className="text-sm text-zinc-400">
                New here?{' '}
                <Link to="/signup" className="font-medium text-white transition hover:text-zinc-200">
                  Create your entry
                </Link>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </div>
  )
}
