import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import BillingPage from '@/pages/Billing'
import { server } from '@/test/server'
import { sampleBillingSummary } from '@/test/handlers'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: {
      identity: {
        id: 'test-user',
        email: 'founder@omniacreata.com',
        display_name: 'Founder',
        plan: 'creator',
        workspace_id: 'ws-1',
        root_admin: false,
        owner_mode: false,
      },
    },
    isAuthenticated: true,
  }),
}))

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

describe('BillingPage', () => {
  beforeEach(() => {
    server.use(
      http.get('*/v1/billing/summary', () => HttpResponse.json(sampleBillingSummary)),
    )
  })

  it('renders the public plan catalog and the account credits stat', async () => {
    renderWithProviders(<BillingPage />, { route: '/billing' })

    expect(await screen.findByRole('heading', { name: /your subscription/i })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Creator').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Pro').length).toBeGreaterThan(0)
    })
    expect(await screen.findByText(/420/)).toBeInTheDocument()
  })

  it('surfaces an InlineError with retry when public plans fail to load', async () => {
    let attempts = 0
    server.use(
      http.get('*/v1/public/plans', () => {
        attempts += 1
        if (attempts === 1) return HttpResponse.json({ error: 'plans-down' }, { status: 500 })
        return HttpResponse.json({
          operating_mode: 'public_paid',
          free_account: {
            id: 'free_account',
            entitlement_plan: 'free',
            label: 'Free',
            summary: 'Free tier',
            feature_summary: [],
            price_usd: 0,
            billing_period: null,
            checkout_kind: null,
            recommended: false,
            availability: 'included',
            monthly_credits: 0,
            queue_priority: 'standard',
            max_resolution: '1024x1024',
            share_links: false,
            can_generate: true,
            can_access_chat: false,
          },
          subscriptions: [],
          credit_packs: [],
          wallet: {
            contract: 'v1',
            free_account_can_buy_credit_packs: true,
            image_generation_requires_credits_or_included_allowance: true,
            spend_order: 'included_then_wallet',
            free_image_generation_included: true,
          },
          entitlements: {},
          usage_caps: {
            verified_account_required_for_generation: false,
            captcha_required_for_sensitive_flows: false,
            free_ai_chat_limited: true,
            free_image_generation_included: true,
            wallet_credit_purchase_allowed: true,
            credit_reserve_required_before_generation: true,
          },
          featured_subscription: 'creator',
        })
      }),
    )

    renderWithProviders(<BillingPage />, { route: '/billing' })

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText(/Studio plans unavailable/i)).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }))
    await waitFor(() => {
      expect(screen.queryByText(/Studio plans unavailable/i)).not.toBeInTheDocument()
    })
    expect(attempts).toBeGreaterThanOrEqual(2)
  })

  it('shows an error banner when checkout fails', async () => {
    server.use(
      http.post('*/v1/billing/checkout', () =>
        HttpResponse.json({ detail: 'Paddle rejected the session.' }, { status: 502 }),
      ),
    )

    renderWithProviders(<BillingPage />, { route: '/billing' })

    const upgradeButton = await screen.findByRole('button', { name: /^upgrade now$/i })
    expect(upgradeButton).toBeInTheDocument()
    await userEvent.click(upgradeButton)

    const alerts = await screen.findAllByRole('alert')
    const checkoutAlert = alerts.find((node) => /checkout unavailable/i.test(node.textContent ?? ''))
    expect(checkoutAlert).toBeDefined()
    expect(checkoutAlert).toHaveTextContent(/Paddle rejected the session/i)
  })
})
