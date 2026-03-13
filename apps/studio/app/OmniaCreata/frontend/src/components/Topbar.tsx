import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { useStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';

const mainCategories = [
  { key: 'home', labelKey: 'navigation.production', icon: 'dashboard', path: '/' },
  { key: 'studio', labelKey: 'navigation.promptStudio', icon: 'promptStudio', path: '/studio' },
  { key: 'explore', labelKey: 'navigation.explore', icon: 'lora', path: '/explore' },
  { key: 'gallery', labelKey: 'navigation.gallery', icon: 'gallery', path: '/gallery' },
] as const;

const Icon = ({ name }: { name: string }) => {
  const common = 'h-4 w-4';
  const pulse = 'transition-all duration-300 group-hover:scale-110 drop-shadow-sm';
  const glow = 'group-hover:drop-shadow-[0_0_6px_rgba(var(--accent),0.5)]';
  switch (name) {
    case 'dashboard':
      return (<svg className={`${common} ${pulse} ${glow}`} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g1" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor={`rgb(var(--goldB))`} /><stop offset="100%" stopColor={`rgb(var(--accent))`} /></linearGradient></defs><path d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z" stroke="url(#g1)" strokeWidth="1.5" fill="url(#g1)" fillOpacity="0.1" /></svg>);
    case 'lora':
      return (<svg className={`${common} ${pulse} ${glow}`} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g4" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor={`rgb(var(--accent))`} /><stop offset="100%" stopColor={`rgb(var(--goldB))`} /></linearGradient></defs><circle cx="12" cy="12" r="3" stroke="url(#g4)" strokeWidth="1.5" fill="url(#g4)" fillOpacity="0.1" /><path d="M5 12a7 7 0 0 1 14 0M3 12a9 9 0 0 1 18 0" stroke="url(#g4)" strokeWidth="1.5" /></svg>);
    case 'gallery':
      return (<svg className={`${common} ${pulse} ${glow}`} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g6" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor={`rgb(var(--accent))`} /><stop offset="100%" stopColor={`rgb(var(--goldB))`} /></linearGradient></defs><rect x="4" y="4" width="16" height="16" rx="2" stroke="url(#g6)" strokeWidth="1.5" fill="url(#g6)" fillOpacity="0.1" /><path d="m8 15 3-3 3 3 2-2 2 2" stroke="url(#g6)" strokeWidth="1.5" /></svg>);
    case 'promptStudio':
      return (<svg className={`${common} ${pulse} ${glow}`} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g7" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor={`rgb(var(--accent))`} /><stop offset="100%" stopColor={`rgb(var(--goldB))`} /></linearGradient></defs><path d="M4 5h16v10H4z" stroke="url(#g7)" strokeWidth="1.5" fill="url(#g7)" fillOpacity="0.1" /><path d="M8 19h8" stroke="url(#g7)" strokeWidth="1.5" /></svg>);
    case 'settings':
      return (<svg className={`${common} ${pulse} ${glow}`} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="g8" x1="0" y1="0" x2="24" y2="24"><stop offset="0%" stopColor={`rgb(var(--accent))`} /><stop offset="100%" stopColor={`rgb(var(--goldB))`} /></linearGradient></defs><path d="m12 3 2 3 4 1-1 4 1 4-4 1-2 3-2-3-4-1 1-4-1-4 4-1 2-3Z" stroke="url(#g8)" strokeWidth="1.5" fill="url(#g8)" fillOpacity="0.1" /><circle cx="12" cy="12" r="2" fill={`rgb(var(--accent))`} /></svg>);
    default:
      return null;
  }
};

const Topbar: React.FC = () => {
  const { state, dispatch } = useStore();
  const { t } = useTranslation();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getActiveCategoryFromPath = (pathname: string) => {
    if (pathname === '/' || pathname === '/home') return 'home';
    if (pathname.startsWith('/studio')) return 'studio';
    if (pathname.startsWith('/explore')) return 'explore';
    if (pathname.startsWith('/gallery')) return 'gallery';
    return 'home';
  };

  const activeCategory = getActiveCategoryFromPath(location.pathname);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/5"
    >
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" aria-label={t('common.appTitle')}>
          <img src="/omnia-crest.png" alt="Omnia Creata" className="h-7 w-7 object-contain transition-transform group-hover:scale-110" />
          <span className="hidden sm:inline text-base font-semibold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            {t('common.appTitle')}
          </span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {mainCategories.map((cat) => (
            <Link
              key={cat.key}
              to={cat.path}
              className={`group relative px-3.5 py-2 rounded-xl text-sm transition-all duration-300 inline-flex items-center gap-2 border overflow-hidden
                ${activeCategory === cat.key
                  ? 'bg-white/[0.08] border-[rgba(var(--accent),0.4)] shadow-[0_0_12px_rgba(var(--accent),0.15)]'
                  : 'border-transparent hover:bg-white/[0.05] hover:border-white/10'
                }`}
            >
              {/* Shimmer on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
              <Icon name={cat.icon} />
              <span className="hidden lg:inline relative z-10 text-gray-300 group-hover:text-white transition-colors">{t(cat.labelKey)}</span>
              {activeCategory === cat.key && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-gradient-to-r from-[rgb(var(--accent))] to-[rgb(var(--goldB))] rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* Right Controls: Theme + Lang + Profile */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <button
            className="px-2.5 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 hover:text-white transition-all"
            onClick={() => dispatch({ type: 'setLang', lang: state.lang === 'tr' ? 'en' : 'tr' })}
          >
            {state.lang.toUpperCase()}
          </button>

          {/* Profile / Settings Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-[rgba(var(--accent),0.3)] to-[rgba(var(--goldB),0.3)] border border-white/10 flex items-center justify-center text-sm font-bold text-white hover:scale-105 transition-transform"
            >
              U
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {/* Profile Header */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(var(--accent),0.4)] to-[rgba(var(--goldB),0.4)] flex items-center justify-center text-lg font-bold">
                        U
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">User</p>
                        <p className="text-[11px] text-gray-500">Local Mode</p>
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="p-3 space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">Settings</div>

                    {/* Compute Mode */}
                    <div className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">Compute Mode</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => dispatch({ type: 'setComputeMode', mode: 'local' })}
                            className={`px-2 py-0.5 text-[10px] rounded transition-all ${state.computeMode === 'local' ? 'bg-[rgba(var(--accent),0.2)] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                          >Local</button>
                          <button
                            onClick={() => dispatch({ type: 'setComputeMode', mode: 'cloud' })}
                            className={`px-2 py-0.5 text-[10px] rounded transition-all ${state.computeMode === 'cloud' ? 'bg-[rgba(var(--accent),0.2)] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                          >Cloud</button>
                        </div>
                      </div>
                    </div>

                    {/* Language */}
                    <div className="px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300">Language</span>
                        <button
                          onClick={() => dispatch({ type: 'setLang', lang: state.lang === 'tr' ? 'en' : 'tr' })}
                          className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-gray-300 hover:bg-white/10 transition"
                        >
                          {state.lang === 'tr' ? '🇹🇷 Türkçe' : '🇺🇸 English'}
                        </button>
                      </div>
                    </div>

                    {/* Theme is already in the top bar */}

                    <div className="border-t border-white/5 mt-2 pt-2">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Icon name="settings" />
                        <span>All Settings</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden border-t border-white/5 bg-black/80 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-2">
              {mainCategories.map((cat) => (
                <Link
                  key={cat.key}
                  to={cat.path}
                  className={`w-full px-4 py-3 rounded-xl text-sm flex items-center gap-3 border transition-all
                    ${activeCategory === cat.key
                      ? 'bg-white/[0.08] border-[rgba(var(--accent),0.4)]'
                      : 'border-transparent hover:bg-white/5'
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon name={cat.icon} />
                  <span className="text-gray-200">{t(cat.labelKey)}</span>
                  {activeCategory === cat.key && (
                    <div className="ml-auto w-2 h-2 bg-[rgb(var(--accent))] rounded-full animate-pulse" />
                  )}
                </Link>
              ))}

              {/* Mobile Settings */}
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs text-gray-400">Theme</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs text-gray-400">Language</span>
                  <button
                    className="px-3 py-1.5 text-xs bg-white/5 rounded-lg text-gray-300"
                    onClick={() => dispatch({ type: 'setLang', lang: state.lang === 'tr' ? 'en' : 'tr' })}
                  >
                    {state.lang === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Topbar;