import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
  duration: number
}

type ToastContextValue = {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles: Record<ToastType, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  error: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
}

const iconColors: Record<ToastType, string> = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '420px' }}>
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-5 py-4 backdrop-blur-xl transition-all animate-[slideInRight_0.3s_ease-out] ${styles[toast.type]}`}
              style={{ boxShadow: `var(--border-glow), ${toast.type === 'success' ? '0 8px 32px rgba(16,185,129,0.15)' : toast.type === 'error' ? '0 8px 32px rgba(244,63,94,0.15)' : toast.type === 'warning' ? '0 8px 32px rgba(245,158,11,0.12)' : '0 8px 32px rgba(59,130,246,0.12)'}` }}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColors[toast.type]}`} />
              <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
