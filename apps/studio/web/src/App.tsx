import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'

import StudioShell from '@/components/StudioShell'
import BillingPage from '@/pages/Billing'
import ChatPage from '@/pages/Chat'
import AccountPage from '@/pages/Account'
import CreatePage from '@/pages/Create'
import DashboardPage from '@/pages/Dashboard'
import DocumentationPage from '@/pages/Documentation'
import ElementsPage from '@/pages/Elements'
import HistoryPage from '@/pages/History'
import HomePage from '@/pages/Home'
import LearnPage from '@/pages/Learn'
import LoginPage from '@/pages/Login'
import MediaLibraryPage from '@/pages/MediaLibrary'
import ProjectPage from '@/pages/Project'
import SettingsPage from '@/pages/Settings'
import SharedPage from '@/pages/Shared'
import SplashPage from '@/pages/Splash'
import SignupPage from '@/pages/Signup'

function AppFrame() {
  const location = useLocation()
  const isPublic =
    location.pathname === '/' ||
    location.pathname === '/landing' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname.startsWith('/shared/')

  const routes = (
    <Routes>
      <Route path="/" element={<SplashPage />} />
      <Route path="/landing" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/home" element={<Navigate to="/landing" replace />} />
      <Route path="/explore" element={<DashboardPage />} />
      <Route path="/dashboard" element={<Navigate to="/explore" replace />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/projects/:projectId" element={<ProjectPage />} />
      <Route path="/projects/:projectId/create" element={<CreatePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/library" element={<Navigate to="/library/images" replace />} />
      <Route path="/library/images" element={<MediaLibraryPage />} />
      <Route path="/library/collections" element={<MediaLibraryPage />} />
      <Route path="/library/likes" element={<MediaLibraryPage />} />
      <Route path="/library/trash" element={<MediaLibraryPage />} />
      <Route path="/community" element={<Navigate to="/explore" replace />} />
      <Route path="/social" element={<Navigate to="/explore" replace />} />
      <Route path="/media" element={<Navigate to="/library/images" replace />} />
      <Route path="/elements" element={<Navigate to="/elements/styles" replace />} />
      <Route path="/elements/styles" element={<ElementsPage />} />
      <Route path="/elements/characters" element={<Navigate to="/elements/styles" replace />} />
      <Route path="/subscription" element={<BillingPage />} />
      <Route path="/plan" element={<Navigate to="/subscription" replace />} />
      <Route path="/billing" element={<Navigate to="/subscription" replace />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/docs" element={<DocumentationPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/shared/:token" element={<SharedPage />} />
      <Route path="/studio" element={<Navigate to="/explore" replace />} />
      <Route path="/gallery" element={<Navigate to="/library" replace />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
    </Routes>
  )

  if (isPublic) {
    return <div className="min-h-screen bg-[rgb(var(--bg))]">{routes}</div>
  }

  return <StudioShell>{routes}</StudioShell>
}

export default function App() {
  return (
    <Router>
      <AppFrame />
    </Router>
  )
}
