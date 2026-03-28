import { ArrowRight } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, signIn, signInWithGoogle, consumeRedirectAfterAuth } = useStudioAuth()

  const nextPath = useMemo(() => new URLSearchParams(location.search).get('next') || '/studio', [location.search])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    const redirect = consumeRedirectAfterAuth() || nextPath
    navigate(redirect, { replace: true })
  }, [consumeRedirectAfterAuth, isAuthenticated, navigate, nextPath])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await signIn(email.trim().toLowerCase(), password)
      navigate(nextPath, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in right now.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true)
    setError(null)

    try {
      await signInWithGoogle(nextPath)
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Google sign in could not start.')
      setGoogleBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#091018_0%,#0c1622_56%,#0a111a_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[8%] h-72 w-72 rounded-full bg-sky-400/8 blur-[120px]" />
        <div className="absolute bottom-[12%] right-[12%] h-72 w-72 rounded-full bg-cyan-300/6 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-8">
        <div className="flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Studio</div>
            </div>
          </Link>
          <Link to="/signup" className="text-sm text-zinc-300 transition hover:text-white">
            Start free
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Log in</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl md:leading-[1.02]">Get back into Studio and keep moving.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
              Use email or Google. Once you are in, Explore, Compose, Chat, and Library stay in the same clean workflow.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleBusy}
              className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleBusy ? 'Opening Google...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-zinc-600">
              <span className="h-px flex-1 bg-white/[0.06]" />
              <span>Email</span>
              <span className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Email</div>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@omniacreata.com"
                className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
              />
            </label>

            {error ? <div className="text-sm text-rose-200">{error}</div> : null}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Opening Studio...' : 'Open Studio'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="text-sm text-zinc-400">
                Need an account?{' '}
                <Link to="/signup" className="text-white transition hover:text-zinc-200">
                  Create one
                </Link>
              </div>
            </div>
          </form>
        </div>

        <LegalFooter className="pb-6" />
      </div>
    </div>
  )
}
