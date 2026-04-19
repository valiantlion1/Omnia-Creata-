import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockState = vi.hoisted(() => ({
  updateMyProfile: vi.fn(),
  getSettingsBootstrap: vi.fn().mockResolvedValue({
    active_sessions: {
      current_session_id: 'session-current',
      session_count: 2,
      other_session_count: 1,
      can_sign_out_others: true,
      sessions: [
        {
          id: 'session-current',
          session_id: 'session-current',
          device_label: 'Chrome on Windows',
          browser_label: 'Chrome',
          os_label: 'Windows',
          display_mode: 'browser',
          surface_label: 'Browser',
          network_label: 'Local development',
          current: true,
          first_seen_at: '2026-04-19T00:00:00Z',
          last_seen_at: '2026-04-19T00:05:00Z',
        },
        {
          id: 'session-other',
          session_id: 'session-other',
          device_label: 'Android app',
          browser_label: 'Chrome',
          os_label: 'Android',
          display_mode: 'standalone',
          surface_label: 'Installed app',
          network_label: '95.10.*.*',
          current: false,
          first_seen_at: '2026-04-18T20:00:00Z',
          last_seen_at: '2026-04-19T00:01:00Z',
        },
      ],
    },
  }),
  getHealth: vi.fn().mockResolvedValue({ status: 'healthy', providers: [] }),
  getHealthDetail: vi.fn().mockResolvedValue({ status: 'healthy', providers: [] }),
  updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
  endOtherSettingsSessions: vi.fn().mockResolvedValue({
    current_session_id: 'session-current',
    session_count: 1,
    other_session_count: 0,
    can_sign_out_others: false,
    sessions: [
      {
        id: 'session-current',
        session_id: 'session-current',
        device_label: 'Chrome on Windows',
        browser_label: 'Chrome',
        os_label: 'Windows',
        display_mode: 'browser',
        surface_label: 'Browser',
        network_label: 'Local development',
        current: true,
        first_seen_at: '2026-04-19T00:00:00Z',
        last_seen_at: '2026-04-19T00:05:00Z',
      },
    ],
  }),
  signOut: vi.fn(),
  signOutScopes: vi.fn().mockResolvedValue({ error: null }),
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
      bio: '',
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
    endOtherSettingsSessions: mockState.endOtherSettingsSessions,
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
      signOut: mockState.signOutScopes,
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
    mockState.endOtherSettingsSessions.mockClear()
    mockState.signOut.mockReset()
    mockState.signOutScopes.mockClear()
    mockState.openPreferences.mockReset()
    mockState.signOutScopes.mockResolvedValue({ error: null })
    mockState.auth.identity.display_name = 'Creator'
    mockState.auth.identity.username = 'creator'
    mockState.auth.identity.bio = ''
    mockState.auth.identity.default_visibility = 'public'
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
    await userEvent.click(screen.getByRole('button', { name: /manage sign-in/i }))

    expect(screen.getByText(/Sign-in & password/i)).toBeInTheDocument()
    expect(screen.getByText(/This account signs in with Google/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Google security/i })).toHaveAttribute('href', 'https://myaccount.google.com/security')
  })

  it('opens the settings profile editor and saves real profile fields', async () => {
    mockState.updateMyProfile.mockResolvedValue({ profile: {}, posts: [], own_profile: true, can_edit: true })

    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /edit profile/i }))

    expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument()

    const displayNameInput = screen.getByLabelText(/display name/i)
    await userEvent.clear(displayNameInput)
    await userEvent.type(displayNameInput, 'Creator Prime')
    await userEvent.type(screen.getByLabelText(/bio/i), ' Makes cinematic portraits. ')
    await userEvent.click(screen.getByRole('button', { name: /^private$/i }))
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockState.updateMyProfile).toHaveBeenCalledWith({
        display_name: 'Creator Prime',
        bio: 'Makes cinematic portraits.',
        default_visibility: 'private',
      })
    })
  })

  it('updates email-password credentials from the sign-in dialog', async () => {
    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /privacy/i }))
    await userEvent.click(screen.getByRole('button', { name: /manage sign-in/i }))
    await userEvent.type(screen.getByLabelText(/New password/i), 'NewPassword1!')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'NewPassword1!')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() => {
      expect(mockState.updateUser).toHaveBeenCalledWith({ password: 'NewPassword1!' })
    })
  })

  it('shows recent Studio devices and signs out other sessions', async () => {
    renderWithProviders(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: /privacy/i }))
    await userEvent.click(screen.getByRole('button', { name: /manage sessions/i }))

    expect(screen.getByRole('heading', { name: /active sessions/i })).toBeInTheDocument()
    expect(screen.getByText(/Chrome on Windows/i)).toBeInTheDocument()
    expect(screen.getByText(/Android app/i)).toBeInTheDocument()
    expect(screen.getAllByText(/This device/i).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: /sign out other devices/i }))

    await waitFor(() => {
      expect(mockState.signOutScopes).toHaveBeenCalledWith({ scope: 'others' })
      expect(mockState.endOtherSettingsSessions).toHaveBeenCalledTimes(1)
    })
  })
})
