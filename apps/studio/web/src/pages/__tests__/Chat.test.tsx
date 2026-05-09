import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ChatPage from '@/pages/Chat'
import { renderWithProviders } from '@/test/renderWithProviders'
import { server } from '@/test/server'

const mockStudioAuth = vi.hoisted((): { current: any } => ({
  current: {
    auth: {
      identity: {
        id: 'guest',
        email: '',
        display_name: 'Guest',
        username: 'guest',
        plan: 'guest',
        workspace_id: null,
        guest: true,
      },
      guest: true,
    },
    isAuthenticated: false,
    isAuthSyncing: false,
    isLoading: false,
  },
}))

vi.mock('@/lib/studioAuth', () => ({
  useStudioAuth: () => mockStudioAuth.current,
}))

vi.mock('@/lib/usePageVisibility', () => ({
  usePageVisibility: () => true,
}))

function guestAuth() {
  return {
    auth: {
      identity: {
        id: 'guest',
        email: '',
        display_name: 'Guest',
        username: 'guest',
        plan: 'guest',
        workspace_id: null,
        guest: true,
      },
      guest: true,
    },
    isAuthenticated: false,
    isAuthSyncing: false,
    isLoading: false,
  }
}

function creatorAuth() {
  return {
    auth: {
      identity: {
        id: 'creator-1',
        email: 'creator@omniacreata.com',
        display_name: 'Creator',
        username: 'creator',
        plan: 'creator',
        workspace_id: 'ws-creator-1',
        guest: false,
      },
      guest: false,
      entitlements: {
        can_access_chat: true,
        premium_chat: true,
        can_generate: true,
      },
      credits: {
        remaining: 420,
      },
    },
    isAuthenticated: true,
    isAuthSyncing: false,
    isLoading: false,
  }
}

function conversationSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    workspace_id: 'ws-creator-1',
    identity_id: 'creator-1',
    title: 'Luxury perfume concept',
    model: 'vision',
    message_count: 0,
    last_message_at: null,
    created_at: '2026-05-08T12:00:00.000Z',
    updated_at: '2026-05-08T12:00:00.000Z',
    ...overrides,
  }
}

function chatMessage(role: 'user' | 'assistant', overrides: Record<string, unknown> = {}) {
  return {
    id: `${role}-1`,
    conversation_id: 'conv-1',
    identity_id: 'creator-1',
    role,
    content: role === 'user' ? 'Create a luxury perfume campaign visual' : 'I can create that visual direction in Studio.',
    attachments: [],
    suggested_actions: [],
    metadata: {},
    version: 1,
    created_at: role === 'user' ? '2026-05-08T12:00:01.000Z' : '2026-05-08T12:00:02.000Z',
    edited_at: null,
    ...overrides,
  }
}

function generationPayload(overrides: Record<string, unknown> = {}) {
  return {
    job_id: 'gen-chat-1',
    title: 'Luxury perfume campaign visual',
    display_title: 'Luxury perfume campaign visual',
    status: 'running',
    session_status: 'running',
    library_state: 'generating',
    project_id: 'project-chat-1',
    provider: 'runware',
    provider_rollout_tier: 'primary',
    provider_billable: true,
    model: 'nano-banana-2',
    display_model_label: 'Nano Banana 2',
    prompt_snapshot: {
      prompt: 'Luxury perfume bottle on a glossy black pedestal, cinematic rim light',
      negative_prompt: '',
      model: 'nano-banana-2',
      workflow: 'text_to_image',
      reference_asset_id: null,
      width: 1856,
      height: 2304,
      steps: 34,
      cfg_scale: 6,
      seed: 123,
      aspect_ratio: '4:5',
    },
    pricing_lane: 'standard',
    estimated_cost: 0.10255,
    estimated_cost_source: 'provider_quote',
    actual_cost_usd: null,
    credit_cost: 20,
    reserved_credit_cost: 20,
    final_credit_cost: null,
    credit_charge_policy: 'reserve_then_settle',
    credit_status: 'reserved',
    output_count: 1,
    outputs: [],
    slots: [],
    error: null,
    error_code: null,
    attempt_count: 1,
    created_at: '2026-05-08T12:00:03.000Z',
    started_at: '2026-05-08T12:00:04.000Z',
    last_heartbeat_at: '2026-05-08T12:00:04.000Z',
    completed_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  mockStudioAuth.current = guestAuth()
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value: vi.fn(),
  })
})

describe('ChatPage (guest mode)', () => {
  it('renders the paid-plan gate and a signup CTA for guests', () => {
    renderWithProviders(<ChatPage />, { route: '/chat' })

    expect(
      screen.getByRole('heading', { name: /chat lives inside paid studio plans/i }),
    ).toBeInTheDocument()

    const cta = screen.getByRole('link', { name: /request access/i })
    expect(cta).toHaveAttribute('href', '/signup')
  })
})

describe('ChatPage visual generation', () => {
  it('renders generated images inline after the assistant returns a generation bridge', async () => {
    mockStudioAuth.current = creatorAuth()
    const user = userEvent.setup()
    const conversation = conversationSummary()
    const messages: Array<Record<string, unknown>> = []
    let capturedGenerationBody: Record<string, unknown> | null = null

    server.use(
      http.get('*/v1/conversations', () => HttpResponse.json({ conversations: [] })),
      http.post('*/v1/conversations', () => HttpResponse.json(conversation, { status: 201 })),
      http.get('*/v1/conversations/:conversationId', () =>
        HttpResponse.json({ conversation: { ...conversation, message_count: messages.length }, messages }),
      ),
      http.post('*/v1/conversations/:conversationId/messages', async () => {
        const userMessage = chatMessage('user')
        const assistantMessage = chatMessage('assistant', {
          id: 'assistant-1',
          metadata: {
            can_generate_image: true,
            workflow_intent: 'generate_image',
            generation_bridge: {
              workflow: 'text_to_image',
              prompt: 'Luxury perfume bottle on a glossy black pedestal, cinematic rim light',
              negative_prompt: '',
              blueprint: {
                workflow: 'text_to_image',
                prompt: 'Luxury perfume bottle on a glossy black pedestal, cinematic rim light',
                negative_prompt: '',
                model: 'nano-banana-2',
                width: 1856,
                height: 2304,
                steps: 34,
                cfg_scale: 6,
                aspect_ratio: '4:5',
                output_count: 1,
                reference_mode: 'none',
              },
            },
          },
        })
        messages.splice(0, messages.length, userMessage, assistantMessage)
        return HttpResponse.json({
          conversation: { ...conversation, message_count: 2, last_message_at: assistantMessage.created_at },
          user_message: userMessage,
          assistant_message: assistantMessage,
        }, { status: 201 })
      }),
      http.post('*/v1/projects', () =>
        HttpResponse.json({
          id: 'project-chat-1',
          workspace_id: 'ws-creator-1',
          title: 'Chat - Luxury perfume concept',
          description: 'Created from Studio Chat',
          surface: 'chat',
          created_at: '2026-05-08T12:00:03.000Z',
          updated_at: '2026-05-08T12:00:03.000Z',
        }, { status: 201 }),
      ),
      http.post('*/v1/generations', async ({ request }) => {
        capturedGenerationBody = await request.json() as Record<string, unknown>
        return HttpResponse.json(generationPayload(), { status: 202 })
      }),
      http.get('*/v1/generations/:generationId', () =>
        HttpResponse.json(generationPayload({
          status: 'succeeded',
          session_status: 'succeeded',
          library_state: 'ready',
          outputs: [
            {
              asset_id: 'asset-chat-1',
              url: '/mock-chat-generated-perfume.png',
              thumbnail_url: '/mock-chat-generated-perfume-thumb.png',
              mime_type: 'image/png',
              width: 1856,
              height: 2304,
              variation_index: 0,
            },
          ],
          slots: [
            {
              slot_index: 0,
              slot_status: 'succeeded',
              moderation_outcome: 'allowed',
              error_code: null,
              refund_state: 'committed',
              output: {
                asset_id: 'asset-chat-1',
                url: '/mock-chat-generated-perfume.png',
                thumbnail_url: '/mock-chat-generated-perfume-thumb.png',
                mime_type: 'image/png',
                width: 1856,
                height: 2304,
                variation_index: 0,
              },
            },
          ],
          final_credit_cost: 20,
          credit_status: 'committed',
          completed_at: '2026-05-08T12:00:08.000Z',
        })),
      ),
    )

    renderWithProviders(<ChatPage />, { route: '/chat' })

    const composer = await screen.findByPlaceholderText(/message studio/i)
    await user.type(composer, 'Create a luxury perfume campaign visual')
    await user.click(screen.getByTitle(/send/i))

    await waitFor(() => {
      expect(capturedGenerationBody).toMatchObject({
        project_id: 'project-chat-1',
        prompt: 'Luxury perfume bottle on a glossy black pedestal, cinematic rim light',
        model: 'nano-banana-2',
        aspect_ratio: '4:5',
        output_count: 1,
      })
    })

    expect(await screen.findByRole('img', { name: /luxury perfume campaign visual/i })).toHaveAttribute(
      'src',
      '/mock-chat-generated-perfume.png',
    )
    expect(screen.getByRole('link', { name: /open in library/i })).toHaveAttribute('href', '/library/images')
  })
})
