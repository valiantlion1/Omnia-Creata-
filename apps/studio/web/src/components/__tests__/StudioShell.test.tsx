import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: null,
    isAuthenticated: false,
    isAuthSyncing: false,
    isLoading: false,
    signOut: vi.fn(),
  }),
}))

import StudioShell from '@/components/StudioShell'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('StudioShell', () => {
  it('routes guest settings open actions through login intent', () => {
    renderWithProviders(
      <StudioShell>
        <div>Public shell</div>
      </StudioShell>,
      { route: '/help' },
    )

    const openSettingsLinks = screen.getAllByTitle('Open Settings')
    expect(openSettingsLinks.length).toBeGreaterThan(0)

    for (const link of openSettingsLinks) {
      expect(link).toHaveAttribute('href', '/login?next=%2Fsettings')
    }
  })
})
