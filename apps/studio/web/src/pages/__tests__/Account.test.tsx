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
          plan_label: 'Premium',
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
    assetOne,
    assetTwo,
    exportProfile: vi.fn().mockResolvedValue({ profile: { username: 'ghostsofter12' }, posts: [] }),
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
          plan_label: 'Premium',
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
        label: 'Premium',
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
    exportProfile: mockState.exportProfile,
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
import { Route, Routes } from 'react-router-dom'

describe('AccountPage', () => {
  afterEach(() => {
    mockState.getMyProfile.mockClear()
    mockState.getProfile.mockReset()
    mockState.exportProfile.mockClear()
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

    const previewButtons = await screen.findAllByRole('button', { name: /open anime tarzinda preview/i })
    await userEvent.click(previewButtons[0])

    expect(await screen.findByTitle('Close (ESC)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy prompt/i })).toBeInTheDocument()
  })

  it('keeps account rail actions wired to profile APIs', async () => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:profile-export'),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    renderWithProviders(<AccountPage />, { route: '/account' })

    expect(screen.queryByText('Public profile preview')).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /open public profile/i })).toHaveAttribute('href', '/u/ghostsofter12')

    await userEvent.click(await screen.findByRole('button', { name: /^private$/i }))
    await waitFor(() => {
      expect(mockState.updateMyProfile).toHaveBeenCalledWith({ default_visibility: 'private' })
    })

    await userEvent.click(screen.getByRole('button', { name: /export my data/i }))
    await waitFor(() => {
      expect(mockState.exportProfile).toHaveBeenCalled()
    })
    anchorClick.mockRestore()
  })

  it('renders username routes as public profiles even when the viewer owns the account', async () => {
    mockState.getProfile.mockResolvedValue({
      profile: {
        display_name: 'valiantlion',
        username: 'ghostsofter12',
        avatar_url: null,
        bio: '',
        plan: 'pro',
        default_visibility: 'private',
        featured_asset_id: 'asset-2',
        featured_asset_position: 'center',
        usage_summary: {
          plan_label: 'Premium',
          credits_remaining: 240,
          allowance: 1200,
          reset_at: null,
          progress_percent: 20,
        },
        public_post_count: 1,
      },
      featured_asset: mockState.assetTwo,
      own_profile: true,
      can_edit: true,
      posts: [
        {
          id: 'post-1',
          owner_username: 'ghostsofter12',
          owner_display_name: 'valiantlion',
          title: 'Anime tarzinda',
          prompt: 'anime profile portrait',
          cover_asset: mockState.assetOne,
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
          cover_asset: mockState.assetTwo,
          preview_assets: [],
          visibility: 'private',
          like_count: 1,
          viewer_has_liked: false,
          created_at: '2026-04-19T00:01:00Z',
          project_id: 'project-2',
          style_tags: [],
        },
      ],
    })

    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<AccountPage />} />
      </Routes>,
      { route: '/u/ghostsofter12' },
    )

    expect(await screen.findByRole('heading', { name: 'valiantlion', level: 1 })).toBeInTheDocument()
    expect(mockState.getProfile).toHaveBeenCalledWith('ghostsofter12')
    expect(mockState.getMyProfile).not.toHaveBeenCalled()
    expect(screen.getByText('Creator profile')).toBeInTheDocument()
    expect(screen.getAllByText('Anime tarzinda').length).toBeGreaterThan(0)
    expect(screen.queryByText('Golden portrait')).not.toBeInTheDocument()
    expect(screen.queryByText('Profile details, public preview, credits, exports, and gallery actions live here.')).not.toBeInTheDocument()
    expect(screen.queryByText('Plan & billing')).not.toBeInTheDocument()
    expect(screen.queryByText('Public page')).not.toBeInTheDocument()
    expect(screen.queryByText('Billing details are private to this account')).not.toBeInTheDocument()
    expect(screen.queryByText('Default visibility')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit profile/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /choose artwork/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /export my data/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Delete account')).not.toBeInTheDocument()
  })
})
