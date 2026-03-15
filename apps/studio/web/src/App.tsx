import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import ProjectPage from '@/pages/Project'
import CreateCanvasPage from '@/pages/CreateCanvas'
import HistoryPage from '@/pages/History'
import MediaLibraryPage from '@/pages/MediaLibrary'
import BillingPage from '@/pages/Billing'
import SettingsPage from '@/pages/Settings'
import SharedPage from '@/pages/Shared'
import Topbar from '@/components/Topbar'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[rgb(var(--bg))]">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[8%] top-[10%] h-[320px] w-[320px] rounded-full bg-cyan-300/10 blur-[120px]" />
          <div className="absolute bottom-[8%] right-[10%] h-[420px] w-[420px] rounded-full bg-amber-300/10 blur-[150px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)]" />
        </div>
        <div className="relative z-10">
          <Topbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects/:projectId" element={<ProjectPage />} />
            <Route path="/projects/:projectId/create" element={<CreateCanvasPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/media" element={<MediaLibraryPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/shared/:token" element={<SharedPage />} />
            <Route path="/studio" element={<Navigate to="/dashboard" replace />} />
            <Route path="/gallery" element={<Navigate to="/media" replace />} />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
            <Route path="/explore" element={<Navigate to="/billing" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}
