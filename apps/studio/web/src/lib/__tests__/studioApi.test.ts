import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('studioApi.demoLogin', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a valid example.com email for local demo auth', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          token_type: 'bearer',
          identity: {
            guest: false,
            identity: {
              id: 'user-1',
              email: 'proof.creator@example.com',
              display_name: 'Proof Creator',
              plan: 'free',
              workspace_id: 'ws-1',
            },
            credits: {
              remaining: 0,
              monthly_remaining: 0,
              extra_credits: 0,
            },
            plan: {
              id: 'free',
              label: 'Free',
              monthly_credits: 0,
              queue_priority: 'standard',
              share_links: false,
              can_generate: true,
              can_access_chat: true,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const { studioApi } = await import('@/lib/studioApi')

    await studioApi.demoLogin('free', 'Proof Creator')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(requestInit.body))

    expect(body).toMatchObject({
      email: 'proof.creator@example.com',
      display_name: 'Proof Creator',
      plan: 'free',
    })
  })
})
