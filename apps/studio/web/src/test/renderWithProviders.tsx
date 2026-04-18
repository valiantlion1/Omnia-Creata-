import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'

import { LightboxProvider } from '@/components/Lightbox'
import { ToastProvider } from '@/components/Toast'
import { StudioCookiePreferencesProvider } from '@/lib/studioCookiePreferences'

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    queryClient = createTestQueryClient(),
    ...options
  }: { route?: string; queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <StudioCookiePreferencesProvider>
        <ToastProvider>
          <LightboxProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </LightboxProvider>
        </ToastProvider>
      </StudioCookiePreferencesProvider>
    </QueryClientProvider>
  )
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) }
}
