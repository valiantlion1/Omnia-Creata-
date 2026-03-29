import { useEffect } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import StudioShell from '@/components/StudioShell'
import AccountPage from '@/pages/Account'
import BillingPage from '@/pages/Billing'
import ChatPage from '@/pages/Chat'
import CreatePage from '@/pages/Create'
import DashboardPage from '@/pages/Dashboard'
import DocumentationPage from '@/pages/Documentation'
import ElementsPage from '@/pages/Elements'
import HomePage from '@/pages/Home'
import LoginPage from '@/pages/Login'
import MediaLibraryPage from '@/pages/MediaLibrary'
import OwnerLocalLabPage from '@/pages/OwnerLocalLab'
import ProjectPage from '@/pages/Project'
import SettingsPage from '@/pages/Settings'
import SharedPage from '@/pages/Shared'
import SignupPage from '@/pages/Signup'
import SplashPage from '@/pages/Splash'
import { useStudioAuth } from '@/lib/studioAuth'
import { setStudioPostAuthRedirect } from '@/lib/studioSession'

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
      <Route path="/owner/local-lab" element={<OwnerLocalLabPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/studio" element={<Navigate to="/explore" replace />} />
      <Route path="/gallery" element={<Navigate to="/library/images" replace />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="*" element={<Navigate to="/explore" replace />} />
    </Routes>
  )
}

function AppFrame() {
  const location = useLocation()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const nextPath = `${location.pathname}${location.search}`
  const isPublicShellRoute =
    location.pathname === '/explore' ||
    location.pathname === '/community' ||
    location.pathname === '/social'
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
    return <div className="min-h-screen bg-[rgb(var(--bg))]">{<PublicRoutes />}</div>
  }

  if (!isPublicCapable && !isPublicShellRoute && (isLoading || isAuthSyncing)) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b0b0d] text-sm text-zinc-500">Opening Studio...</div>
  }

  if (!shouldRenderWithShell) {
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />
  }

  return (
    <StudioShell>
      <ProtectedRoutes />
    </StudioShell>
  )
}

export default function App() {
  return (
    <Router>
      <AppFrame />
    </Router>
  )
}
