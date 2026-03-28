import { ArrowRight } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { LegalFooter } from '@/components/StudioPrimitives'
import { useStudioAuth } from '@/lib/studioAuth'

export default function SignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated, signInWithGoogle, signUp } = useStudioAuth()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [acceptedUsagePolicy, setAcceptedUsagePolicy] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    navigate('/subscription?welcome=1', { replace: true })
  }, [isAuthenticated, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    if (!acceptedTerms || !acceptedPrivacy || !acceptedUsagePolicy) {
      setError('You need to accept the required terms before entering Studio.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await signUp({
        displayName: displayName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        acceptedTerms,
        acceptedPrivacy,
        acceptedUsagePolicy,
        marketingOptIn,
      })
      navigate('/subscription?welcome=1', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your account right now.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true)
    setError(null)

    try {
      await signInWithGoogle('/subscription?welcome=1')
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : 'Google sign up could not start.')
      setGoogleBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#091018_0%,#0c1622_56%,#0a111a_100%)] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[6%] h-80 w-80 rounded-full bg-sky-400/8 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[10%] h-80 w-80 rounded-full bg-cyan-300/6 blur-[150px]" />
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
          <Link to="/login" className="text-sm text-zinc-300 transition hover:text-white">
            Log in
          </Link>
        </div>

        <div className="grid flex-1 gap-12 py-12 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.24em] text-zinc-600">Start free</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl md:leading-[1.02]">
              Enter Studio, then choose how far you want to go.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">
              Create your account first. After that, you will compare Free and Pro, then move into Studio with the plan that makes sense for you.
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

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-zinc-200">Name</div>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-zinc-200">Username</div>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/\s+/g, ''))}
                  placeholder="username"
                  className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                />
              </label>
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

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                />
              </label>

              <label className="block">
                <div className="mb-2 text-sm font-medium text-zinc-200">Confirm password</div>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Repeat password"
                  className="w-full border-b border-white/[0.08] bg-transparent px-0 py-3 text-base text-white outline-none transition placeholder:text-zinc-500 focus:border-white/20"
                />
              </label>
            </div>

            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                <span>
                  I accept the <Link to="/help#terms" className="text-white hover:text-zinc-200">Terms</Link>.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                <span>
                  I accept the <Link to="/help#privacy" className="text-white hover:text-zinc-200">Privacy Policy</Link>.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={acceptedUsagePolicy}
                  onChange={(event) => setAcceptedUsagePolicy(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                />
                <span>
                  I accept the <Link to="/help#usage-policy" className="text-white hover:text-zinc-200">Usage Policy</Link>.
                </span>
              </label>
              <label className="flex items-start gap-3 text-zinc-400">
                <input type="checkbox" checked={marketingOptIn} onChange={(event) => setMarketingOptIn(event.target.checked)} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent" />
                <span>Send me product updates, release notes, and occasional email news.</span>
              </label>
            </div>

            {error ? <div className="text-sm text-rose-200">{error}</div> : null}

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={
                  submitting ||
                  !displayName.trim() ||
                  !username.trim() ||
                  !email.trim() ||
                  password.length < 8 ||
                  passwordConfirmation.length < 8
                }
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Creating account...' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="text-sm text-zinc-400">
                Already have an account?{' '}
                <Link to="/login" className="text-white transition hover:text-zinc-200">
                  Log in
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
