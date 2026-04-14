import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid2X2, List, Settings } from 'lucide-react'

import { EditTextDialog, EmptyState, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type ProfilePayload, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'
import { usePageMeta } from '@/lib/usePageMeta'

type ViewMode = 'grid' | 'list'

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${value === 'grid' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        style={value === 'grid' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        title="Grid view"
      >
        <Grid2X2 className="h-3 w-3" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${value === 'list' ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
        style={value === 'list' ? { background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' } : undefined}
        title="List view"
      >
        <List className="h-3 w-3" />
      </button>
    </div>
  )
}

function PostGrid({ posts, ownProfile, view }: { posts: PublicPost[]; ownProfile: boolean; view: ViewMode }) {
  if (!posts.length) {
    return (
      <EmptyState
        title={ownProfile ? 'No profile posts yet' : 'No public posts yet'}
        description={
          ownProfile
            ? 'Your creations will appear here once you start generating images.'
            : 'This creator hasn\'t published any images yet.'
        }
      />
    )
  }

  if (view === 'list') {
    return (
      <div className="divide-y divide-white/[0.04]">
        {posts.map((post) => (
          <article key={post.id} className="group grid gap-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center transition-colors hover:bg-white/[0.01] px-2 rounded-xl">
            <div className="overflow-hidden rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05] shadow-lg shadow-black/20 relative">
              {post.cover_asset ? (
                <img 
                  src={post.cover_asset.thumbnail_url ?? post.cover_asset.url} 
                  alt={post.title} 
                  className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                />
              ) : (
                <div className="aspect-[4/5] w-full bg-white/[0.04]" />
              )}
              {/* Optional subtle overlay on hover */}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
            </div>
            <div className="min-w-0 pr-4">
              <div className="truncate text-base font-medium text-white/90 group-hover:text-white transition-colors">{post.title}</div>
              <div className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-400 group-hover:text-zinc-300 transition-colors">{post.prompt}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {ownProfile ? (
                <StatusPill tone={post.visibility === 'public' ? 'brand' : 'neutral'}>{post.visibility}</StatusPill>
              ) : null}
              <StatusPill tone="neutral">{post.like_count} likes</StatusPill>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pt-1">
      {posts.map((post) => (
        <article key={post.id} className="group relative flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-[20px] bg-white/[0.02] ring-1 ring-white/[0.08] shadow-xl shadow-black/40 transition-all duration-500 group-hover:shadow-black/60 group-hover:ring-[rgba(124,58,237,0.18)]">
            {post.cover_asset ? (
              <img 
                src={post.cover_asset.thumbnail_url ?? post.cover_asset.url} 
                alt={post.title} 
                className="aspect-[4/5] w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.03]" 
              />
            ) : (
              <div className="aspect-[4/5] w-full bg-zinc-900" />
            )}
            
            {/* Subtle gradient overlay at bottom for labels */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 transition-all duration-300 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100">
              <div className="flex items-center gap-2">
                <StatusPill tone="neutral" className="bg-black/60 backdrop-blur-md">{post.like_count} likes</StatusPill>
              </div>
              {ownProfile && (
                <StatusPill tone={post.visibility === 'public' ? 'brand' : 'neutral'} className="bg-black/60 backdrop-blur-md">
                  {post.visibility.charAt(0).toUpperCase()}
                </StatusPill>
              )}
            </div>
          </div>
          
          <div className="px-1">
            <h3 className="truncate text-sm font-medium text-white/90 group-hover:text-white transition-colors">{post.title}</h3>
            <p className="mt-0.5 truncate text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">{post.prompt}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function AccountPage() {
  usePageMeta('Profile', 'Your Omnia Creata Studio profile and public creations.')
  const { username } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [view, setView] = useState<ViewMode>('grid')
  const [editingField, setEditingField] = useState<'name' | 'bio' | null>(null)
  const queryClient = useQueryClient()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const ownAccount = !username
  const optimisticPayload = useMemo<ProfilePayload | undefined>(() => {
    if (!ownAccount || !auth || !auth.identity) return undefined

    const allowance = Math.max(auth.plan?.monthly_credits || auth.credits?.remaining || 0, 0)
    const creditsRemaining = Math.max(auth.credits?.remaining || 0, 0)
    const consumedPercent = allowance ? Math.min(100, Math.max(0, Math.round(((allowance - creditsRemaining) / allowance) * 100))) : 0

    return {
      profile: {
        display_name: auth.identity.display_name ?? 'Guest',
        username: auth.identity.username ?? 'profile',
        avatar_url: auth.identity.avatar_url ?? null,
        bio: auth.identity.bio ?? '',
        plan: auth.identity.plan ?? 'free',
        default_visibility: auth.identity.default_visibility ?? 'public',
        usage_summary: {
          plan_label: auth.plan?.label ?? 'Free',
          credits_remaining: creditsRemaining,
          allowance,
          reset_at: null,
          progress_percent: consumedPercent,
        },
        public_post_count: 0,
      },
      posts: [],
      own_profile: true,
      can_edit: true,
    }
  }, [auth, ownAccount])

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { display_name?: string; bio?: string; default_visibility?: 'public' | 'private' }) =>
      studioApi.updateMyProfile(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['studio-auth'] }),
        queryClient.invalidateQueries({ queryKey: ['settings-bootstrap'] }),
      ])
    },
  })

  const profileQuery = useQuery({
    queryKey: ['profile', username ?? 'me'],
    queryFn: () => (username ? studioApi.getProfile(username) : studioApi.getMyProfile()),
    enabled: username ? true : canLoadPrivate,
    placeholderData: optimisticPayload,
  })

  const payload = (profileQuery.data as ProfilePayload | undefined) ?? optimisticPayload
  const usage = payload?.profile.usage_summary
  const usageLabel = useMemo(() => {
    if (!usage?.reset_at) return null
    return new Date(usage.reset_at).toLocaleDateString()
  }, [usage?.reset_at])

  if (ownAccount && isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile…</div>
  }

  if (profileQuery.isLoading && !payload) {
    return <div className="flex items-center gap-3 px-6 py-10 text-sm text-zinc-500"><div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />Loading your profile…</div>
  }

  if (!payload) {
    return <div className="px-6 py-10 text-sm text-rose-300">Profile not found.</div>
  }

  const activeDefaultVisibility = payload.profile.default_visibility

  return (
    <div className="flex flex-col min-h-full pb-10">
      {/* Cinematic Banner Header */}
      <div className="relative h-[240px] md:h-[300px] w-full shrink-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(0,0,0,0.8) 50%, rgba(124,58,237,0.18))' }} />
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.18)_0,transparent_72%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
        
        {/* Banner Actions */}
        <div className="absolute top-4 right-6 flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          {payload.own_profile ? (
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-4 py-2 text-[13px] font-medium text-white shadow-lg shadow-black/20 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          ) : null}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="mx-auto w-full max-w-[1080px] px-4 md:px-8">
        <section className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] -mt-20 relative z-10">
          
          {/* Glassmorphic Sidebar Card */}
          <div className="flex flex-col space-y-6 rounded-[24px] p-6 backdrop-blur-xl ring-1 ring-white/[0.1] shadow-2xl h-max" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.18) 100%)' }}>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-inner ring-4 ring-black/50 mb-4 relative" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(124,58,237,0.18))' }}>
                {(payload.profile.display_name || payload.profile.username).slice(0, 1).toUpperCase()}
                {payload.profile.plan === 'pro' && (
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-lg ring-4 ring-zinc-900" style={{ background: 'linear-gradient(135deg, rgb(var(--primary)), rgb(var(--accent)))' }}>
                    <span className="text-[10px] font-black tracking-wider">PRO</span>
                  </div>
                )}
              </div>
              <div className="text-xl font-bold text-white tracking-tight">{payload.profile.display_name}</div>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="text-sm font-medium text-zinc-400">@{payload.profile.username}</span>
                {payload.own_profile && payload.profile.plan !== 'pro' ? (
                  <StatusPill tone="neutral" className="scale-90">{payload.profile.plan.toUpperCase()}</StatusPill>
                ) : null}
              </div>
            </div>

            <div className="text-center">
              {payload.profile.bio ? (
                <div className="text-sm leading-relaxed text-zinc-300">{payload.profile.bio}</div>
              ) : (
                payload.own_profile && <div className="text-sm text-zinc-500 italic">No bio written yet.</div>
              )}
            </div>

            {payload.own_profile ? (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setEditingField('name')}
                  className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.12] ring-1 ring-white/[0.05]"
                >
                  Edit name
                </button>
                <button
                  onClick={() => setEditingField('bio')}
                  className="rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/[0.12] ring-1 ring-white/[0.05]"
                >
                  {payload.profile.bio ? 'Edit bio' : 'Add bio'}
                </button>
              </div>
            ) : null}

            {payload.own_profile && usage ? (
              <div className="space-y-4 rounded-xl bg-black/40 p-4 ring-1 ring-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400 font-medium">Credits remaining</span>
                  <span className={`font-bold ${usage.plan_label.toLowerCase() === 'pro' ? 'text-amber-400' : 'text-white'}`}>
                    {usage.credits_remaining}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${usage.plan_label.toLowerCase() === 'pro' ? 'shadow-[0_0_10px_rgba(124,58,237,0.18)]' : 'bg-white'}`}
                      style={{ 
                        width: `${Math.max(2, 100 - usage.progress_percent)}%`,
                        ...(usage.plan_label.toLowerCase() === 'pro' ? { background: 'linear-gradient(90deg, rgb(var(--primary)), rgb(var(--accent)))' } : {})
                      }} 
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500">
                    <span>{usage.allowance} limit</span>
                    {usageLabel ? <span>Resets {usageLabel}</span> : null}
                  </div>
                </div>
              </div>
            ) : null}

            {payload.own_profile ? (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Default Visibility</div>
                <div className="flex grid-cols-2 gap-2">
                  <button 
                    onClick={() => updateProfileMutation.mutate({ default_visibility: 'public' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${activeDefaultVisibility === 'public' ? 'text-white ring-1 ring-[rgba(124,58,237,0.18)]' : 'bg-black/30 text-zinc-400 hover:bg-white/5'}`}
                    style={activeDefaultVisibility === 'public' ? { background: 'rgba(124,58,237,0.18)' } : undefined}
                  >
                    Public
                  </button>
                  <button 
                    onClick={() => updateProfileMutation.mutate({ default_visibility: 'private' })}
                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${activeDefaultVisibility === 'private' ? 'text-white ring-1 ring-[rgba(124,58,237,0.18)]' : 'bg-black/30 text-zinc-400 hover:bg-white/5'}`}
                    style={activeDefaultVisibility === 'private' ? { background: 'rgba(124,58,237,0.18)' } : undefined}
                  >
                    Private
                  </button>
                </div>
              </div>
            ) : null}
            
            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[13px] font-medium text-white/80">
              <span className="text-zinc-500">Published images</span>
              <span>{payload.profile.public_post_count}</span>
            </div>
          </div>

        <section className="space-y-3.5">
          <div className="border-b border-white/[0.06] pb-3">
            <div className="text-lg font-semibold text-white">{payload.own_profile ? 'Your gallery' : 'Public gallery'}</div>
            <div className="mt-1 text-sm text-zinc-500">
              {payload.own_profile
                ? 'All your images. Only you can see the private ones.'
                : 'Images shared publicly by this creator.'}
            </div>
          </div>
          <PostGrid posts={payload.posts} ownProfile={payload.own_profile} view={view} />
        </section>
      </section>


      </div>
      
      <EditTextDialog
        open={editingField === 'name'}
        title="Display name"
        description="Update the name people see on your profile and public work."
        label="Name"
        initialValue={payload.profile.display_name ?? ''}
        placeholder="Your display name"
        busy={updateProfileMutation.isPending}
        onCancel={() => setEditingField(null)}
        onConfirm={async (value) => {
          await updateProfileMutation.mutateAsync({ display_name: value.trim() })
          setEditingField(null)
        }}
      />
      <EditTextDialog
        open={editingField === 'bio'}
        title="Profile bio"
        description="Add a short line that gives your profile some personality."
        label="Bio"
        initialValue={payload.profile.bio ?? ''}
        placeholder="A short bio"
        busy={updateProfileMutation.isPending}
        multiline
        onCancel={() => setEditingField(null)}
        onConfirm={async (value) => {
          await updateProfileMutation.mutateAsync({ bio: value.trim() })
          setEditingField(null)
        }}
      />
    </div>
  )
}
