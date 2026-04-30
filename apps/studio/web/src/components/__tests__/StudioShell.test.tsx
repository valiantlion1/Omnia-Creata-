import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

const mockState = vi.hoisted(() => ({
  auth: null as null | {
    guest?: boolean
    identity: {
      display_name: string
      plan: string
      owner_mode: boolean
      root_admin: boolean
      avatar_url: string | null
    }
    plan: {
      label: string
      monthly_credits: number
      can_generate: boolean
    }
    credits: {
      remaining: number
      monthly_remaining: number
    }
  },
  isAuthenticated: false,
  getMyProfile: vi.fn().mockResolvedValue({
    profile: {
      usage_summary: {
        plan_label: 'Premium',
        credits_remaining: 240,
        allowance: 1200,
        progress_percent: 20,
      },
    },
  }),
  listConversations: vi.fn().mockResolvedValue({ conversations: [] }),
  signOut: vi.fn(),
}))

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: mockState.auth,
    isAuthenticated: mockState.isAuthenticated,
    isAuthSyncing: false,
    isLoading: false,
    signOut: mockState.signOut,
  }),
}))

vi.mock('@/lib/studioApi', () => ({
  studioApi: {
    getMyProfile: mockState.getMyProfile,
    listConversations: mockState.listConversations,
  },
}))

import StudioShell from '@/components/StudioShell'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('StudioShell', () => {
  afterEach(() => {
    mockState.auth = null
    mockState.isAuthenticated = false
    mockState.getMyProfile.mockClear()
    mockState.listConversations.mockClear()
    mockState.signOut.mockClear()
  })

  it('keeps guest settings as a single nav item that routes through login intent', () => {
    renderWithProviders(
      <StudioShell>
        <div>Public shell</div>
      </StudioShell>,
      { route: '/help' },
    )

    expect(screen.queryByTitle('Open Settings')).not.toBeInTheDocument()

    const settingsLabels = screen.getAllByText('Settings')
    expect(settingsLabels.length).toBeGreaterThan(0)

    for (const label of settingsLabels) {
      const link = label.closest('a')
      expect(link).not.toBeNull()
      expect(link).toHaveAttribute('href', '/login?next=%2Fsettings')
    }
  })

  it('keeps the signed-in footer minimal and uses calmer sidebar labels', async () => {
    mockState.isAuthenticated = true
    mockState.auth = {
      guest: false,
      identity: {
        display_name: 'valiantlion',
        plan: 'pro',
        owner_mode: true,
        root_admin: false,
        avatar_url: null,
      },
      plan: {
        label: 'Premium',
        monthly_credits: 1200,
        can_generate: true,
      },
      credits: {
        remaining: 240,
        monthly_remaining: 240,
      },
    }

    renderWithProviders(
      <StudioShell>
        <div>Signed shell</div>
      </StudioShell>,
      { route: '/account' },
    )

    expect(await screen.findByText('Subscription')).toBeInTheDocument()
    expect(screen.getByText('Removed')).toBeInTheDocument()
    expect(screen.queryByText(/^Billing$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Trash$/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Owner access')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Open account from profile footer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Open billing from profile footer')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Open FAQ from profile footer')).not.toBeInTheDocument()
  })
})
