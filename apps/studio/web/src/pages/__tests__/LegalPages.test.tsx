import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: null,
    isAuthenticated: false,
    isAuthSyncing: false,
    isLoading: false,
  }),
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import TermsPage from '@/pages/legal/Terms'
import AcceptableUsePage from '@/pages/legal/AcceptableUse'
import CookiesPage from '@/pages/legal/Cookies'
import PrivacyPage from '@/pages/legal/Privacy'
import RefundsPage from '@/pages/legal/Refunds'
import { renderWithProviders } from '@/test/renderWithProviders'

const LEGAL_PAGE_CASES = [
  { Page: TermsPage, route: '/legal/terms', heading: /terms of service/i },
  { Page: PrivacyPage, route: '/legal/privacy', heading: /privacy policy/i },
  { Page: RefundsPage, route: '/legal/refunds', heading: /refund policy/i },
  { Page: AcceptableUsePage, route: '/legal/acceptable-use', heading: /acceptable use policy/i },
  { Page: CookiesPage, route: '/legal/cookies', heading: /cookie policy/i },
] as const

describe('Legal pages', () => {
  it('renders resolved legal placeholders and the refund policy route in navigation', async () => {
    renderWithProviders(<TermsPage />, { route: '/legal/terms' })

    expect(await screen.findByRole('heading', { name: /terms of service/i })).toBeInTheDocument()
    expect(screen.getAllByText(/founder-operated prelaunch service/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Omnia Creata Legal Entity Name/i)).not.toBeInTheDocument()
    expect(screen.getByText(/prelaunch disclosure/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /refund policy/i })).toHaveAttribute('href', '/legal/refunds')
  })

  it.each(LEGAL_PAGE_CASES)('renders %s without encoded copy artifacts', async ({ Page, route, heading }) => {
    const { container, unmount } = renderWithProviders(<Page />, { route })

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()

    const text = container.textContent ?? ''
    expect(text).not.toContain('&ldquo;')
    expect(text).not.toContain('&rdquo;')
    expect(text).not.toContain('&rsquo;')
    expect(text).not.toContain('â€')
    expect(text).not.toContain('Ã')
    expect(text).not.toContain('Â')

    unmount()
  })
})
