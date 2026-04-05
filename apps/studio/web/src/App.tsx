import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LightboxProvider } from '@/components/Lightbox'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

import StudioShell from '@/components/StudioShell'

const posthogKey = (import.meta.env.VITE_POSTHOG_KEY || '').trim()
const shouldEnablePosthog = typeof window !== 'undefined' && Boolean(posthogKey) && posthogKey !== 'phc_placeholder'

if (shouldEnablePosthog) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    loaded: (posthog_instance) => {
      if (import.meta.env.DEV) {
        posthog_instance.opt_out_capturing()
      }
    },
  })
}
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'

const AccountPage = lazy(() => import('@/pages/Account'))
const BillingPage = lazy(() => import('@/pages/Billing'))
const ChatPage = lazy(() => import('@/pages/Chat'))
const CreatePage = lazy(() => import('@/pages/Create'))
const DashboardPage = lazy(() => import('@/pages/Dashboard'))
const DocumentationPage = lazy(() => import('@/pages/Documentation'))
const ElementsPage = lazy(() => import('@/pages/Elements'))
const HomePage = lazy(() => import('@/pages/Home'))
const LoginPage = lazy(() => import('@/pages/Login'))
const MediaLibraryPage = lazy(() => import('@/pages/MediaLibrary'))
const ProjectPage = lazy(() => import('@/pages/Project'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const SharedPage = lazy(() => import('@/pages/Shared'))
const SignupPage = lazy(() => import('@/pages/Signup'))
const SplashPage = lazy(() => import('@/pages/Splash'))

function RouteFallback({ withShell = false }: { withShell?: boolean }) {
  const classes = withShell
    ? 'flex h-[calc(100vh-3.5rem)] items-center justify-center text-sm text-zinc-500'
    : 'flex min-h-screen items-center justify-center bg-[rgb(var(--bg))] text-sm text-zinc-500'

  return <div className={classes}>Opening Studio...</div>
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/landing" element={<HomePage />} />
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
      <Route path="/community" element={<Navigate to="/explore" replace />} />
      <Route path="/social" element={<Navigate to="/explore" replace />} />
      <Route path="/dashboard" element={<Navigate to="/explore" replace />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/compose" element={<Navigate to="/create" replace />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="/projects/:projectId/create" element={<CreatePage />} />
      <Route path="/history" element={<Navigate to="/library/images" replace />} />
      <Route path="/library" element={<Navigate to="/library/images" replace />} />
      <Route path="/library/images" element={<MediaLibraryPage />} />
      <Route path="/library/collections" element={<MediaLibraryPage />} />
      <Route path="/library/likes" element={<MediaLibraryPage />} />
      <Route path="/library/trash" element={<MediaLibraryPage />} />
      <Route path="/media" element={<Navigate to="/library/images" replace />} />
      <Route path="/elements" element={<Navigate to="/elements/styles" replace />} />
      <Route path="/elements/styles" element={<ElementsPage />} />
      <Route path="/elements/characters" element={<Navigate to="/elements/styles" replace />} />
      <Route path="/help" element={<DocumentationPage />} />
      <Route path="/docs" element={<Navigate to="/help#getting-started" replace />} />
      <Route path="/faq" element={<Navigate to="/help#faq" replace />} />
      <Route path="/terms" element={<Navigate to="/help#terms" replace />} />
      <Route path="/privacy" element={<Navigate to="/help#privacy" replace />} />
      <Route path="/usage-policy" element={<Navigate to="/help#usage-policy" replace />} />
      <Route path="/learn" element={<Navigate to="/help" replace />} />
      <Route path="/subscription" element={<BillingPage />} />
      <Route path="/account" element={<AccountPage />} />
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
    location.pathname === '/subscription'
  const isAlwaysPublic =
    location.pathname === '/' ||
    location.pathname === '/landing' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname.startsWith('/shared/') ||
    location.pathname.startsWith('/u/')
  const isPublicCapable =
    location.pathname === '/help' ||
    location.pathname === '/docs' ||
    location.pathname === '/faq' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/usage-policy' ||
    location.pathname === '/learn'
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
      <PostHogProvider client={posthog}>
        <LightboxProvider>
          <Router>
            <AppFrame />
          </Router>
        </LightboxProvider>
      </PostHogProvider>
    </ErrorBoundary>
  )
}
