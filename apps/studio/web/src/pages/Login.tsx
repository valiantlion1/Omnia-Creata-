import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'
import { sanitizeStudioRedirectPath } from '@/lib/studioSession'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, signIn, signInWithProvider, completeOAuthSignIn, consumeRedirectAfterAuth } = useStudioAuth()

  const nextPath = useMemo(
    () => sanitizeStudioRedirectPath(new URLSearchParams(location.search).get('next')),
    [location.search],
  )
  const isOAuthCallback = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''))
    return (
      searchParams.get('oauth') === '1' ||
      searchParams.has('code') ||
      searchParams.has('error') ||
      hashParams.has('access_token') ||
      hashParams.has('refresh_token') ||
      hashParams.has('error')
    )
  }, [location.hash, location.search])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [oauthCompleting, setOauthCompleting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    setGoogleBusy(false)
    setOauthCompleting(false)
    const redirect = consumeRedirectAfterAuth() || nextPath
    navigate(redirect, { replace: true })
  }, [consumeRedirectAfterAuth, isAuthenticated, navigate, nextPath])

  useEffect(() => {
    if (!isOAuthCallback) return

    let cancelled = false
    setGoogleBusy(true)
    setOauthCompleting(true)
    setError(null)

    completeOAuthSignIn().catch((oauthError) => {
      if (cancelled) return
      setError(oauthError instanceof Error ? oauthError.message : 'Google sign-in could not be completed.')
      setGoogleBusy(false)
      setOauthCompleting(false)
    })

    return () => {
      cancelled = true
    }
  }, [completeOAuthSignIn, isOAuthCallback])

  const isBusy = submitting || googleBusy || oauthCompleting

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
        <div className="absolute left-[8%] top-[6%] h-[22rem] w-[22rem] rounded-full blur-[120px] animate-[oc-gradientShift_20s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[10%] h-[20rem] w-[20rem] rounded-full blur-[130px] animate-[oc-gradientShiftB_24s_ease-in-out_infinite]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }} />
        <div className="absolute top-[50%] left-[50%] h-[16rem] w-[16rem] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 md:px-8">
        <div className="flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-zinc-100">OMNIACREATA</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.24em]" style={{ background: 'linear-gradient(90deg, rgb(var(--primary-light)), rgb(var(--accent)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Studio</div>
            </div>
          </Link>
          <Link to="/signup" className="text-sm text-zinc-300 transition hover:text-white">
            Create account
          </Link>
        </div>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Log in</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white font-display md:text-6xl md:leading-[1.02]">Pick up where you <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--primary-light)), rgb(var(--accent)))' }}>left off</span>.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
              Sign in with your email or Google account to continue creating.
            </p>
          </div>

          <form className="space-y-5 rounded-[24px] border border-white/[0.08] p-6 md:p-8" onSubmit={handleSubmit} style={{ background: 'linear-gradient(180deg, rgba(14,14,22,0.7) 0%, rgba(10,10,16,0.9) 100%)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'var(--border-glow), 0 24px 80px rgba(0,0,0,0.4)' }}>
            <div className="max-w-sm">
              <button
                type="button"
                onClick={() => handleProvider('google')}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-white/[0.08] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
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
                id="studio-login-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@omniacreata.com"
                autoComplete="email"
                disabled={oauthCompleting}
                className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[rgb(var(--primary-light)/0.5)] focus:shadow-[0_2px_12px_-4px_rgba(124,58,237,0.3)]"
              />
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
              <div className="relative">
                <input
                  id="studio-login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={oauthCompleting}
                  className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 pr-10 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-[rgb(var(--primary-light)/0.5)] focus:shadow-[0_2px_12px_-4px_rgba(124,58,237,0.3)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:text-zinc-300"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-end">
              <Link to="/help#faq" className="text-xs text-zinc-500 transition hover:text-zinc-300">Forgot password?</Link>
            </div>

            {error ? <div className="text-sm text-rose-200">{error}</div> : null}
            {oauthCompleting ? <div className="text-sm text-zinc-300">Completing Google sign-in...</div> : null}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={isBusy || !email.trim() || !password}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_32px_rgba(124,58,237,0.35)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))', boxShadow: '0 0 24px rgba(124,58,237,0.22)' }}
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
