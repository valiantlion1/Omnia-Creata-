import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'

function buildProjectPayload() {
  return {
    project: {
      id: 'project-1',
      workspace_id: 'ws-user-1',
      identity_id: 'user-1',
      title: 'Campaign selects',
      description: 'Spring drop direction.',
      surface: 'compose',
      system_managed: false,
      cover_asset_id: 'asset-1',
      last_generation_id: 'generation-1',
      created_at: '2026-04-22T08:00:00Z',
      updated_at: '2026-04-22T10:15:00Z',
    },
    recent_assets: [
      {
        id: 'asset-1',
        workspace_id: 'ws-user-1',
        project_id: 'project-1',
        identity_id: 'user-1',
        title: 'Spring hero frame',
        display_title: 'Spring hero frame',
        prompt: 'soft daylight portrait in a moss garden',
        url: 'https://example.com/project-asset.png',
        thumbnail_url: 'https://example.com/project-asset-thumb.png',
        preview_url: 'https://example.com/project-asset-preview.png',
        blocked_preview_url: null,
        can_open: true,
        protection_state: 'ready',
        metadata: {
          aspect_ratio: '16:9',
          like_count: 0,
        },
        created_at: '2026-04-22T10:00:00Z',
      },
    ],
    recent_generations: [
      {
        job_id: 'generation-1',
        title: 'Spring hero frame',
        display_title: 'Spring hero frame',
        status: 'succeeded',
        library_state: 'ready',
        project_id: 'project-1',
        provider: 'runware',
        model: 'flux-2-pro',
        display_model_label: 'FLUX.2 Pro',
        prompt_snapshot: {
          prompt: 'soft daylight portrait in a moss garden',
          negative_prompt: '',
          model: 'flux-2-pro',
          workflow: 'text_to_image',
          reference_asset_id: null,
          width: 1536,
          height: 864,
          steps: 28,
          cfg_scale: 6.5,
          seed: 11,
          aspect_ratio: '16:9',
        },
        pricing_lane: 'final',
        estimated_cost: 0.08,
        estimated_cost_source: 'provider_quote',
        credit_cost: 12,
        reserved_credit_cost: 12,
        final_credit_cost: 12,
        credit_charge_policy: 'charged',
        credit_status: 'charged',
        output_count: 1,
        outputs: [
          {
            id: 'output-1',
            url: 'https://example.com/project-output.png',
            thumbnail_url: 'https://example.com/project-output-thumb.png',
          },
        ],
        error: null,
        error_code: null,
        created_at: '2026-04-22T09:58:00Z',
        completed_at: '2026-04-22T10:00:00Z',
      },
    ],
  }
}

const mockState = vi.hoisted(() => ({
  getProject: vi.fn(),
  createShare: vi.fn(),
  exportProject: vi.fn(),
  saveStyleFromPrompt: vi.fn(),
}))

vi.mock('@/lib/studioApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/studioApi')>(
    '@/lib/studioApi',
  )
  return {
    ...actual,
    studioApi: {
      ...actual.studioApi,
      getProject: mockState.getProject,
      createShare: mockState.createShare,
      exportProject: mockState.exportProject,
      saveStyleFromPrompt: mockState.saveStyleFromPrompt,
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
        username: 'creator',
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

import ProjectPage from '@/pages/Project'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('ProjectPage workspace layout', () => {
  beforeEach(() => {
    mockState.getProject.mockReset()
    mockState.getProject.mockResolvedValue(buildProjectPayload())
  })

  it('keeps the project surface focused on the gallery instead of run filler', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectPage />} />
      </Routes>,
      { route: '/projects/project-1' },
    )

    expect(await screen.findByText(/Campaign selects/i)).toBeInTheDocument()
    expect(screen.getByText(/^Images$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Spring hero frame/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/16:9/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Open Create/i })).toBeInTheDocument()
    expect(screen.queryByText(/Recent runs/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Save as style/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/soft daylight portrait in a moss garden/i)).not.toBeInTheDocument()
  })

  it('shows a recovery surface instead of raw error text when the project is unavailable', async () => {
    mockState.getProject.mockRejectedValueOnce(new Error('Project not found'))

    renderWithProviders(
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectPage />} />
      </Routes>,
      { route: '/projects/project-missing' },
    )

    expect(await screen.findByText(/This project is no longer here\./i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Projects$/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Create$/i })).toBeInTheDocument()
    expect(screen.queryByText(/^Project not found\.$/i)).not.toBeInTheDocument()
  })
})
