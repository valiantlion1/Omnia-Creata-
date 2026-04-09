import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sparkles, MessageCircle, Library, LayoutDashboard, Settings as SettingsIcon, BookOpen, X } from 'lucide-react'

type CommandInfo = {
  id: string
  label: string
  icon: React.ElementType
  action: () => void
  category: 'Navigation' | 'Actions' | 'Help'
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  // Toggle palette via Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      // Delay slightly so focus isn't eaten by the triggering key combination release
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Defines available commands
  const commands: CommandInfo[] = [
    {
      id: 'nav-explore',
      label: 'Explore Gallery',
      icon: LayoutDashboard,
      category: 'Navigation',
      action: () => navigate('/explore'),
    },
    {
      id: 'nav-create',
      label: 'Create New Image',
      icon: Sparkles,
      category: 'Actions',
      action: () => navigate('/create'),
    },
    {
      id: 'nav-chat',
      label: 'Open AI Assistant',
      icon: MessageCircle,
      category: 'Actions',
      action: () => navigate('/chat'),
    },
    {
      id: 'nav-library',
      label: 'View Media Library',
      icon: Library,
      category: 'Navigation',
      action: () => navigate('/library'),
    },
    {
      id: 'nav-settings',
      label: 'Account & Settings',
      icon: SettingsIcon,
      category: 'Navigation',
      action: () => navigate('/settings'),
    },
    {
      id: 'nav-docs',
      label: 'Documentation & Help',
      icon: BookOpen,
      category: 'Help',
      action: () => navigate('/help'),
    },
  ]

  // Filter commands by query
  const filteredCommands = query
    ? commands.filter((cmd) => cmd.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  // Reset selected index if results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Key navigation within palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % filteredCommands.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
        setOpen(false)
      }
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 pt-[15vh] px-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setOpen(false)}>
      <div 
        className="w-full max-w-[640px] overflow-hidden rounded-[24px] glass-card shadow-[0_36px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.05] bg-[#0c0d12]/95 backdrop-blur-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
          <Search className="h-5 w-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-[15px] text-white placeholder-zinc-500 outline-none"
            placeholder="Search commands, navigate apps... (Type to search)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="flex h-5 w-5 items-center justify-center rounded bg-white/[0.1] text-[10px] font-semibold text-zinc-400 border border-white/[0.05]"
            onClick={() => setOpen(false)}
          >
            ESC
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredCommands.map((cmd, index) => {
                const isSelected = index === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/[0.04]'
                    }`}
                    onClick={() => {
                      cmd.action()
                      setOpen(false)
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <cmd.icon className={`h-4 w-4 ${isSelected ? 'text-[rgb(var(--primary-light))]' : 'text-zinc-500'}`} />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-[14px] font-medium">{cmd.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">{cmd.category}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
