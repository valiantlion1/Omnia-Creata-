import { ArrowRight, AtSign, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthExperience } from '@/components/AuthExperience'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { useStudioAuth } from '@/lib/studioAuth'

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
const NEW_ACCOUNT_REDIRECT_PATH = '/create?welcome=1'

type LegalDocumentId = 'terms' | 'privacy' | 'acceptable-use'

const LEGAL_DOCUMENTS: Array<{
  id: LegalDocumentId
  label: string
  title: string
  to: string
}> = [
  { id: 'terms', label: 'Terms', title: 'Terms of Service', to: '/legal/terms' },
  { id: 'privacy', label: 'Privacy Policy', title: 'Privacy Policy', to: '/legal/privacy' },
  { id: 'acceptable-use', label: 'Acceptable Use', title: 'Acceptable Use Policy', to: '/legal/acceptable-use' },
]

function LegalDocumentDialog({
  selected,
  onSelect,
  onClose,
}: {
  selected: LegalDocumentId | null
  onSelect: (value: LegalDocumentId) => void
  onClose: () => void
}) {
  if (!selected) return null

  const activeDocument = LEGAL_DOCUMENTS.find((document) => document.id === selected) ?? LEGAL_DOCUMENTS[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/78 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close legal document"
      />
      <div className="relative z-10 flex h-[min(88vh,960px)] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[rgb(var(--primary-light))]/15 bg-[#0b0907] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/[0.08] bg-white/[0.035] px-5 py-4 backdrop-blur-md md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--primary-light))]/70">
                Legal documents
              </div>
              <div className="mt-1 text-xl font-semibold tracking-tight text-white">{activeDocument.title}</div>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-zinc-400">
                Review the policy here, or open the full page.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LEGAL_DOCUMENTS.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => onSelect(document.id)}
                className={`rounded-full px-3.5 py-2 text-[12px] font-medium transition ${
                  document.id === activeDocument.id
                    ? 'bg-[rgb(var(--primary-light))] text-[#120d06]'
                    : 'border border-white/[0.08] bg-white/[0.035] text-zinc-400 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                {document.label}
              </button>
            ))}
            <Link
              to={activeDocument.to}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/[0.08] bg-transparent px-3.5 py-2 text-[12px] font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              Open full page
            </Link>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-3 md:p-4">
          <iframe
            title={activeDocument.title}
            src={`${activeDocument.to}?embed=1`}
            className="h-full w-full rounded-[22px] border border-white/[0.08] bg-white"
          />
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { isAuthenticated, signInWithProvider, signUp } = useStudioAuth()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedLegalDocument, setSelectedLegalDocument] = useState<LegalDocumentId | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    navigate(NEW_ACCOUNT_REDIRECT_PATH, { replace: true })
  }, [isAuthenticated, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    if (!acceptedLegal) {
      setError('Please accept the Terms, Privacy Policy, and Acceptable Use Policy to continue.')
      return
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError('Complete the verification check to continue.')
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
        captchaToken: captchaToken ?? undefined,
        acceptedTerms: acceptedLegal,
        acceptedPrivacy: acceptedLegal,
        acceptedUsagePolicy: acceptedLegal,
        marketingOptIn,
      })
      navigate(NEW_ACCOUNT_REDIRECT_PATH, { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create your account right now.')
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
      await signInWithProvider(provider, NEW_ACCOUNT_REDIRECT_PATH)
    } catch (googleError) {
      setError(googleError instanceof Error ? googleError.message : `${provider} sign up could not start.`)
      setGoogleBusy(false)
    }
  }

  return (
    <div className="bg-[#060504] text-white">
      <AuthExperience
        title="Create account"
        subtitle="Start in Studio with email or Google."
        visualTitle="Begin with a blank frame."
        visualSubtitle="Your account opens Create first, then keeps plans, credits, and saved work together."
        switchTo="/login"
        switchLabel="Sign in"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <button
            type="button"
            onClick={() => handleProvider('google')}
            disabled={googleBusy || submitting}
            className="flex w-full items-center justify-center gap-3 rounded-[16px] border border-white/[0.1] bg-white/[0.045] px-4 py-3.5 text-sm font-semibold text-white transition hover:border-white/[0.18] hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="h-px flex-1 bg-white/[0.06]" />
            <span>or create with email</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Name</div>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="studio-signup-display-name"
                  name="displayName"
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
                />
              </div>
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Username</div>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="studio-signup-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.replace(/\s+/g, ''))}
                  placeholder="username"
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-medium text-zinc-200">Email</div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="studio-signup-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@domain.com"
                autoComplete="email"
                spellCheck={false}
                className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
              />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Password</div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="studio-signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="8+ chars"
                  autoComplete="new-password"
                  className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3 pr-12 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/40"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <div className="mb-2 text-sm font-medium text-zinc-200">Confirm password</div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="studio-signup-password-confirmation"
                  name="passwordConfirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Repeat"
                  autoComplete="new-password"
                  className="w-full rounded-[14px] border border-white/[0.08] bg-black/20 px-11 py-3 pr-12 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-[rgb(var(--primary-light))]/45 focus:ring-2 focus:ring-[rgb(var(--primary-light))]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/40"
                  title={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                  aria-label={showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="space-y-3 pt-1 text-sm text-zinc-300">
            <label className="flex items-start gap-3">
              <input
                id="studio-signup-accepted-legal"
                name="acceptedLegal"
                type="checkbox"
                checked={acceptedLegal}
                onChange={(event) => setAcceptedLegal(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
              />
              <span>
                I agree to the{' '}
                <button type="button" onClick={() => setSelectedLegalDocument('terms')} className="text-[rgb(var(--primary-light))] transition hover:text-white">
                  Terms
                </button>
                ,{' '}
                <button type="button" onClick={() => setSelectedLegalDocument('privacy')} className="text-[rgb(var(--primary-light))] transition hover:text-white">
                  Privacy Policy
                </button>
                , and{' '}
                <button type="button" onClick={() => setSelectedLegalDocument('acceptable-use')} className="text-[rgb(var(--primary-light))] transition hover:text-white">
                  Acceptable Use
                </button>
                .
              </span>
            </label>
            <label className="flex items-start gap-3 text-zinc-500">
              <input
                id="studio-signup-marketing-opt-in"
                name="marketingOptIn"
                type="checkbox"
                checked={marketingOptIn}
                onChange={(event) => setMarketingOptIn(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
              />
              <span>Send product updates.</span>
            </label>
          </div>

          {error ? <div className="rounded-[14px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          {TURNSTILE_SITE_KEY ? (
            <TurnstileWidget
              siteKey={TURNSTILE_SITE_KEY}
              action="signup"
              resetKey={captchaResetKey}
              onTokenChange={setCaptchaToken}
            />
          ) : null}

          <button
            type="submit"
            disabled={
              submitting ||
              !displayName.trim() ||
              !username.trim() ||
              !email.trim() ||
              password.length < 8 ||
              passwordConfirmation.length < 8 ||
              (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] bg-[rgb(var(--primary-light))] px-5 py-3.5 text-sm font-bold text-[#120d06] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary-light))]/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Create account'}
            <ArrowRight className="h-4 w-4" />
          </button>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[rgb(var(--primary-light))] transition hover:text-white">
              Sign in
            </Link>
          </p>
        </form>

      </AuthExperience>

      <LegalDocumentDialog
        selected={selectedLegalDocument}
        onSelect={setSelectedLegalDocument}
        onClose={() => setSelectedLegalDocument(null)}
      />
    </div>
  )
}
