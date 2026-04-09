import { useState, useEffect } from 'react'
import { Command, Terminal, Sparkles, X, LayoutTemplate } from 'lucide-react'

type Shortcut = {
  keys: string[]
  description: string
  icon: React.ElementType
}

const shortcuts: { category: string; items: Shortcut[] }[] = [
  {
    category: 'Global',
    items: [
      { keys: ['Cmd', 'K'], description: 'Open Command Palette', icon: Command },
      { keys: ['Cmd', '/'], description: 'Show Keyboard Shortcuts', icon: LayoutTemplate },
      { keys: ['Esc'], description: 'Close Modals / Cancel', icon: X },
    ],
  },
  {
    category: 'Studio Engine',
    items: [
      { keys: ['Cmd', 'Enter'], description: 'Fast Render / Submit Prompt', icon: Sparkles },
      { keys: ['Cmd', 'Shift', 'C'], description: 'Clear Output Canvas', icon: Terminal },
    ],
  },
]

export function ShortcutModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-[500px] overflow-hidden rounded-[24px] glass-card shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] bg-[#0c0d12]/95 backdrop-blur-3xl animate-in zoom-in-95 duration-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6 border-b border-white/[0.08] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
            <p className="mt-1 text-sm text-zinc-400">Navigate Studio without touching the mouse.</p>
          </div>
          <button 
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((shortcut, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-4 rounded-xl px-3 py-2 transition hover:bg-white/[0.03]">
                    <div className="flex items-center gap-3">
                      <shortcut.icon className="h-4 w-4 text-zinc-500" />
                      <span className="text-[14px] text-zinc-300">{shortcut.description}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {shortcut.keys.map((key) => (
                        <kbd key={key} className="flex h-6 min-w-[24px] items-center justify-center rounded bg-white/[0.08] px-1.5 text-[11px] font-mono font-medium text-zinc-300 ring-1 ring-white/[0.08]">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
