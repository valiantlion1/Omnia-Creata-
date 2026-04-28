import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const listPublicPostsMock = vi.fn().mockResolvedValue({ posts: [] })

vi.mock('@/lib/studioApi', () => ({
  studioApi: {
    listPublicPosts: (...args: unknown[]) => listPublicPostsMock(...args),
    likePost: vi.fn(),
    unlikePost: vi.fn(),
  },
}))

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

import DashboardPage from '@/pages/Dashboard'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('DashboardPage', () => {
  it('renders showcase as a curated gallery with a selected-reference inspector', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<DashboardPage />, { route: '/explore' })

    await user.click(screen.getByRole('button', { name: /^showcase$/i }))

    expect(await screen.findByTestId('showcase-grid')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select cyberpunk showcase piece/i })).toBeInTheDocument()
    expect(screen.getByTestId('curated-inspector')).toHaveTextContent('Cyberpunk')

    await user.click(screen.getByRole('button', { name: /select anime showcase piece/i }))
    expect(screen.getByTestId('curated-inspector')).toHaveTextContent('Anime')

    await user.click(screen.getByRole('button', { name: /close details panel/i }))
    expect(screen.queryByTestId('curated-inspector')).not.toBeInTheDocument()
    expect(screen.getByTestId('curated-inspector-collapsed')).toHaveTextContent('Details closed')

    await user.click(screen.getByRole('button', { name: /select cel shading showcase piece/i }))
    expect(screen.getByTestId('curated-inspector')).toHaveTextContent('Cel shading')

    const layouts = new Set(
      Array.from(container.querySelectorAll('[data-showcase-layout]'))
        .map((node) => node.getAttribute('data-showcase-layout'))
        .filter(Boolean),
    )

    expect(layouts.has('hero')).toBe(true)
    expect(layouts.has('landscape')).toBe(true)
    expect(layouts.has('portrait')).toBe(true)
    expect(layouts.has('softPortrait')).toBe(true)
    expect(layouts.has('detail')).toBe(true)
  })
})
