import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

const mockState = vi.hoisted(() => ({
  getAdminTelemetry: vi.fn(),
  authState: {
    auth: {
      guest: false,
      identity: {
        id: 'root-1',
        email: 'root@example.com',
        display_name: 'Root Admin',
        username: 'root',
        plan: 'pro',
        workspace_id: 'ws-root-1',
        owner_mode: true,
        root_admin: true,
      },
      credits: {
        remaining: 999,
        monthly_remaining: 999,
        extra_credits: 0,
      },
      plan: {
        id: 'pro',
        label: 'Pro',
        monthly_credits: 1000,
        queue_priority: 'priority',
        share_links: true,
        can_generate: true,
        can_access_chat: true,
      },
    },
    isAuthenticated: true,
    isLoading: false,
  },
}))

vi.mock('@/lib/studioApi', () => ({
  studioApi: {
    getAdminTelemetry: mockState.getAdminTelemetry,
  },
}))

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => mockState.authState,
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import AnalyticsPage from '@/pages/Analytics'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('AnalyticsPage', () => {
  afterEach(() => {
    mockState.getAdminTelemetry.mockReset()
    mockState.authState.auth.identity.root_admin = true
    mockState.authState.auth.identity.owner_mode = true
    mockState.authState.isAuthenticated = true
    mockState.authState.isLoading = false
  })

  it('keeps unavailable backend telemetry explicit instead of rendering a fake zero', async () => {
    mockState.getAdminTelemetry.mockResolvedValue({
      status: 'OK',
      telemetry: {
        event_count: 4,
        grand_total_generations: 12,
        grand_total_spent_usd: 0.0432,
      },
      total_identities: 3,
      blocked_injections: null,
      blocked_injections_status: 'unavailable',
      blocked_injections_detail: 'Injection-specific blocking telemetry is not persisted yet.',
    })

    renderWithProviders(<AnalyticsPage />, { route: '/dashboard' })

    expect(await screen.findByText('Not tracked')).toBeInTheDocument()
    expect(screen.getByText('No fake data')).toBeInTheDocument()
    expect(screen.getByText(/Injection-specific blocking telemetry is not persisted yet/i)).toBeInTheDocument()
    expect(mockState.getAdminTelemetry).toHaveBeenCalledTimes(1)
  })

  it('does not call root telemetry for non-root users', async () => {
    mockState.authState.auth.identity.root_admin = false
    mockState.authState.auth.identity.owner_mode = true

    renderWithProviders(<AnalyticsPage />, { route: '/dashboard' })

    expect(screen.getByText(/Redirecting to Explore/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(mockState.getAdminTelemetry).not.toHaveBeenCalled()
    })
  })
})
