import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InlineError } from '@/components/InlineError'

describe('InlineError', () => {
  it('renders the title, message and alert role', () => {
    render(<InlineError title="Checkout unavailable" message="Provider is offline." />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Checkout unavailable')
    expect(alert).toHaveTextContent('Provider is offline.')
  })

  it('invokes onRetry when the retry button is pressed', async () => {
    const onRetry = vi.fn()
    render(<InlineError message="Try again soon." onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables the retry button when retryDisabled is set', async () => {
    const onRetry = vi.fn()
    render(<InlineError message="Retrying." onRetry={onRetry} retryDisabled retryLabel="Retrying…" />)
    const button = screen.getByRole('button', { name: /retrying/i })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onRetry).not.toHaveBeenCalled()
  })
})
