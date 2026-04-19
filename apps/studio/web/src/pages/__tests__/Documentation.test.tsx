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

import DocumentationPage from '@/pages/Documentation'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('DocumentationPage', () => {
  it('keeps legal summaries short and points to the canonical legal routes', async () => {
    renderWithProviders(<DocumentationPage />, { route: '/help' })

    expect(await screen.findByRole('heading', { name: /everything you need to use studio confidently/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open full terms of service/i })).toHaveAttribute('href', '/legal/terms')
    expect(screen.getByRole('link', { name: /open full privacy policy/i })).toHaveAttribute('href', '/legal/privacy')
    expect(screen.getByRole('link', { name: /open full usage policy/i })).toHaveAttribute('href', '/legal/acceptable-use')
    expect(screen.queryByText(/1\. who this agreement is with/i)).not.toBeInTheDocument()
  })

  it('keeps account guidance aligned with the current shell controls', async () => {
    renderWithProviders(<DocumentationPage />, { route: '/help' })

    expect(await screen.findByText(/device session management is not exposed in the studio shell yet/i)).toBeInTheDocument()
    expect(screen.getByText(/there is not a dedicated notifications screen in the studio shell yet/i)).toBeInTheDocument()
    expect(screen.getByText(/settings > privacy & security includes an archive export/i)).toBeInTheDocument()
    expect(screen.queryByText(/account -> notifications/i)).not.toBeInTheDocument()
  })
})
