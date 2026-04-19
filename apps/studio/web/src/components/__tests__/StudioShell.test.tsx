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
})
