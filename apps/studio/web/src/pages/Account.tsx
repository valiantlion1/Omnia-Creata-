import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Grid2X2, List, Settings } from 'lucide-react'

import { AppPage, ButtonChip, EmptyState, LegalFooter, PageHeader, StatusPill } from '@/components/StudioPrimitives'
import { studioApi, type ProfilePayload, type PublicPost } from '@/lib/studioApi'
import { useStudioAuth } from '@/lib/studioAuth'

type ViewMode = 'grid' | 'list'

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/8">
      <button
        onClick={() => onChange('grid')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${value === 'grid' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="Grid view"
      >
        <Grid2X2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${value === 'list' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        title="List view"
      >
        <List className="h-3.5 w-3.5" />
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
          <article key={post.id} className="grid gap-4 py-4 md:grid-cols-[110px_minmax(0,1fr)_auto] md:items-center">
            <div className="overflow-hidden rounded-[18px] bg-white/[0.03]">
              {post.cover_asset ? (
                <img src={post.cover_asset.thumbnail_url ?? post.cover_asset.url} alt={post.title} className="aspect-[4/5] w-full object-cover" />
              ) : (
                <div className="aspect-[4/5] w-full bg-white/[0.04]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold text-white">{post.title}</div>
              <div className="mt-2 line-clamp-2 text-sm leading-7 text-zinc-400">{post.prompt}</div>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <article key={post.id} className="space-y-3 border-b border-white/[0.06] pb-4">
          <div className="overflow-hidden rounded-[22px] bg-white/[0.03]">
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
          <div className="text-lg font-semibold text-white">{post.title}</div>
          <div className="line-clamp-3 text-sm leading-7 text-zinc-400">{post.prompt}</div>
        </article>
      ))}
    </div>
  )
}

export default function AccountPage() {
  const { username } = useParams()
  const { auth, isAuthenticated, isAuthSyncing, isLoading } = useStudioAuth()
  const [view, setView] = useState<ViewMode>('grid')
  const queryClient = useQueryClient()
  const canLoadPrivate = !isLoading && !isAuthSyncing && isAuthenticated && !auth?.guest
  const ownAccount = !username

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
  })

  const payload = profileQuery.data as ProfilePayload | undefined
  const usage = payload?.profile.usage_summary
  const usageLabel = useMemo(() => {
    if (!usage?.reset_at) return null
    return new Date(usage.reset_at).toLocaleDateString()
  }, [usage?.reset_at])

  if (ownAccount && isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading profile...</div>
  }

  if (profileQuery.isLoading) {
    return <div className="px-6 py-10 text-sm text-zinc-500">Loading profile...</div>
  }

  if (!payload) {
    return <div className="px-6 py-10 text-sm text-rose-300">Profile not found.</div>
  }

  const title = payload.own_profile ? 'Your profile' : `${payload.profile.display_name}`
  const activeDefaultVisibility = payload.profile.default_visibility

  return (
    <AppPage className="max-w-[1380px] gap-8 py-8">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ViewToggle value={view} onChange={setView} />
            {payload.own_profile ? (
              <Link
                to="/settings"
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-white transition hover:bg-white/[0.08]"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5 border-b border-white/[0.06] pb-6 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] text-xl font-semibold text-white">
              {(payload.profile.display_name || payload.profile.username).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-xl font-semibold text-white">{payload.profile.display_name}</div>
              <div className="mt-1 text-sm text-zinc-500">@{payload.profile.username}</div>
            </div>
          </div>

          {payload.profile.bio ? <div className="text-sm leading-7 text-zinc-400">{payload.profile.bio}</div> : null}
          {payload.own_profile ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const nextName = window.prompt('Display name', payload.profile.display_name ?? '')
                  if (!nextName) return
                  await updateProfileMutation.mutateAsync({ display_name: nextName })
                }}
                className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-white transition hover:bg-white/[0.08]"
              >
                Edit name
              </button>
              <button
                onClick={async () => {
                  const nextBio = window.prompt('Profile bio', payload.profile.bio ?? '')
                  if (nextBio === null) return
                  await updateProfileMutation.mutateAsync({ bio: nextBio })
                }}
                className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-white transition hover:bg-white/[0.08]"
              >
                {payload.profile.bio ? 'Edit bio' : 'Add bio'}
              </button>
            </div>
          ) : null}

          {usage ? (
            <div className="space-y-3 border-y border-white/[0.06] py-4">
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
              <div className="text-zinc-500">Public posts appear in Explore and on your public profile. Private work stays inside your own account and Library.</div>
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

        <section className="space-y-5">
          <div className="border-b border-white/[0.06] pb-3">
            <div className="text-xl font-semibold text-white">{payload.own_profile ? 'Your work' : 'Public work'}</div>
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
    </AppPage>
  )
}
