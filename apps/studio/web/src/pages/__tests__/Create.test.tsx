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
          default_model_id: 'gpt-image-2',
          launch_model_ids: [
            'gpt-image-2',
            'nano-banana',
            'nano-banana-2',
            'grok-imagine-image-pro',
            'wan-2-7-image-pro',
            'flux-2-max',
          ],
          models: [
            {
              id: 'gpt-image-2',
              label: 'GPT Image 2',
              description: 'Modern base lane',
              min_plan: 'free',
              credit_cost: 80,
              estimated_cost: 0.006,
              max_width: 1536,
              max_height: 1536,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'nano-banana',
              label: 'Nano Banana',
              description: 'Everyday polish lane',
              min_plan: 'free',
              credit_cost: 140,
              estimated_cost: 0.039,
              max_width: 1536,
              max_height: 1536,
              featured: false,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'nano-banana-2',
              label: 'Nano Banana 2',
              description: 'Premium polish lane',
              min_plan: 'creator',
              credit_cost: 220,
              estimated_cost: 0.069,
              max_width: 2048,
              max_height: 2048,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'grok-imagine-image-pro',
              label: 'Grok Imagine Image Pro',
              description: 'Image Pro lane',
              min_plan: 'creator',
              credit_cost: 220,
              estimated_cost: 0.07,
              max_width: 2048,
              max_height: 2048,
              featured: true,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'wan-2-7-image-pro',
              label: 'Wan 2.7 Image Pro',
              description: 'Wan Image Pro lane',
              min_plan: 'pro',
              credit_cost: 240,
              estimated_cost: 0.075,
              max_width: 2048,
              max_height: 2048,
              featured: false,
              runtime: 'cloud',
              owner_only: false,
              provider_hint: 'runware',
            },
            {
              id: 'flux-2-max',
              label: 'FLUX.2 Max',
              description: 'Strongest FLUX lane',
              min_plan: 'pro',
              credit_cost: 240,
              estimated_cost: 0.07,
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
            remaining: 240,
            gross_remaining: 240,
            monthly_remaining: 0,
            monthly_allowance: 0,
            extra_credits: 240,
            available_to_spend: 240,
          },
          wallet: {
            ...sampleBillingSummary.wallet,
            balance: 240,
            wallet_balance: 240,
            included_monthly_allowance: 0,
            included_monthly_remaining: 0,
            available_to_spend: 240,
          },
          wallet_balance: 240,
          account_tier: 'free',
          subscription_tier: null,
          generation_credit_guide: {
            available_to_spend: 240,
            reserved_total: 0,
            unlimited: false,
            lane_highlights: [],
            models: [
              {
                model_id: 'gpt-image-2',
                label: 'GPT Image 2',
                pricing_lane: 'draft',
                planned_provider: 'runware',
                estimated_cost: 0.006,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 80,
                reserved_credit_cost: 80,
                settlement_credit_cost: 80,
                settlement_policy: 'reserve_then_settle',
                affordable_now: true,
                max_startable_jobs_now: 3,
                start_status: 'available',
              },
              {
                model_id: 'nano-banana',
                label: 'Nano Banana',
                pricing_lane: 'standard',
                planned_provider: 'runware',
                estimated_cost: 0.039,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 140,
                reserved_credit_cost: 140,
                settlement_credit_cost: 140,
                settlement_policy: 'reserve_then_settle',
                affordable_now: true,
                max_startable_jobs_now: 1,
                start_status: 'available',
              },
              {
                model_id: 'nano-banana-2',
                label: 'Nano Banana 2',
                pricing_lane: 'final',
                planned_provider: 'runware',
                estimated_cost: 0.069,
                estimated_cost_source: 'provider_quote',
                quoted_credit_cost: 220,
                reserved_credit_cost: 220,
                settlement_credit_cost: 220,
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

  it('shows model family names and keeps higher-tier models locked on a free account', async () => {
    renderWithProviders(<CreatePage />, { route: '/create' })

    await waitFor(() => {
      expect(screen.getByText('GPT Image 2')).toBeInTheDocument()
    })
    expect(screen.queryByText(/^finish$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Live result set/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Recent Create sessions/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('create-preview-surface')).toBeInTheDocument()

    const modelPickerButton = screen.getByText(/^Model$/i).closest('button')
    expect(modelPickerButton).toBeTruthy()
    await userEvent.click(modelPickerButton!)

    expect(screen.getByText('Nano Banana')).toBeInTheDocument()
    expect(screen.getByText('Nano Banana 2')).toBeInTheDocument()
    expect(screen.getByText('Grok Imagine Image Pro')).toBeInTheDocument()
    expect(screen.getByText('Wan 2.7 Image Pro')).toBeInTheDocument()
    expect(screen.getByText('FLUX.2 Max')).toBeInTheDocument()
    expect(screen.getAllByText(/80 Credits/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/140 credits/i)).toBeInTheDocument()
    expect(screen.queryByText(/qwen-image-2512/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\[klein\]|\[max\]/i)).not.toBeInTheDocument()

    const premiumModelButton = screen.getAllByText(/^essential$/i)[0].closest('button')
    expect(premiumModelButton).toBeDisabled()
    expect(screen.getAllByText(/^locked$/i).length).toBeGreaterThan(0)
  })

  it('restores session settings from history and keeps preview state stable when variation count changes', async () => {
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
      model: 'flux-2-klein',
      display_model_label: 'FLUX.2',
      prompt_snapshot: {
        prompt: 'A cinematic alley scene at dusk',
        negative_prompt: 'low quality',
        model: 'flux-2-klein',
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
      credit_cost: 240,
      reserved_credit_cost: 240,
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
      expect(variationSlider).toHaveValue('2')
    })
    expect(screen.getByTestId('create-preview-surface')).toBeInTheDocument()
  })
})
