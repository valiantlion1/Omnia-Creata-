import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import ChatPage from '@/pages/Chat'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: {
      identity: {
        id: 'guest',
        email: '',
        display_name: 'Guest',
        plan: 'guest',
        workspace_id: null,
        guest: true,
      },
      guest: true,
    },
    isAuthenticated: false,
    isAuthSyncing: false,
    isLoading: false,
  }),
}))

vi.mock('@/lib/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

describe('ChatPage (guest mode)', () => {
  it('renders the paid-plan gate and a signup CTA for guests', () => {
    renderWithProviders(<ChatPage />, { route: '/chat' })

    expect(
      screen.getByRole('heading', { name: /chat unlocks on essential and premium/i }),
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /create account/i })
    expect(cta).toHaveAttribute('href', '/signup')
  })
})
