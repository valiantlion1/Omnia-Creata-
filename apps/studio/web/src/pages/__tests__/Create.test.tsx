import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import CreatePage from '@/pages/Create'
import { sampleBillingSummary } from '@/test/handlers'
import { renderWithProviders } from '@/test/renderWithProviders'
import { server } from '@/test/server'

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => ({
    auth: {
      identity: {
        id: 'test-user',
        email: 'creator@omniacreata.com',
        display_name: 'Creator',
        plan: 'free',
        workspace_id: 'ws-1',
        root_admin: false,
        owner_mode: false,
        local_access: false,
      },
      guest: false,
      credits: {
        remaining: 24,
      },
      plan: {
        id: 'free',
        can_generate: true,
      },
    },
    isAuthenticated: true,
    isAuthSyncing: false,
    isLoading: false,
  }),
}))

describe('CreatePage model picker', () => {
  beforeEach(() => {
    server.use(
      http.get('*/v1/models', () =>
        HttpResponse.json({
          models: [
            {
              id: 'nano-banana-2',
              label: 'Nano Banana 2',
              description: 'Default 2K Studio lane',
              min_plan: 'free',
              credit_cost: 20,
              estimated_cost: 0.10255,
              max_width: 4096,
              max_height: 4096,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'grok-imagine-pro',
              label: 'Grok Imagine Pro',
              description: 'Cinematic photoreal lane',
              min_plan: 'free',
              credit_cost: 16,
              estimated_cost: 0.07,
              max_width: 2816,
              max_height: 2816,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'flux-2-max',
              label: 'FLUX.2 Max',
              description: 'Highest-end lane',
              min_plan: 'creator',
              credit_cost: 20,
              estimated_cost: 0.16,
              max_width: 2048,
              max_height: 2048,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
          ],
        }),
      ),
      http.get('*/v1/settings/bootstrap', () =>
        HttpResponse.json({
          draft_projects: { compose: 'draft-project-1', chat: 'draft-chat-1' },
        }),
      ),
      http.get('*/v1/generations', () =>
        HttpResponse.json({
          generations: [],
        }),
      ),
      http.get('*/v1/billing/summary', () =>
        HttpResponse.json({
          ...sampleBillingSummary,
          plan: {
            ...sampleBillingSummary.plan,
            id: 'free',
            label: 'Free',
            monthly_credits: 0,
            queue_priority: 'standard',
            share_links: false,
            can_access_chat: false,
          },
          subscription_status: 'none',
          entitlements: {
            ...sampleBillingSummary.entitlements,
            can_access_chat: false,
            premium_chat: false,
          },
          credits: {
            ...sampleBillingSummary.credits,
            remaining: 24,
            gross_remaining: 24,
            monthly_remaining: 0,
            monthly_allowance: 0,
            extra_credits: 24,
            available_to_spend: 24,
          },
          wallet: {
            ...sampleBillingSummary.wallet,
            balance: 24,
            wallet_balance: 24,
            included_monthly_allowance: 0,
            included_monthly_remaining: 0,
            available_to_spend: 24,
          },
          wallet_balance: 24,
          account_tier: 'free',
          subscription_tier: null,
          generation_credit_guide: {
            available_to_spend: 24,
            reserved_total: 0,
            unlimited: false,
            lane_highlights: [],
            models: [
              {
                model_id: 'nano-banana-2',
                label: 'Nano Banana 2',
                pricing_lane: 'standard',
                planned_provider: 'runware',
                estimated_cost: 0.10255,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 20,
                reserved_credit_cost: 20,
                settlement_credit_cost: 20,
                settlement_policy: 'reserve_then_settle',
                affordable_now: true,
                max_startable_jobs_now: 1,
                start_status: 'available',
              },
              {
                model_id: 'grok-imagine-pro',
                label: 'Grok Imagine Pro',
                pricing_lane: 'final',
                planned_provider: 'runware',
                estimated_cost: 0.07,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 16,
                reserved_credit_cost: 16,
                settlement_credit_cost: 16,
                settlement_policy: 'reserve_then_settle',
                affordable_now: true,
                max_startable_jobs_now: 1,
                start_status: 'available',
              },
              {
                model_id: 'flux-2-max',
                label: 'FLUX.2 Max',
                pricing_lane: 'final',
                planned_provider: 'runware',
                estimated_cost: 0.16,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 20,
                reserved_credit_cost: 20,
                settlement_credit_cost: 20,
                settlement_policy: 'reserve_then_settle',
                affordable_now: true,
                max_startable_jobs_now: 1,
                start_status: 'available',
              },
            ],
          },
        }),
      ),
    )
  })

  it('shows model family names and unlocks higher-tier models when wallet credits are available', async () => {
    renderWithProviders(<CreatePage />, { route: '/create' })

    await waitFor(() => {
      expect(screen.getAllByText('Nano Banana 2').length).toBeGreaterThan(0)
    })
    expect(screen.getByText(/prompt, preview, and generate/i)).toBeInTheDocument()
    expect(screen.queryByText(/^finish$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Live result set/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Recent Create sessions/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('create-preview-surface')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /model/i }))

    expect(screen.getByText('Grok Imagine Pro')).toBeInTheDocument()
    expect(screen.getByText('FLUX.2 Max')).toBeInTheDocument()
    expect(screen.getAllByText(/20 credits/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/nano-banana-2/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\[klein\]|\[max\]/i)).not.toBeInTheDocument()

    const premiumModelButton = screen.getByText(/^credit unlock$/i).closest('button')
    expect(premiumModelButton).not.toBeDisabled()
    expect(screen.queryByText(/^locked$/i)).not.toBeInTheDocument()
  })

  it('restores session settings from history and hides stale preview tiles when variation count changes', async () => {
    const historySession = {
      job_id: 'gen-history-4',
      title: 'Atmospheric alley',
      display_title: 'Atmospheric alley',
      status: 'failed',
      session_status: 'failed',
      library_state: 'failed',
      project_id: 'draft-project-1',
      provider: 'runware',
      provider_rollout_tier: 'primary',
      provider_billable: true,
      model: 'nano-banana-2',
      display_model_label: 'Nano Banana 2',
      prompt_snapshot: {
        prompt: 'A cinematic alley scene at dusk',
        negative_prompt: 'low quality',
        model: 'nano-banana-2',
        workflow: 'text_to_image',
        reference_asset_id: null,
        width: 1344,
        height: 768,
        steps: 28,
        cfg_scale: 6.5,
        seed: 123456,
        aspect_ratio: '16:9',
      },
      pricing_lane: 'draft',
      estimated_cost: 0.001,
      estimated_cost_source: 'provider_quote',
      actual_cost_usd: null,
      credit_cost: 80,
      reserved_credit_cost: 80,
      final_credit_cost: null,
      credit_charge_policy: 'reserve_then_settle',
      credit_status: 'released',
      output_count: 4,
      outputs: [],
      slots: [
        { slot_index: 0, slot_status: 'failed', moderation_outcome: 'allowed', error_code: 'provider_auth', refund_state: 'refunded', output: null },
        { slot_index: 1, slot_status: 'failed', moderation_outcome: 'allowed', error_code: 'provider_auth', refund_state: 'refunded', output: null },
        { slot_index: 2, slot_status: 'failed', moderation_outcome: 'allowed', error_code: 'provider_auth', refund_state: 'refunded', output: null },
        { slot_index: 3, slot_status: 'failed', moderation_outcome: 'allowed', error_code: 'provider_auth', refund_state: 'refunded', output: null },
      ],
      error: 'This render lane is temporarily unavailable.',
      error_code: 'provider_auth',
      attempt_count: 1,
      created_at: '2026-04-21T12:00:00Z',
      started_at: '2026-04-21T12:00:02Z',
      last_heartbeat_at: '2026-04-21T12:00:04Z',
      completed_at: '2026-04-21T12:00:10Z',
    }

    server.use(
      http.get('*/v1/generations', () =>
        HttpResponse.json({
          generations: [historySession],
        }),
      ),
      http.get('*/v1/generations/:generationId', ({ params }) => {
        if (params.generationId === historySession.job_id) {
          return HttpResponse.json(historySession)
        }
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 })
      }),
    )

    renderWithProviders(<CreatePage />, { route: '/create' })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /history/i }))
    await userEvent.click(screen.getByRole('button', { name: /a cinematic alley scene at dusk/i }))

    await waitFor(() => {
      expect(screen.getByTestId('create-preview-surface')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /advanced/i }))

    const variationSlider = screen.getByRole('slider', { name: /variations/i })
    expect(variationSlider).toHaveValue('4')

    fireEvent.change(variationSlider, { target: { value: '2' } })

    await waitFor(() => {
      expect(screen.queryByText(/Atmospheric alley/i)).not.toBeInTheDocument()
    })
  })
})
