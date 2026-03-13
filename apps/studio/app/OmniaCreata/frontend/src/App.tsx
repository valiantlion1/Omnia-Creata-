import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import SplashScreen from '@/components/SplashScreen'
import Landing from '@/pages/Landing'
import Home from '@/pages/Home'
import Studio from '@/pages/Studio'
import Gallery from '@/pages/Gallery'
import Explore from '@/pages/Models'
import Profile from '@/pages/Profile'
import Topbar from '@/components/Topbar'
import { AnimatePresence, motion } from 'framer-motion'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [inApp, setInApp] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2400)
    return () => clearTimeout(t)
  }, [])

  if (showSplash) return <SplashScreen />

  if (!inApp) {
    return (
      <I18nextProvider i18n={i18n}>
        <Router>
          <Routes>
            <Route path="/" element={<Landing onEnter={() => setInApp(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </I18nextProvider>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <div className="min-h-screen bg-[rgb(var(--bg))]">
          <Topbar />
          <AnimatedRoutes />
        </div>
      </Router>
    </I18nextProvider>
  )
}
