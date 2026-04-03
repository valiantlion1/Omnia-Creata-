import { ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, signIn, signInWithProvider, consumeRedirectAfterAuth } = useStudioAuth()

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

  async function handleProvider(provider: 'google') {
    setGoogleBusy(true)
    setError(null)

    try {
      await signInWithProvider(provider, nextPath)
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : `${provider} sign in could not start.`)
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
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl md:leading-[1.02]">Pick up where you left off.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
              Sign in with your email or Google account to continue creating.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="max-w-sm">
              <button
                type="button"
                onClick={() => handleProvider('google')}
                disabled={googleBusy || submitting}
                className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] hover:border-white/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
            </div>

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

            <div className="flex items-center justify-end">
              <Link to="/help#faq" className="text-xs text-zinc-500 transition hover:text-zinc-300">Forgot password?</Link>
            </div>

            {error ? <div className="text-sm text-rose-200">{error}</div> : null}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting || !email.trim() || !password}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(6,182,212,0.25)] transition hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {submitting ? 'Signing in...' : 'Log in'}
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
