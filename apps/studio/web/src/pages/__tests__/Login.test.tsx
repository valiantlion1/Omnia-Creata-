import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()
const signInMock = vi.fn()
const consumeRedirectAfterAuthMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    isAuthenticated: false,
    signIn: signInMock,
    signInWithProvider: vi.fn(),
    completeOAuthSignIn: vi.fn().mockResolvedValue(undefined),
    consumeRedirectAfterAuth: consumeRedirectAfterAuthMock,
  }),
}))

vi.mock('@/components/TurnstileWidget', () => ({
  TurnstileWidget: () => null,
}))

import LoginPage from '@/pages/Login'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('LoginPage', () => {
  afterEach(() => {
    navigateMock.mockReset()
    signInMock.mockReset()
    consumeRedirectAfterAuthMock.mockReset()
  })

  it('prefers the explicit next param over a stale stored redirect after password login', async () => {
    signInMock.mockResolvedValueOnce(undefined)
    consumeRedirectAfterAuthMock.mockReturnValueOnce('/explore')

    renderWithProviders(<LoginPage />, { route: '/login?next=%2Fsubscription' })

    await userEvent.type(screen.getByLabelText(/email/i), 'founder@omniacreata.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'correct-password')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(signInMock).toHaveBeenCalledTimes(1)
    expect(consumeRedirectAfterAuthMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/subscription', { replace: true })
  })

  it('renders the friendly error message when signIn rejects', async () => {
    signInMock.mockRejectedValueOnce(new Error('Invalid email or password.'))

    renderWithProviders(<LoginPage />, { route: '/login' })

    await userEvent.type(screen.getByLabelText(/email/i), 'founder@omniacreata.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/Invalid email or password/i)).toBeInTheDocument()
    expect(signInMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to a generic message when signIn throws a non-Error value', async () => {
    signInMock.mockRejectedValueOnce('network down')

    renderWithProviders(<LoginPage />, { route: '/login' })

    await userEvent.type(screen.getByLabelText(/email/i), 'founder@omniacreata.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'pw')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    expect(await screen.findByText(/Unable to log in right now/i)).toBeInTheDocument()
  })
})
