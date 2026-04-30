import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

const posthogClient = {
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  stopSessionRecording: vi.fn(),
}

vi.mock('posthog-js', () => ({
  default: posthogClient,
}))

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { CookiePreferencesDialog } from '@/components/CookiePreferences'
import { LegalFooter } from '@/components/StudioPrimitives'
import { COOKIE_PREFERENCES_KEY } from '@/lib/studioCookiePreferences'
import { renderWithProviders } from '@/test/renderWithProviders'

type AppModule = typeof import('@/App')
type CookiePreferencesModule = typeof import('@/lib/studioCookiePreferences')

describe('Cookie preferences', () => {
  let PostHogBoundary: AppModule['PostHogBoundary']
  let resetPostHogBootstrapPromiseForTests: AppModule['resetPostHogBootstrapPromiseForTests']
  let StudioCookiePreferencesProvider: CookiePreferencesModule['StudioCookiePreferencesProvider']
  let useStudioCookiePreferences: CookiePreferencesModule['useStudioCookiePreferences']

  beforeEach(async () => {
    vi.resetModules()
    window.localStorage.clear()
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_cookie_controls')
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://telemetry.example.test')

    const cookiePreferencesModule = await import('@/lib/studioCookiePreferences')
    StudioCookiePreferencesProvider = cookiePreferencesModule.StudioCookiePreferencesProvider
    useStudioCookiePreferences = cookiePreferencesModule.useStudioCookiePreferences

    const appModule = await import('@/App')
    PostHogBoundary = appModule.PostHogBoundary
    resetPostHogBootstrapPromiseForTests = appModule.resetPostHogBootstrapPromiseForTests
    resetPostHogBootstrapPromiseForTests()
    posthogClient.init.mockClear()
    posthogClient.opt_in_capturing.mockClear()
    posthogClient.opt_out_capturing.mockClear()
    posthogClient.stopSessionRecording.mockClear()
  })

  afterEach(() => {
    resetPostHogBootstrapPromiseForTests()
    vi.unstubAllEnvs()
  })

  it('reopens cookie preferences from the footer and saves the new choice', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <>
        <CookiePreferencesDialog analyticsAvailable />
        <LegalFooter />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /cookie preferences/i }))

    expect(screen.getByRole('dialog', { name: /cookie preferences/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /accept optional/i }))

    expect(JSON.parse(window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? '{}')).toMatchObject({
      analytics: true,
      version: 1,
    })
    expect(screen.queryByRole('dialog', { name: /cookie preferences/i })).not.toBeInTheDocument()
  })

  it('saves draft choices from the preferences switch', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <>
        <CookiePreferencesDialog analyticsAvailable />
        <LegalFooter />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /cookie preferences/i }))
    await user.click(screen.getByRole('switch', { name: /optional analytics/i }))
    await user.click(screen.getByRole('button', { name: /save choices/i }))

    expect(JSON.parse(window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? '{}')).toMatchObject({
      analytics: true,
      version: 1,
    })
    expect(screen.queryByRole('dialog', { name: /cookie preferences/i })).not.toBeInTheDocument()
  })

  it('does not show a dead accept control when analytics are unavailable', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <>
        <CookiePreferencesDialog analyticsAvailable={false} />
        <LegalFooter />
      </>,
    )

    await user.click(screen.getByRole('button', { name: /cookie preferences/i }))

    expect(screen.queryByRole('switch', { name: /optional analytics/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /accept optional/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save choices/i }))

    expect(JSON.parse(window.localStorage.getItem(COOKIE_PREFERENCES_KEY) ?? '{}')).toMatchObject({
      analytics: false,
      version: 1,
    })
    expect(screen.queryByRole('dialog', { name: /cookie preferences/i })).not.toBeInTheDocument()
  })

  it('changes the live PostHog client when consent is granted and later revoked', async () => {
    const user = userEvent.setup()

    function PreferenceHarness() {
      const { setAnalyticsConsent } = useStudioCookiePreferences()

      return (
        <div>
          <button type="button" onClick={() => setAnalyticsConsent(true)}>
            Allow now
          </button>
          <button type="button" onClick={() => setAnalyticsConsent(false)}>
            Essential now
          </button>
        </div>
      )
    }

    render(
      <StudioCookiePreferencesProvider>
        <PostHogBoundary>
          <PreferenceHarness />
        </PostHogBoundary>
      </StudioCookiePreferencesProvider>,
    )

    await user.click(screen.getByRole('button', { name: /allow now/i }))

    await waitFor(() => expect(posthogClient.init).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(posthogClient.opt_in_capturing).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /essential now/i }))

    await waitFor(() => expect(posthogClient.stopSessionRecording).toHaveBeenCalled())
    await waitFor(() => expect(posthogClient.opt_out_capturing).toHaveBeenCalled())
  })
})
