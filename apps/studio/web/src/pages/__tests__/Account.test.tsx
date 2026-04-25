import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockState = vi.hoisted(() => {
  const assetOne = {
    id: 'asset-1',
    workspace_id: 'ws-user-1',
    project_id: 'project-1',
    identity_id: 'user-1',
    title: 'Anime tarzinda',
    prompt: 'anime profile portrait',
    url: '/media/anime.png',
    thumbnail_url: '/media/anime-thumb.png',
    preview_url: '/media/anime-preview.png',
    metadata: {},
    created_at: '2026-04-19T00:00:00Z',
    deleted_at: null,
    can_open: true,
  }

  const assetTwo = {
    id: 'asset-2',
    workspace_id: 'ws-user-1',
    project_id: 'project-2',
    identity_id: 'user-1',
    title: 'Golden portrait',
    prompt: 'gold editorial portrait',
    url: '/media/gold.png',
    thumbnail_url: '/media/gold-thumb.png',
    preview_url: '/media/gold-preview.png',
    metadata: {},
    created_at: '2026-04-19T00:01:00Z',
    deleted_at: null,
    can_open: true,
  }

  return {
    getMyProfile: vi.fn().mockResolvedValue({
      profile: {
        display_name: 'valiantlion',
        username: 'ghostsofter12',
        avatar_url: null,
        bio: '',
        plan: 'pro',
        default_visibility: 'public',
        featured_asset_id: null,
        featured_asset_position: 'center',
        usage_summary: {
          plan_label: 'Pro',
          credits_remaining: 240,
          allowance: 1200,
          reset_at: null,
          progress_percent: 20,
        },
        public_post_count: 2,
      },
      featured_asset: null,
      own_profile: true,
      can_edit: true,
      posts: [
        {
          id: 'post-1',
          owner_username: 'ghostsofter12',
          owner_display_name: 'valiantlion',
          title: 'Anime tarzinda',
          prompt: 'anime profile portrait',
          cover_asset: assetOne,
          preview_assets: [],
          visibility: 'public',
          like_count: 3,
          viewer_has_liked: false,
          created_at: '2026-04-19T00:00:00Z',
          project_id: 'project-1',
          style_tags: [],
        },
        {
          id: 'post-2',
          owner_username: 'ghostsofter12',
          owner_display_name: 'valiantlion',
          title: 'Golden portrait',
          prompt: 'gold editorial portrait',
          cover_asset: assetTwo,
          preview_assets: [],
          visibility: 'private',
          like_count: 1,
          viewer_has_liked: false,
          created_at: '2026-04-19T00:01:00Z',
          project_id: 'project-2',
          style_tags: [],
        },
      ],
    }),
    getProfile: vi.fn(),
    updateMyProfile: vi.fn().mockResolvedValue({
      profile: {
        display_name: 'valiantlion',
        username: 'ghostsofter12',
        avatar_url: null,
        bio: '',
        plan: 'pro',
        default_visibility: 'public',
        featured_asset_id: 'asset-1',
        featured_asset_position: 'bottom',
        usage_summary: {
          plan_label: 'Pro',
          credits_remaining: 240,
          allowance: 1200,
          reset_at: null,
          progress_percent: 20,
        },
        public_post_count: 2,
      },
      featured_asset: assetOne,
      own_profile: true,
      can_edit: true,
      posts: [],
    }),
    auth: {
      guest: false,
      identity: {
        id: 'user-1',
        email: 'ghostsofter12@gmail.com',
        display_name: 'valiantlion',
        username: 'ghostsofter12',
        bio: '',
        plan: 'pro',
        workspace_id: 'ws-user-1',
        owner_mode: false,
        root_admin: false,
        default_visibility: 'public',
      },
      credits: {
        remaining: 240,
        monthly_remaining: 240,
        extra_credits: 0,
      },
      plan: {
        id: 'pro',
        label: 'Pro',
        monthly_credits: 1200,
        queue_priority: 'premium',
        share_links: true,
        can_generate: true,
        can_access_chat: true,
      },
    },
  }
})

vi.mock('@/lib/studioApi', () => ({
  studioApi: {
    getMyProfile: mockState.getMyProfile,
    getProfile: mockState.getProfile,
    updateMyProfile: mockState.updateMyProfile,
  },
}))

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: mockState.auth,
    isAuthenticated: true,
    isAuthSyncing: false,
    isLoading: false,
  }),
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import AccountPage from '@/pages/Account'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('AccountPage', () => {
  afterEach(() => {
    mockState.getMyProfile.mockClear()
    mockState.getProfile.mockClear()
    mockState.updateMyProfile.mockClear()
  })

  it('lets owners choose a profile artwork from their gallery', async () => {
    renderWithProviders(<AccountPage />, { route: '/account' })

    await userEvent.click(await screen.findByRole('button', { name: /choose artwork/i }))
    await userEvent.click(screen.getByRole('button', { name: /preview golden portrait as profile artwork/i }))
    await userEvent.click(screen.getByRole('button', { name: /^bottom$/i }))
    await userEvent.click(screen.getByRole('button', { name: /apply artwork/i }))

    await waitFor(() => {
      expect(mockState.updateMyProfile).toHaveBeenCalledWith({ featured_asset_id: 'asset-2', featured_asset_position: 'bottom' })
    })
  })

  it('opens gallery images in the shared lightbox', async () => {
    renderWithProviders(<AccountPage />, { route: '/account' })

    await userEvent.click(await screen.findByRole('button', { name: /open anime tarzinda preview/i }))

    expect(await screen.findByTitle('Close (ESC)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy prompt/i })).toBeInTheDocument()
  })
})
