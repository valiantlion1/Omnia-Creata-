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
    expect(screen.getAllByText(/omnia creata, a founder-operated service/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Omnia Creata Legal Entity Name/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/business status/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /refund policy/i })).toHaveAttribute('href', '/legal/refunds')
  })

  it.each(LEGAL_PAGE_CASES)('renders %s without encoded copy artifacts', async ({ Page, route, heading }) => {
    const { container, unmount } = renderWithProviders(<Page />, { route })

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()

    const text = container.textContent ?? ''
    expect(text).not.toContain('&ldquo;')
    expect(text).not.toContain('&rdquo;')
    expect(text).not.toContain('&rsquo;')
    expect(text).not.toMatch(/\u00c3\u00a2\u00e2\u201a\u00ac/)
    expect(text).not.toMatch(/\u00c3\u0192/)
    expect(text).not.toMatch(/\u00c3\u201a/)

    expect(text).not.toMatch(/[\u00c2\u00e2\u00c3\ufffd]/)

    unmount()
  })

  it('keeps the cookie policy at category level instead of exposing internal storage names', async () => {
    const { container } = renderWithProviders(<CookiesPage />, { route: '/legal/cookies' })

    expect(await screen.findByRole('heading', { name: /cookie policy/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /browser storage overview/i })).toBeInTheDocument()

    const text = container.textContent ?? ''
    expect(text).not.toMatch(/oc_session|oc_csrf|oc_consent|oc_theme|oc_locale|oc_analytics_id/i)
    expect(text).not.toMatch(/analytics_provider_\*|paddle_\*/i)
    expect(text).not.toMatch(/cross-site request forgery|DDoS protection|Cookie inventory/i)
  })
})
