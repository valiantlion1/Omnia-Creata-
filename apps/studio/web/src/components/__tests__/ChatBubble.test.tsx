import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ChatTypingIndicator } from '@/components/ChatBubble'

describe('ChatTypingIndicator', () => {
  it('renders an assistant reply placeholder with animated dots', () => {
    const { container } = render(<ChatTypingIndicator />)

    expect(screen.getByRole('status', { name: /studio is replying/i })).toBeInTheDocument()
    expect(screen.getByText(/studio is replying/i)).toBeInTheDocument()
    expect(container.querySelectorAll('[data-chat-typing-dot]').length).toBe(3)
  })
})
