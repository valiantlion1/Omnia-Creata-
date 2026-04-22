import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { renderWithProviders } from '@/test/renderWithProviders'

function ThrowChunkError(): never {
  throw new Error('TypeError: Failed to fetch dynamically imported module: http://127.0.0.1:5173/assets/MediaLibrary-old.js')
}

function ThrowGenericError(): never {
  throw new Error('Exploded in render')
}

describe('ErrorBoundary', () => {
  it('uses calmer copy for stale chunk failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithProviders(
      <ErrorBoundary>
        <ThrowChunkError />
      </ErrorBoundary>,
    )

    expect(await screen.findByRole('heading', { name: /Studio was updated/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reload Studio/i })).toBeInTheDocument()
    expect(screen.getByText(/Reload to reopen this page/i)).toBeInTheDocument()
    expect(screen.queryByText(/MediaLibrary-old\.js/i)).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })

  it('keeps the generic fallback for non-chunk errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderWithProviders(
      <ErrorBoundary>
        <ThrowGenericError />
      </ErrorBoundary>,
    )

    expect(await screen.findByRole('heading', { name: /This page hit a problem/i })).toBeInTheDocument()
    expect(screen.getByText(/Reload and try again/i)).toBeInTheDocument()
    expect(screen.queryByText(/Exploded in render/i)).not.toBeInTheDocument()

    errorSpy.mockRestore()
  })
})
