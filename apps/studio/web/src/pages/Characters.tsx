import { useState, useEffect } from 'react'
import { Plus, Users, Sparkles } from 'lucide-react'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'
import { useToast } from '@/components/Toast'
import { getStudioAccessToken } from '@/lib/studioSession'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function apiFetchPersonas(path: string, init?: RequestInit) {
  const token = getStudioAccessToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${API_BASE}/v1${path}`, { ...init, headers })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

export default function CharactersPage() {
  useStudioAuth()
  const { addToast } = useToast()
  const [personas, setPersonas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  usePageMeta('Characters & Personas', 'Create and manage AI personas for consistent tone, style, and memory.')

  useEffect(() => {
    apiFetchPersonas('/personas')
      .then((res) => setPersonas(res.personas || []))
      .catch(() => setPersonas([]))
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    const name = window.prompt("New Character Name:")
    if (!name) return

    try {
      const payload = {
        name,
        description: "Custom user-generated AI Character Persona.",
        system_prompt: "You are " + name,
        avatar_url: `https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=500&q=80`,
      }
      const res = await apiFetchPersonas('/personas', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setPersonas((prev) => [res, ...prev])
      addToast('success', `Character "${name}" created successfully!`)
    } catch (e) {
      addToast('error', 'Something went wrong. Please try again.')
      console.error('Failed to create persona', e)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-8 px-4 py-8 md:px-6">
      
      {/* Header Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 uppercase tracking-wider">
          <Users className="h-4 w-4" />
          <span>AI Memory & Personas</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight" style={{ background: 'linear-gradient(135deg, #fff 0%, rgb(var(--primary-light)) 60%, rgb(var(--accent)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Characters
        </h1>
        <p className="text-zinc-400 max-w-2xl text-lg">
          Create and manage AI Personas to ensure consistent tone, style, and memory across your generations.
        </p>
      </section>

      {/* Navigation Tabs */}
      <section className="flex items-center gap-3">
        <button className="rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}>
          My Characters
        </button>
        <button className="rounded-full bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 ring-1 ring-white/10 transition-all hover:bg-white/[0.08]">
          Memory Vault
        </button>
      </section>

      {/* Grid Layout */}
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        
        {/* Create Card */}
        <div 
          onClick={handleCreate}
          className="group flex min-h-[420px] cursor-pointer flex-col justify-center items-center rounded-[32px] border border-dashed border-white/[0.15] bg-white/[0.02] p-6 transition-all duration-300 hover:border-[rgba(124,58,237,0.4)] hover:bg-[rgba(124,58,237,0.05)]"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full text-zinc-400 ring-1 ring-white/[0.1] transition-transform duration-300 group-hover:scale-110 group-hover:text-white" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(124,58,237,0.2))' }}>
            <Plus className="h-8 w-8" />
          </div>
          <div className="mt-6 text-center">
            <div className="text-xl font-semibold text-white">Create Character</div>
            <div className="mt-2 text-sm text-zinc-500">Design a new character with a unique style and personality.</div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={`skel-${i}`} className="min-h-[420px] rounded-[32px] border border-white/[0.06] bg-white/[0.02] animate-pulse" />
        ))}

        {/* Empty State */}
        {!loading && personas.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-[32px] border border-white/[0.06] bg-white/[0.02] py-20 px-6 text-center">
            <Users className="h-12 w-12 text-zinc-600 mb-4" />
            <div className="text-lg font-semibold text-zinc-300">No characters yet</div>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm">Create your first character to give your AI a unique voice, style, and personality.</p>
          </div>
        )}

        {/* Character Cards */}
        {!loading && personas.map((card) => (
          <div key={card.id} className="group relative flex min-h-[420px] cursor-pointer flex-col overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0e0f12] transition-all duration-300 hover:border-[rgba(124,58,237,0.3)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]">
            <div className="relative h-[200px] w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f12] to-transparent z-10" />
              <img
                src={card.avatar_url || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=500&q=80'}
                alt={card.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            </div>
            
            <div className="relative z-20 flex flex-1 flex-col p-6 pt-0">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[rgb(var(--primary))]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--primary))]">{card.is_default ? 'Built-in' : 'Custom'}</span>
              </div>
              <h3 className="text-2xl font-bold text-white">{card.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{card.description}</p>
            </div>
          </div>
        ))}
      </section>

    </div>
  )
}
