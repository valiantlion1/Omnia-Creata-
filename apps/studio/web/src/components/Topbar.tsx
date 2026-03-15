import { Link, useLocation } from 'react-router-dom'

import ThemeToggle from '@/components/ThemeToggle'
import { useStudioAuth } from '@/lib/studioAuth'

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/media', label: 'Media' },
  { to: '/billing', label: 'Billing' },
  { to: '/settings', label: 'Settings' },
]

export default function Topbar() {
  const location = useLocation()
  const { auth, isAuthenticated, signInDemo, signOut } = useStudioAuth()

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(7,10,18,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/omnia-crest.png" alt="Omnia Creata" className="h-8 w-8 object-contain" />
            <div>
              <div className="text-sm font-semibold tracking-[0.2em] text-amber-200">OMNIACREATA</div>
              <div className="text-xs uppercase tracking-[0.25em] text-zinc-400">Studio</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {nav.map((item) => {
              const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-4 py-2 text-sm transition ${active ? 'bg-white text-black' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 md:block">
            {auth?.plan.label ?? 'Guest'} • {auth?.credits.remaining ?? 0} credits
          </div>
          {isAuthenticated ? (
            <button onClick={signOut} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/[0.06]">
              Sign out
            </button>
          ) : (
            <button onClick={() => signInDemo('free', 'Omnia Creator')} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90">
              Start free
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
