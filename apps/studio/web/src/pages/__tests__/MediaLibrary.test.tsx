import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockState = vi.hoisted(() => ({
  listAssets: vi.fn().mockResolvedValue({
    assets: [
      {
        id: 'asset-ready-1',
        workspace_id: 'ws-user-1',
        project_id: 'project-1',
        identity_id: 'user-1',
        title: 'Golden portrait',
        display_title: 'Golden portrait',
        prompt: 'golden portrait',
        url: 'https://example.com/asset-ready-1.png',
        thumbnail_url: 'https://example.com/asset-ready-1-thumb.png',
        preview_url: 'https://example.com/asset-ready-1-preview.png',
        metadata: {
          generation_id: 'group-ready-1',
          model: 'flux-2-pro',
          display_model_label: 'Pro',
        },
        created_at: '2026-04-19T10:00:00Z',
        deleted_at: null,
        library_state: 'ready',
        derived_tags: ['portrait'],
      },
    ],
  }),
  listProjects: vi.fn().mockResolvedValue({
    projects: [
      {
        id: 'project-1',
        workspace_id: 'ws-user-1',
        identity_id: 'user-1',
        title: 'Portraits',
        description: '',
        surface: 'compose',
        system_managed: false,
        cover_asset_id: null,
        last_generation_id: null,
        created_at: '2026-04-19T09:00:00Z',
        updated_at: '2026-04-19T10:05:00Z',
      },
    ],
  }),
  listGenerations: vi.fn().mockResolvedValue({
    generations: [
      {
        job_id: 'generation-blocked',
        title: 'Held portrait',
        display_title: 'Held portrait',
        status: 'failed',
        library_state: 'blocked',
        project_id: 'project-1',
        provider: 'runware',
        model: 'flux-2-pro',
        prompt_snapshot: {
          prompt: 'fashion portrait',
          negative_prompt: '',
          model: 'flux-2-pro',
          workflow: 'text_to_image',
          reference_asset_id: null,
          width: 1024,
          height: 1024,
          steps: 28,
          cfg_scale: 6.5,
          seed: 7,
          aspect_ratio: '1:1',
        },
        pricing_lane: 'final',
        estimated_cost: 0.08,
        estimated_cost_source: 'provider_quote',
        credit_cost: 12,
        reserved_credit_cost: 12,
        final_credit_cost: 0,
        credit_charge_policy: 'none',
        credit_status: 'released',
        output_count: 1,
        outputs: [],
        error: 'Runware flagged the output as potentially sensitive',
        error_code: 'safety_block',
        created_at: '2026-04-19T10:12:00Z',
        completed_at: '2026-04-19T10:13:00Z',
      },
      {
        job_id: 'generation-failed',
        title: 'Retry portrait',
        display_title: 'Retry portrait',
        status: 'failed',
        library_state: 'failed',
        project_id: 'project-1',
        provider: 'runware',
        model: 'flux-2-pro',
        prompt_snapshot: {
          prompt: 'editorial portrait',
          negative_prompt: '',
          model: 'flux-2-pro',
          workflow: 'text_to_image',
          reference_asset_id: null,
          width: 1024,
          height: 1024,
          steps: 28,
          cfg_scale: 6.5,
          seed: 8,
          aspect_ratio: '1:1',
        },
        pricing_lane: 'final',
        estimated_cost: 0.08,
        estimated_cost_source: 'provider_quote',
        credit_cost: 12,
        reserved_credit_cost: 12,
        final_credit_cost: 0,
        credit_charge_policy: 'none',
        credit_status: 'released',
        output_count: 1,
        outputs: [],
        error: 'provider request failed',
        error_code: 'generation_failed',
        created_at: '2026-04-19T10:10:00Z',
        completed_at: '2026-04-19T10:11:00Z',
      },
    ],
  }),
  restoreAsset: vi.fn(),
  permanentlyDeleteAsset: vi.fn(),
  emptyTrash: vi.fn(),
  updatePost: vi.fn(),
  movePost: vi.fn(),
  trashPost: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  exportProject: vi.fn(),
  listFavoritePosts: vi.fn().mockResolvedValue({
    posts: [
      {
        id: 'post-favorite-1',
        owner_username: 'creatorone',
        owner_display_name: 'Creator One',
        title: 'Saved lake scene',
        prompt: 'misty mountain lake at dawn',
        cover_asset: {
          id: 'asset-favorite-cover',
          workspace_id: 'ws-creator',
          project_id: 'project-public',
          identity_id: 'creator-1',
          title: 'Saved lake scene',
          display_title: 'Saved lake scene',
          prompt: 'misty mountain lake at dawn',
          url: 'https://example.com/favorite-full.png',
          thumbnail_url: 'https://example.com/favorite-thumb.png',
          preview_url: 'https://example.com/favorite-preview.png',
          metadata: {
            model: 'flux-2-pro',
            aspect_ratio: '16:9',
          },
          created_at: '2026-04-19T11:00:00Z',
          deleted_at: null,
          library_state: 'ready',
          derived_tags: ['cinematic', 'landscape'],
        },
        preview_assets: [],
        visibility: 'public',
        like_count: 8,
        viewer_has_liked: true,
        created_at: '2026-04-19T11:00:00Z',
        project_id: null,
        style_tags: ['cinematic', 'landscape'],
      },
    ],
  }),
  unlikePost: vi.fn().mockResolvedValue({
    post: {
      id: 'post-favorite-1',
      like_count: 7,
      viewer_has_liked: false,
    },
  }),
  deleteGeneration: vi.fn().mockResolvedValue({
    generation_id: 'generation-failed',
    status: 'deleted',
  }),
}))

vi.mock('@/lib/studioApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/studioApi')>(
    '@/lib/studioApi',
  )
  return {
    ...actual,
    studioApi: {
      ...actual.studioApi,
      listAssets: mockState.listAssets,
      listProjects: mockState.listProjects,
      listGenerations: mockState.listGenerations,
      restoreAsset: mockState.restoreAsset,
      permanentlyDeleteAsset: mockState.permanentlyDeleteAsset,
      emptyTrash: mockState.emptyTrash,
      updatePost: mockState.updatePost,
      movePost: mockState.movePost,
      trashPost: mockState.trashPost,
      createProject: mockState.createProject,
      updateProject: mockState.updateProject,
      deleteProject: mockState.deleteProject,
      exportProject: mockState.exportProject,
      listFavoritePosts: mockState.listFavoritePosts,
      unlikePost: mockState.unlikePost,
      deleteGeneration: mockState.deleteGeneration,
    },
  }
})

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: {
      guest: false,
      identity: {
        id: 'user-1',
        email: 'creator@omniacreata.com',
        display_name: 'Creator',
        plan: 'creator',
        workspace_id: 'ws-user-1',
      },
    },
    isAuthenticated: true,
    isAuthSyncing: false,
    isLoading: false,
  }),
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import MediaLibraryPage from '@/pages/MediaLibrary'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('MediaLibraryPage final image library', () => {
  afterEach(() => {
    mockState.listAssets.mockClear()
    mockState.listProjects.mockClear()
    mockState.listGenerations.mockClear()
    mockState.listFavoritePosts.mockClear()
    mockState.unlikePost.mockClear()
    mockState.deleteGeneration.mockClear()
  })

  it('keeps My Images focused on final results and hides processing-only surfaces', async () => {
    renderWithProviders(<MediaLibraryPage />, { route: '/library/images' })

    expect(await screen.findByText(/Golden portrait/i)).toBeInTheDocument()
    expect(screen.queryByText(/Retry portrait/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Held portrait/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Processing$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Only completed results live here\./i)).not.toBeInTheDocument()
    expect(screen.getByText(/finished image/i)).toBeInTheDocument()
  })

  it('renders liked public posts in Favorites and keeps grid/list actions working', async () => {
    renderWithProviders(<MediaLibraryPage />, { route: '/library/likes' })

    expect(await screen.findByText(/Saved lake scene/i)).toBeInTheDocument()
    expect(screen.getByText(/Creator One/i)).toBeInTheDocument()

    await userEvent.click(screen.getByTitle(/List view/i))

    expect(await screen.findByText(/misty mountain lake at dawn/i)).toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /Open actions for Saved lake scene/i }),
    )
    await userEvent.click(screen.getByRole('button', { name: /Remove favorite/i }))

    await waitFor(() => {
      expect(mockState.unlikePost).toHaveBeenCalledWith('post-favorite-1')
    })
  })
})
