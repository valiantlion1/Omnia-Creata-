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
  it('keeps public help focused and routes deeper guidance into the manual', async () => {
    renderWithProviders(<DocumentationPage />, { route: '/help' })

    expect(await screen.findByRole('heading', { name: /everything you need to use studio confidently/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /studio manual/i })).toHaveAttribute('href', '/learn/prompt-craft')
    expect(screen.getByRole('link', { name: /open full terms of service/i })).toHaveAttribute('href', '/legal/terms')
    expect(screen.getByRole('link', { name: /open full privacy policy/i })).toHaveAttribute('href', '/legal/privacy')
    expect(screen.getByRole('link', { name: /open full usage policy/i })).toHaveAttribute('href', '/legal/acceptable-use')
    expect(screen.queryByRole('heading', { name: /writing prompts that actually work/i })).not.toBeInTheDocument()
  })

  it('keeps account guidance aligned with the current shell controls', async () => {
    renderWithProviders(<DocumentationPage />, { route: '/help' })

    expect(await screen.findByText(/recent studio devices that accessed your account/i)).toBeInTheDocument()
    expect(screen.getByText(/there is not a dedicated notifications screen in the studio shell yet/i)).toBeInTheDocument()
    expect(screen.getByText(/settings now gives those same fields a direct edit profile dialog inside general account/i)).toBeInTheDocument()
  })

  it('renders the long-form manual on learn routes', async () => {
    renderWithProviders(<DocumentationPage />, { route: '/learn/prompt-craft' })

    expect((await screen.findAllByRole('heading', { name: /writing prompts that actually work/i })).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /back to help/i })).toHaveAttribute('href', '/help')
    expect(screen.getByText(/^chapter 1$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/tips & hints/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /shortcuts/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /everything you need to use studio confidently/i })).not.toBeInTheDocument()
  })
})
