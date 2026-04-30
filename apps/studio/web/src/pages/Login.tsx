import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthExperience } from '@/components/AuthExperience'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { useStudioAuth } from '@/lib/studioAuth'
import { sanitizeStudioRedirectPath } from '@/lib/studioSession'

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, signIn, signInWithProvider, completeOAuthSignIn, consumeRedirectAfterAuth } = useStudioAuth()

  const explicitNextPath = useMemo(() => {
    const rawNextPath = new URLSearchParams(location.search).get('next')
    return rawNextPath ? sanitizeStudioRedirectPath(rawNextPath) : null
  }, [location.search])
  const nextPath = explicitNextPath ?? sanitizeStudioRedirectPath(null)
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    setGoogleBusy(false)
    setOauthCompleting(false)
    const storedRedirect = consumeRedirectAfterAuth()
    const redirect = explicitNextPath || storedRedirect || nextPath
    navigate(redirect, { replace: true })
  }, [consumeRedirectAfterAuth, explicitNextPath, isAuthenticated, navigate, nextPath])

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
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Complete the verification check to continue.')
      return
    }
    setSubmitting(true)
    setError(null)

    try {
      await signIn(email.trim().toLowerCase(), password, captchaToken ?? undefined)
      const storedRedirect = consumeRedirectAfterAuth()
      const redirect = explicitNextPath || storedRedirect || nextPath
      navigate(redirect, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in right now.')
      if (TURNSTILE_SITE_KEY) {
        setCaptchaToken(null)
        setCaptchaResetKey((value) => value + 1)
      }
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
    <AuthExperience
      title="Welcome back"
      subtitle="Sign in to your OmniaCreata Studio account."
      visualTitle="All your ideas. One Studio."
      visualSubtitle="Create, refine, and return to the visual work you were building."
      switchTo="/signup"
      switchLabel="Create account"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={() => handleProvider('google')}
          disabled={isBusy}
          className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-white/[0.1] bg-white/[0.045] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/[0.18] hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-600">
          <span className="h-px flex-1 bg-white/[0.06]" />
          <span>or continue with email</span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <label className="block">
          <div className="mb-2 text-sm font-medium text-zinc-200">Email</div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="studio-login-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@domain.com"
              autoComplete="email"
              disabled={oauthCompleting}
              className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3.5 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
            />
          </div>
        </label>

        <label className="block">
          <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="studio-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={oauthCompleting}
              className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3.5 pr-12 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/40"
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <div className="flex justify-end text-sm">
          <Link to="/help#faq" className="font-medium text-[rgb(var(--primary-light))] transition hover:text-white">
            Forgot password?
          </Link>
        </div>

        {error ? <div className="rounded-[14px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
        {oauthCompleting ? <div className="rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">Completing Google sign-in...</div> : null}

        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            action="login"
            resetKey={captchaResetKey}
            onTokenChange={setCaptchaToken}
          />
        ) : null}

        <button
          type="submit"
          disabled={isBusy || !email.trim() || !password || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[rgb(var(--primary-light))] px-5 py-3.5 text-sm font-bold text-[#120d06] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="text-center text-sm text-zinc-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-[rgb(var(--primary-light))] transition hover:text-white">
            Create account
          </Link>
        </p>

        <p className="pt-2 text-center text-xs leading-5 text-zinc-600">
          By signing in, you agree to our{' '}
          <Link to="/legal/terms" className="text-zinc-400 transition hover:text-white">Terms</Link>
          {' '}and{' '}
          <Link to="/legal/privacy" className="text-zinc-400 transition hover:text-white">Privacy Policy</Link>.
        </p>
      </form>
    </AuthExperience>
  )
}
