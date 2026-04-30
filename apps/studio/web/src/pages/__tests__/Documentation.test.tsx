import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'

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

function renderDocumentation(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/help" element={<DocumentationPage />} />
      <Route path="/help/:sectionId" element={<DocumentationPage />} />
      <Route path="/learn" element={<DocumentationPage />} />
      <Route path="/learn/:sectionId" element={<DocumentationPage />} />
      <Route path="/docs" element={<DocumentationPage />} />
      <Route path="/docs/:sectionId" element={<DocumentationPage />} />
    </Routes>,
    { route },
  )
}

function expectLinkTarget(name: RegExp, href: string) {
  expect(
    screen
      .getAllByRole('link', { name })
      .some((link) => link.getAttribute('href') === href),
  ).toBe(true)
}

describe('DocumentationPage', () => {
  it('keeps public help focused and routes deeper guidance into the manual', async () => {
    renderDocumentation('/help')

    expect(await screen.findByRole('heading', { level: 1, name: /your first hour in studio/i })).toBeInTheDocument()
    expectLinkTarget(/studio manual/i, '/learn/prompt-craft')
    expectLinkTarget(/billing/i, '/help/billing')
    expectLinkTarget(/account/i, '/help/account')
    expectLinkTarget(/safety/i, '/help/safety')
    expect(screen.queryByRole('heading', { name: /writing prompts that actually work/i })).not.toBeInTheDocument()
  })

  it('keeps account guidance aligned with the current shell controls', async () => {
    renderDocumentation('/help/account')

    expect(await screen.findByRole('heading', { level: 1, name: /your account and data/i })).toBeInTheDocument()
    expect(await screen.findByText(/recent devices that accessed your account/i)).toBeInTheDocument()
    expect(screen.getByText(/use the unsubscribe link in those emails to opt out/i)).toBeInTheDocument()
    expect(screen.getByText(/edit your display name, bio, default visibility, and featured profile artwork from account or settings/i)).toBeInTheDocument()
  })

  it('renders the long-form manual on learn routes', async () => {
    renderDocumentation('/learn/prompt-craft')

    expect((await screen.findAllByRole('heading', { name: /writing prompts that actually work/i })).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /back to help/i })).toHaveAttribute('href', '/help')
    expect(screen.getByText(/^topic 1$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/tips & hints/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /shortcuts/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /everything you need to use studio confidently/i })).not.toBeInTheDocument()
  })
})
