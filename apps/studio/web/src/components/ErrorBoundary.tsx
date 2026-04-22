import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

import { isRecoverableChunkError, reloadStudioWindow } from '@/lib/chunkRecovery'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Uncaught error:', error, errorInfo)
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunkError = isRecoverableChunkError(this.state.error)
      const title = isChunkError ? 'Studio was updated' : 'This page hit a problem'
      const description = isChunkError
        ? 'Reload to reopen this page.'
        : 'Reload and try again. If it keeps happening, head back home.'

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-6 text-white text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 mb-6 ring-1 ring-rose-500/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl w-full max-w-sm font-semibold mb-2">{title}</h1>
          <p className="text-zinc-400 max-w-md w-full leading-relaxed mb-8">
            {description}
          </p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                reloadStudioWindow()
              }}
              className="px-5 py-2.5 rounded-full bg-white text-black font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <RefreshCw className="h-4 w-4" />
              {isChunkError ? 'Reload Studio' : 'Reload Page'}
            </button>
            
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="px-5 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-white font-medium flex items-center justify-center gap-2 hover:bg-white/[0.08] transition"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
