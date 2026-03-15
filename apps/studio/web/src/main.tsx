import './index.css'
import './i18n/index'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { StoreProvider } from './lib/store'
import { queryClient } from './lib/queryClient'
import { StudioAuthProvider } from './lib/studioAuth'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <StudioAuthProvider>
          <App />
        </StudioAuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
