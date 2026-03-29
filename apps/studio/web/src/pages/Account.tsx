import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid2X2, List, Settings } from 'lucide-react'

import { AppPage, ButtonChip, EditTextDialog, EmptyState, LegalFooter, PageHeader, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type ProfilePayload, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type ViewMode = 'grid' | 'list'

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${value === 'grid' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-3 w-3" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${value === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
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
            ? 'Public and private work will start showing up here once you generate and keep images.'
            : 'This profile has no public work visible yet.'
        }
      />
    )
  }

  if (view === 'list') {
    return (
      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
        {posts.map((post) => (
          <article key={post.id} className="grid gap-3 py-3.5 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center">
            <div className="overflow-hidden rounded-[16px] bg-white/[0.03]">
              {post.cover_asset ? (
                <img src={post.cover_asset.thumbnail_url ?? post.cover_asset.url} alt={post.title} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="aspect-[4/5] w-full bg-white/[0.04]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-white">{post.title}</div>
              <div className="mt-1.5 line-clamp-2 text-sm leading-6 text-zinc-400">{post.prompt}</div>
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
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {posts.map((post) => (
        <article key={post.id} className="space-y-2.5 border-b border-white/[0.06] pb-3.5">
          <div className="overflow-hidden rounded-[20px] bg-white/[0.03]">
            {post.cover_asset ? (
              <img src={post.cover_asset.thumbnail_url ?? post.cover_asset.url} alt={post.title} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="aspect-[4/5] w-full bg-white/[0.04]" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ownProfile ? <StatusPill tone={post.visibility === 'public' ? 'brand' : 'neutral'}>{post.visibility}</StatusPill> : null}
            <StatusPill tone="neutral">{post.like_count} likes</StatusPill>
          </div>
          <div className="text-base font-semibold text-white">{post.title}</div>
          <div className="line-clamp-2 text-sm leading-6 text-zinc-400">{post.prompt}</div>
        </article>
      ))}
    </div>
  )
}

export default function AccountPage() {
  const { username } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [view, setView] = useState<ViewMode>('grid')
  const [editingField, setEditingField] = useState<'name' | 'bio' | null>(null)
  const queryClient = useQueryClient()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const ownAccount = !username
  const optimisticPayload = useMemo<ProfilePayload | undefined>(() => {
    if (!ownAccount || !auth) return undefined

    const allowance = Math.max(auth.plan.monthly_credits || auth.credits.remaining || 0, 0)
    const creditsRemaining = Math.max(auth.credits.remaining, 0)
    const consumedPercent = allowance ? Math.min(100, Math.max(0, Math.round(((allowance - creditsRemaining) / allowance) * 100))) : 0

    return {
      profile: {
        display_name: auth.identity.display_name,
        username: auth.identity.username ?? 'profile',
        avatar_url: auth.identity.avatar_url ?? null,
        bio: auth.identity.bio ?? '',
        plan: auth.identity.plan,
        default_visibility: auth.identity.default_visibility ?? 'public',
        usage_summary: {
          plan_label: auth.plan.label,
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
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading profile...</div>
  }

  if (profileQuery.isLoading && !payload) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading profile...</div>
  }

  if (!payload) {
    return <div className="px-6 py-10 text-sm text-rose-300">Profile not found.</div>
  }

  const title = payload.own_profile ? 'Your profile' : `${payload.profile.display_name}`
  const activeDefaultVisibility = payload.profile.default_visibility

  return (
    <AppPage className="max-w-[1080px] gap-5 py-3">
      <PageHeader
        eyebrow={payload.own_profile ? 'Account' : 'Profile'}
        title={title}
        description={
          payload.profile.bio ||
          (payload.own_profile
            ? 'Manage how your work appears publicly while keeping private projects out of public view.'
            : 'Public work published from OmniaCreata.'
          )
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="brand">@{payload.profile.username}</StatusPill>
            <StatusPill tone="neutral">{payload.profile.public_post_count} public posts</StatusPill>
            {payload.own_profile ? <StatusPill tone="neutral">{payload.profile.plan}</StatusPill> : null}
          </div>
        }
        aside={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <ViewToggle value={view} onChange={setView} />
            {payload.own_profile ? (
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-3 py-1.5 text-[12px] text-white transition hover:bg-white/[0.08]"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-3.5 border-b border-white/[0.06] pb-5 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-base font-semibold text-white">
              {(payload.profile.display_name || payload.profile.username).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-[1.05rem] font-semibold text-white">{payload.profile.display_name}</div>
              <div className="mt-0.5 text-sm text-zinc-500">@{payload.profile.username}</div>
            </div>
          </div>

          {payload.profile.bio ? <div className="text-sm leading-6 text-zinc-400">{payload.profile.bio}</div> : null}
          {payload.own_profile ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEditingField('name')}
                className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white transition hover:bg-white/[0.08]"
              >
                Edit name
              </button>
              <button
                onClick={() => setEditingField('bio')}
                className="rounded-full bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white transition hover:bg-white/[0.08]"
              >
                {payload.profile.bio ? 'Edit bio' : 'Add bio'}
              </button>
            </div>
          ) : null}

          {usage ? (
            <div className="space-y-2 border-y border-white/[0.06] py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">Plan</span>
                <span className="font-medium text-white">{usage.plan_label}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">Credits left</span>
                <span className="font-medium text-white">{usage.credits_remaining}</span>
              </div>
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full rounded-full bg-white" style={{ width: `${100 - usage.progress_percent}%` }} />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <span>{usage.allowance} monthly allowance</span>
                  {usageLabel ? <span>Resets {usageLabel}</span> : null}
                </div>
              </div>
            </div>
          ) : null}

          {payload.own_profile ? (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-white">Visibility</div>
              <div className="text-zinc-500">Public posts appear in Explore and on your profile. Private work stays in your own account and Library.</div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => updateProfileMutation.mutate({ default_visibility: 'public' })}>
                  <ButtonChip active={activeDefaultVisibility === 'public'}>Default public</ButtonChip>
                </button>
                <button onClick={() => updateProfileMutation.mutate({ default_visibility: 'private' })}>
                  <ButtonChip active={activeDefaultVisibility === 'private'}>Default private</ButtonChip>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <section className="space-y-3.5">
          <div className="border-b border-white/[0.06] pb-3">
            <div className="text-lg font-semibold text-white">{payload.own_profile ? 'Your work' : 'Public work'}</div>
            <div className="mt-1 text-sm text-zinc-500">
              {payload.own_profile
                ? 'Public and private outputs are shown here with visibility intact.'
                : 'Only public work is visible here.'}
            </div>
          </div>
          <PostGrid posts={payload.posts} ownProfile={payload.own_profile} view={view} />
        </section>
      </section>

      {!payload.own_profile ? <LegalFooter /> : null}

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
    </AppPage>
  )
}
