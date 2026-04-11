import './index.css'
import './i18n/index'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { StoreProvider } from './lib/store'
import { queryClient } from './lib/queryClient'
import { StudioAuthProvider } from './lib/studioAuth'

const RootWrapper = import.meta.env.DEV ? React.Fragment : React.StrictMode

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RootWrapper>
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <StudioAuthProvider>
          <App />
        </StudioAuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  </RootWrapper>,
)
