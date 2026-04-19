import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockState = vi.hoisted(() => ({
  updateMyProfile: vi.fn(),
  getSettingsBootstrap: vi.fn().mockResolvedValue({}),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', providers: [] }),
  getHealthDetail: vi.fn().mockResolvedValue({ status: 'healthy', providers: [] }),
  updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
  signOut: vi.fn(),
  openPreferences: vi.fn(),
  setTipsEnabled: vi.fn(),
  setTheme: vi.fn(),
  resetTips: vi.fn(),
  auth: {
    guest: false,
    identity: {
      id: 'user-1',
      email: 'creator@omniacreata.com',
      display_name: 'Creator',
      username: 'creator',
      plan: 'free',
      workspace_id: 'ws-user-1',
      owner_mode: false,
      root_admin: false,
      default_visibility: 'public',
      auth_provider: 'email',
      auth_providers: ['email'],
      credentials_managed_by_provider: false,
    },
    credits: {
      remaining: 50,
      monthly_remaining: 50,
      extra_credits: 0,
    },
    plan: {
      id: 'free',
      label: 'Free',
      monthly_credits: 50,
      queue_priority: 'standard',
      max_resolution: '1024x1024',
      share_links: false,
      can_generate: true,
      can_access_chat: false,
    },
  },
}))

vi.mock('@/lib/studioApi', () => ({
  studioApi: {
    getSettingsBootstrap: mockState.getSettingsBootstrap,
    getHealth: mockState.getHealth,
    getHealthDetail: mockState.getHealthDetail,
    updateMyProfile: mockState.updateMyProfile,
    exportProfile: vi.fn(),
  },
}))

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: mockState.auth,
    isAuthenticated: true,
    isLoading: false,
    signOut: mockState.signOut,
  }),
}))

vi.mock('@/lib/studioCookiePreferences', () => ({
  getCookiePreferenceSummary: () => 'Not decided yet',
  StudioCookiePreferencesProvider: ({ children }: { children: unknown }) => children,
  useStudioCookiePreferences: () => ({
    preferences: { analytics: false },
    openPreferences: mockState.openPreferences,
  }),
}))

vi.mock('@/lib/studioUi', () => ({
  THEME_OPTIONS: [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
  ],
  useStudioUiPrefs: () => ({
    prefs: { tipsEnabled: true, theme: 'system' },
    setTipsEnabled: mockState.setTipsEnabled,
    setTheme: mockState.setTheme,
    resetTips: mockState.resetTips,
  }),
}))

vi.mock('@/lib/supabaseBrowser', () => ({
  supabaseBrowser: {
    auth: {
      updateUser: mockState.updateUser,
    },
  },
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import SettingsPage from '@/pages/Settings'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('SettingsPage credentials flow', () => {
  afterEach(() => {
    mockState.updateMyProfile.mockReset()
    mockState.getSettingsBootstrap.mockClear()
    mockState.getHealth.mockClear()
    mockState.getHealthDetail.mockClear()
    mockState.updateUser.mockReset()
    mockState.signOut.mockReset()
    mockState.openPreferences.mockReset()
    mockState.auth.identity.display_name = 'Creator'
    mockState.auth.identity.username = 'creator'
    mockState.auth.identity.auth_provider = 'email'
    mockState.auth.identity.auth_providers = ['email']
    mockState.auth.identity.credentials_managed_by_provider = false
  })

  it('shows provider-managed messaging for Google accounts', async () => {
    mockState.auth.identity.auth_provider = 'google'
    mockState.auth.identity.auth_providers = ['google']
    mockState.auth.identity.credentials_managed_by_provider = true

    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /privacy/i }))
    await userEvent.click(screen.getByRole('button', { name: /manage profile/i }))

    expect(screen.getByText(/Profile and sign-in/i)).toBeInTheDocument()
    expect(screen.getAllByText('@creator').length).toBeGreaterThan(0)
    expect(screen.getByText(/This account signs in with Google/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Google security/i })).toHaveAttribute('href', 'https://myaccount.google.com/security')
  })

  it('saves display name changes and updates email-password credentials', async () => {
    mockState.updateMyProfile.mockResolvedValue({ profile: {}, posts: [], own_profile: true, can_edit: true })

    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /privacy/i }))
    await userEvent.click(screen.getByRole('button', { name: /manage profile/i }))

    const displayNameInput = screen.getByLabelText(/Display name/i)
    await userEvent.clear(displayNameInput)
    await userEvent.type(displayNameInput, 'Creator Prime')
    await userEvent.click(screen.getByRole('button', { name: /save display name/i }))

    await waitFor(() => {
      expect(mockState.updateMyProfile).toHaveBeenCalledWith({ display_name: 'Creator Prime' })
    })

    await userEvent.type(screen.getByLabelText(/New password/i), 'NewPassword1!')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'NewPassword1!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(mockState.updateUser).toHaveBeenCalledWith({ password: 'NewPassword1!' })
    })
  })
})
