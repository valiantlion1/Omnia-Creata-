import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()
const signUpMock = vi.fn()
const signInWithProviderMock = vi.fn()

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
    signUp: signUpMock,
    signInWithProvider: signInWithProviderMock,
  }),
}))

vi.mock('@/components/TurnstileWidget', () => ({
  TurnstileWidget: () => null,
}))

import SignupPage from '@/pages/Signup'
import { APP_BUILD_LABEL, APP_VERSION_LABEL } from '@/lib/appVersion'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('SignupPage', () => {
  afterEach(() => {
    navigateMock.mockReset()
    signUpMock.mockReset()
    signInWithProviderMock.mockReset()
  })

  it('sends new accounts directly into Create after email signup', async () => {
    signUpMock.mockResolvedValueOnce(undefined)

    renderWithProviders(<SignupPage />, { route: '/signup' })

    await userEvent.type(screen.getByLabelText(/^name$/i), 'Founder')
    await userEvent.type(screen.getByLabelText(/username/i), 'founder')
    await userEvent.type(screen.getByLabelText(/^email$/i), 'founder@omniacreata.com')
    await userEvent.type(screen.getByLabelText(/^password$/i), 'correct-password')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct-password')
    await userEvent.click(screen.getByRole('checkbox', { name: /terms/i }))
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(signUpMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/create?welcome=1', { replace: true })
  })

  it('starts Google signup with the Create welcome destination', async () => {
    signInWithProviderMock.mockResolvedValueOnce(undefined)

    renderWithProviders(<SignupPage />, { route: '/signup' })

    await userEvent.click(screen.getByRole('button', { name: /^google$/i }))

    expect(signInWithProviderMock).toHaveBeenCalledWith('google', '/create?welcome=1')
  })

  it('opens legal documents in a centered dialog without leaving signup', async () => {
    renderWithProviders(<SignupPage />, { route: '/signup' })

    await userEvent.click(screen.getByRole('button', { name: /privacy policy/i }))

    expect(screen.getByText(/legal documents/i)).toBeInTheDocument()
    expect(screen.getByText(/the agreement stays readable in one centered document surface/i)).toBeInTheDocument()
    expect(screen.getByTitle(/privacy policy/i)).toHaveAttribute('src', '/legal/privacy?embed=1')
  })

  it('shows version info in the signup footer without the cookie preferences shortcut', () => {
    renderWithProviders(<SignupPage />, { route: '/signup' })

    expect(screen.queryByRole('button', { name: /cookie preferences/i })).not.toBeInTheDocument()
    expect(screen.getByText(APP_VERSION_LABEL)).toBeInTheDocument()
    expect(screen.getByText(`build ${APP_BUILD_LABEL}`)).toBeInTheDocument()
  })
})
