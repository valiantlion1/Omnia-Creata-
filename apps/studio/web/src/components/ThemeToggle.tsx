import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import type { ThemeKey } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

const THEMES: { id: ThemeKey; label: string; colors: [string, string]; emoji: string }[] = [
  { id: 'midnight', label: 'Midnight', colors: ['#7C3AED', '#6366F1'], emoji: '🌙' },
  { id: 'cyberpunk', label: 'Cyberpunk', colors: ['#00FFFF', '#FF0080'], emoji: '🤖' },
  { id: 'sunset', label: 'Sunset', colors: ['#F97316', '#EF4444'], emoji: '🌅' },
  { id: 'ocean', label: 'Ocean', colors: ['#06B6D4', '#3B82F6'], emoji: '🌊' },
  { id: 'emerald', label: 'Emerald', colors: ['#10B981', '#22C55E'], emoji: '🍀' },
  { id: 'royal', label: 'Royal', colors: ['#A855F7', '#EC4899'], emoji: '👑' },
  { id: 'aurora', label: 'Aurora', colors: ['#22D3EE', '#34D399'], emoji: '🌌' },
  { id: 'dusk', label: 'Dusk', colors: ['#D9A72D', '#FACC15'], emoji: '✨' },
];

const ThemeToggle: React.FC = () => {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = THEMES.find(t => t.id === state.theme) ?? THEMES[0];

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] 
                   hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-200 group"
        title={`Theme: ${current.label}`}
      >
        <div
          className="w-4 h-4 rounded-full shadow-sm"
          style={{ background: `linear-gradient(135deg, ${current.colors[0]}, ${current.colors[1]})` }}
        />
        <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors hidden sm:inline">
          {current.label}
        </span>
        <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 p-3 rounded-xl
                       bg-[rgb(var(--bg-secondary))]/95 backdrop-blur-xl border border-white/[0.08]
                       shadow-2xl shadow-black/40 min-w-[200px]"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1">
              Choose Theme
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => {
                    dispatch({ type: 'setTheme', theme: theme.id });
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium
                             transition-all duration-200 text-left
                             ${state.theme === theme.id
                      ? 'bg-white/[0.08] border border-white/[0.15] text-white shadow-sm'
                      : 'bg-transparent border border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                    }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }}
                  />
                  <span>{theme.emoji} {theme.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThemeToggle;
