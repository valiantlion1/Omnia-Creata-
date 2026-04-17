import { Suspense, lazy, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LightboxProvider } from '@/components/Lightbox'

import StudioShell from '@/components/StudioShell'
import { ToastProvider } from '@/components/Toast'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'

const posthogKey = (import.meta.env.VITE_POSTHOG_KEY || '').trim()
const isPostHogConfigured = typeof window !== 'undefined' && Boolean(posthogKey) && posthogKey !== 'phc_placeholder'
const COOKIE_PREFERENCES_KEY = 'oc-studio-cookie-preferences-v1'
let posthogBootstrapPromise: Promise<{
  Provider: ComponentType<{ client: unknown; children: ReactNode }>
  client: unknown
}> | null = null

type CookiePreferences = {
  analytics: boolean
  decided_at: string
  version: 1
}

const AccountPage = lazy(() => import('@/pages/Account'))
const BillingPage = lazy(() => import('@/pages/Billing'))
const ChatPage = lazy(() => import('@/pages/Chat'))
const CreatePage = lazy(() => import('@/pages/Create'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const DocumentationPage = lazy(() => import('@/pages/Documentation'))
const ElementsPage = lazy(() => import('@/pages/Elements'))
const LandingPage = lazy(() => import('@/pages/Landing'))
const LoginPage = lazy(() => import('@/pages/Login'))
const MediaLibraryPage = lazy(() => import('@/pages/MediaLibrary'))
const ProjectPage = lazy(() => import('@/pages/Project'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const SharedPage = lazy(() => import('@/pages/Shared'))
const SignupPage = lazy(() => import('@/pages/Signup'))
const CommunityPage = lazy(() => import('@/pages/Community'))
const AnalyticsPage = lazy(() => import('@/pages/Analytics'))
const CommandPalette = lazy(() => import('@/components/CommandPalette').then((module) => ({ default: module.CommandPalette })))
const ShortcutModal = lazy(() => import('@/components/ShortcutModal').then((module) => ({ default: module.ShortcutModal })))

function ShellFriendlyDocumentationPage() {
  return (
    <div className="[&>header]:hidden [&>div>footer]:hidden">
      <DocumentationPage />
    </div>
  )
}

function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COOKIE_PREFERENCES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>
    if (typeof parsed.analytics !== 'boolean') return null
    return {
      analytics: parsed.analytics,
      decided_at: typeof parsed.decided_at === 'string' ? parsed.decided_at : new Date().toISOString(),
      version: 1,
    }
  } catch {
    return null
  }
}

function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences))
}

function CookieConsentBanner({ onDecision }: { onDecision: (analytics: boolean) => void }) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0c0c10]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Studio analytics preference</p>
            <p className="max-w-2xl text-sm text-zinc-300">
              Essential storage keeps Studio signed in. Optional analytics only starts if you allow it, so we can measure aggregate product quality without forcing tracking by default.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDecision(false)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={() => onDecision(true)}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Allow analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function loadPostHog() {
  if (!posthogBootstrapPromise) {
    posthogBootstrapPromise = Promise.all([import('posthog-js'), import('posthog-js/react')]).then(([posthogModule, reactModule]) => {
      const client = posthogModule.default
      client.init(posthogKey, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthogInstance) => {
          if (import.meta.env.DEV) {
            posthogInstance.opt_out_capturing()
          }
        },
      })

      return {
        Provider: reactModule.PostHogProvider as ComponentType<{ client: unknown; children: ReactNode }>,
        client,
      }
    })
  }

  return posthogBootstrapPromise
}

function PostHogBoundary({ children }: { children: ReactNode }) {
  const [providerState, setProviderState] = useState<{
    Provider: ComponentType<{ client: unknown; children: ReactNode }>
    client: unknown
  } | null>(null)
  const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences | null>(() => readCookiePreferences())
  const analyticsAllowed = Boolean(cookiePreferences?.analytics)

  useEffect(() => {
    if (!isPostHogConfigured || !analyticsAllowed) return undefined

    let cancelled = false
    void loadPostHog().then((state) => {
      if (!cancelled) {
        setProviderState(state)
      }
    })

    return () => {
      cancelled = true
    }
  }, [analyticsAllowed])

  const handleConsentDecision = (analytics: boolean) => {
    const nextPreferences: CookiePreferences = {
      analytics,
      decided_at: new Date().toISOString(),
      version: 1,
    }
    writeCookiePreferences(nextPreferences)
    setCookiePreferences(nextPreferences)
  }

  const renderedChildren = !isPostHogConfigured || !analyticsAllowed || !providerState
    ? children
    : (() => {
        const { Provider, client } = providerState
        return <Provider client={client}>{children}</Provider>
      })()

  return (
    <>
      {renderedChildren}
      {isPostHogConfigured && cookiePreferences === null ? <CookieConsentBanner onDecision={handleConsentDecision} /> : null}
    </>
  )
}

function RouteFallback({ withShell = false }: { withShell?: boolean }) {
  const classes = withShell
    ? 'flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-zinc-500'
    : 'flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] text-sm text-zinc-500'

  return <div className={classes}>Opening Studio...</div>
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/help" element={<DocumentationPage />} />
      <Route path="/docs" element={<Navigate to="/help#getting-started" replace />} />
      <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
      <Route path="/terms" element={<Navigate to="/help#terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/help#privacy" replace />} />
      <Route path="/usage-policy" element={<Navigate to="/help#usage-policy" replace />} />
      <Route path="/learn" element={<Navigate to="/help" replace />} />
      <Route path="/u/:username" element={<AccountPage />} />
      <Route path="/home" element={<Navigate to="/landing" replace />} />
      <Route path="/shared/:token" element={<SharedPage />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  )
}

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/explore" element={<DashboardPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/social" element={<Navigate to="/explore" replace />} />
      <Route path="/dashboard" element={<AnalyticsPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/compose" element={<Navigate to="/create" replace />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="/projects/:projectId/create" element={<CreatePage />} />
      <Route path="/history" element={<Navigate to="/library/images" replace />} />
      <Route path="/library" element={<Navigate to="/library/images" replace />} />
      <Route path="/library/images" element={<MediaLibraryPage />} />
      <Route path="/library/projects" element={<MediaLibraryPage />} />
      <Route path="/library/collections" element={<Navigate to="/library/projects" replace />} />
      <Route path="/library/likes" element={<MediaLibraryPage />} />
      <Route path="/library/trash" element={<MediaLibraryPage />} />
      <Route path="/media" element={<Navigate to="/library/images" replace />} />
      <Route path="/elements" element={<Navigate to="/elements/styles" replace />} />
      <Route path="/elements/styles" element={<ElementsPage />} />
      <Route path="/help" element={<ShellFriendlyDocumentationPage />} />
      <Route path="/docs" element={<Navigate to="/help#getting-started" replace />} />
      <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
      <Route path="/terms" element={<Navigate to="/help#terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/help#privacy" replace />} />
      <Route path="/usage-policy" element={<Navigate to="/help#usage-policy" replace />} />
      <Route path="/learn" element={<Navigate to="/help" replace />} />
      <Route path="/subscription" element={<BillingPage />} />
      <Route path="/billing" element={<Navigate to="/subscription" replace />} />
      <Route path="/plan" element={<Navigate to="/subscription" replace />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/u/:username" element={<AccountPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/studio" element={<Navigate to="/explore" replace />} />
      <Route path="/gallery" element={<Navigate to="/library/images" replace />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  )
}

import { useStudioUiPrefs } from '@/lib/studioUi'

function AppFrame() {
  useStudioUiPrefs() // Initialize theme and preferences globally
  const location = useLocation()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const nextPath = `${location.pathname}${location.search}`
  const isPublicShellRoute =
    location.pathname === '/explore' ||
    location.pathname === '/community' ||
    location.pathname === '/social' ||
    location.pathname === '/subscription' ||
    location.pathname === '/billing' ||
    location.pathname === '/plan' ||
    location.pathname === '/help' ||
    location.pathname === '/docs' ||
    location.pathname === '/faq' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/usage-policy' ||
    location.pathname === '/learn' ||
    location.pathname.startsWith('/elements/')
  const isAlwaysPublic =
    location.pathname === '/' ||
    location.pathname === '/landing' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname.startsWith('/shared/')
  const isPublicCapable =
    location.pathname === '/help' ||
    location.pathname === '/docs' ||
    location.pathname === '/faq' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/usage-policy' ||
    location.pathname === '/learn' ||
    location.pathname.startsWith('/u/')
  const canRenderWithShell = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const shouldRenderWithShell = isPublicShellRoute || canRenderWithShell

  useEffect(() => {
    if (isAlwaysPublic || isPublicCapable || isPublicShellRoute) return
    if (isLoading || isAuthSyncing) return
    if (isAuthenticated && !auth?.guest) return
    setStudioPostAuthRedirect(nextPath)
  }, [auth?.guest, isAlwaysPublic, isAuthSyncing, isAuthenticated, isLoading, isPublicCapable, isPublicShellRoute, nextPath])

  if (isAlwaysPublic || (isPublicCapable && !shouldRenderWithShell)) {
    return (
      <div className="min-h-screen bg-[rgb(var(--bg))]">
        <Suspense fallback={<RouteFallback />}>
          <PublicRoutes />
        </Suspense>
      </div>
    )
  }

  if (!isPublicCapable && !isPublicShellRoute && (isLoading || isAuthSyncing)) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] text-sm text-zinc-500">Opening Studio...</div>
  }

  if (!shouldRenderWithShell) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />
  }

  return (
    <StudioShell>
      <Suspense fallback={<RouteFallback withShell />}>
        <ProtectedRoutes />
      </Suspense>
    </StudioShell>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <PostHogBoundary>
        <ToastProvider>
          <LightboxProvider>
            <Router>
              <Suspense fallback={null}>
                <ShortcutModal />
                <CommandPalette />
              </Suspense>
              <AppFrame />
            </Router>
          </LightboxProvider>
        </ToastProvider>
      </PostHogBoundary>
    </ErrorBoundary>
  )
}
