import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockState = vi.hoisted(() => ({
  listStyles: vi.fn().mockResolvedValue({
    catalog: [
      {
        id: 'dramatic-cinema',
        title: 'Dramatic Cinema',
        description: 'Moody, filmic composition with premium contrast and lighting.',
        prompt_modifier: 'cinematic lighting, film grain, dramatic shadows',
        text_mode: 'modifier',
        image: 'https://example.com/style.jpg',
        category: 'photography',
        likes: 342,
        is_omnia: true,
        negative_prompt: '',
        preferred_model_id: null,
        preferred_aspect_ratio: null,
        preferred_steps: null,
        preferred_cfg_scale: null,
        preferred_output_count: null,
        saved: false,
        favorite: false,
        saved_style_id: null,
      },
    ],
    my_styles: [
      {
        id: 'style-1',
        identity_id: 'user-1',
        title: 'Night Portrait',
        prompt_modifier: 'quiet portrait, blue rim light, moody background',
        text_mode: 'prompt',
        description: 'Saved setup for cinematic portraits.',
        category: 'illustration',
        preview_image_url: null,
        negative_prompt: 'blurry extra fingers',
        preferred_model_id: 'flux-2-pro',
        preferred_aspect_ratio: '4:5',
        preferred_steps: 32,
        preferred_cfg_scale: 7.5,
        preferred_output_count: 2,
        source_kind: 'prompt',
        source_style_id: null,
        favorite: true,
        created_at: '2026-04-19T09:00:00Z',
        updated_at: '2026-04-19T09:15:00Z',
      },
    ],
    favorites: ['style-1'],
  }),
  listModels: vi.fn().mockResolvedValue({
    models: [
      {
        id: 'flux-2-pro',
        label: 'Pro',
        description: 'Premium finish',
        min_plan: 'creator',
        credit_cost: 16,
        estimated_cost: 0.08,
        max_width: 1536,
        max_height: 1536,
        featured: true,
        runtime: 'cloud',
        owner_only: false,
        provider_hint: 'runware',
        source_id: null,
        license_reference: null,
      },
      {
        id: 'flux-2-klein',
        label: 'Fast',
        description: 'Quick finish',
        min_plan: 'free',
        credit_cost: 4,
        estimated_cost: 0.02,
        max_width: 1024,
        max_height: 1024,
        featured: false,
        runtime: 'cloud',
        owner_only: false,
        provider_hint: 'runware',
        source_id: null,
        license_reference: null,
      },
    ],
  }),
  saveStyle: vi.fn().mockResolvedValue({ id: 'saved-style' }),
  updateStyle: vi.fn().mockResolvedValue({ id: 'style-1' }),
  deleteStyle: vi.fn().mockResolvedValue({ style_id: 'style-1', status: 'deleted' }),
}))

vi.mock('@/lib/studioApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/studioApi')>('@/lib/studioApi')
  return {
    ...actual,
    studioApi: {
      ...actual.studioApi,
      listStyles: mockState.listStyles,
      listModels: mockState.listModels,
      saveStyle: mockState.saveStyle,
      updateStyle: mockState.updateStyle,
      deleteStyle: mockState.deleteStyle,
    },
  }
})

vi.mock('@/lib/usePageMeta', () => ({
  usePageMeta: () => undefined,
}))

import ElementsPage from '@/pages/Elements'
import { renderWithProviders } from '@/test/renderWithProviders'

describe('ElementsPage', () => {
  afterEach(() => {
    mockState.listStyles.mockClear()
    mockState.listModels.mockClear()
    mockState.saveStyle.mockClear()
    mockState.updateStyle.mockClear()
    mockState.deleteStyle.mockClear()
  })

  it('shows saved styles as reusable presets instead of plain prompt notes', async () => {
    renderWithProviders(<ElementsPage />, { route: '/elements/styles' })

    await userEvent.click(await screen.findByRole('button', { name: /my styles/i }))

    expect(await screen.findByText(/Night Portrait/i)).toBeInTheDocument()
    expect(screen.getByText(/Prompt starter/i)).toBeInTheDocument()
    expect(screen.getByText(/^Pro$/i)).toBeInTheDocument()
    expect(screen.getByText(/4:5/i)).toBeInTheDocument()
    expect(screen.getByText(/Has exclusions/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /use full preset/i })).toBeInTheDocument()
  })

  it('edits saved style details through the manage dialog', async () => {
    renderWithProviders(<ElementsPage />, { route: '/elements/styles' })

    await userEvent.click(await screen.findByRole('button', { name: /my styles/i }))
    await userEvent.click(await screen.findByRole('button', { name: /edit details/i }))

    const nameInput = await screen.findByLabelText(/style name/i)
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Night Portrait Deluxe')
    await userEvent.clear(screen.getByLabelText(/negative prompt/i))
    await userEvent.type(screen.getByLabelText(/negative prompt/i), 'washed out, bad anatomy')
    await userEvent.selectOptions(screen.getByLabelText(/preferred model/i), 'flux-2-klein')
    await userEvent.click(screen.getByRole('button', { name: '16:9' }))
    await userEvent.clear(screen.getByLabelText(/preferred variations/i))
    await userEvent.type(screen.getByLabelText(/preferred variations/i), '3')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(mockState.updateStyle).toHaveBeenCalledWith(
        'style-1',
        expect.objectContaining({
          title: 'Night Portrait Deluxe',
          negative_prompt: 'washed out, bad anatomy',
          preferred_model_id: 'flux-2-klein',
          preferred_aspect_ratio: '16:9',
          preferred_output_count: 3,
        }),
      )
    })
  })

  it('removes a saved style from the dialog', async () => {
    renderWithProviders(<ElementsPage />, { route: '/elements/styles' })

    await userEvent.click(await screen.findByRole('button', { name: /my styles/i }))
    await userEvent.click(await screen.findByRole('button', { name: /edit details/i }))
    await userEvent.click(await screen.findByRole('button', { name: /remove style/i }))
    await userEvent.click(await screen.findByRole('button', { name: /^delete style$/i }))

    await waitFor(() => {
      expect(mockState.deleteStyle).toHaveBeenCalledWith('style-1')
    })
  })
})
