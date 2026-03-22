import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = {
    success: <CheckCircle size={16} className="text-green-400 shrink-0" />,
    error:   <AlertCircle size={16} className="text-red-400 shrink-0" />,
    info:    <Info size={16} className="text-ptn-cyan shrink-0" />,
  }

  const colors = {
    success: 'border-green-500/30 bg-green-900/20',
    error:   'border-red-500/30 bg-red-900/20',
    info:    'border-ptn-cyan/30 bg-ptn-cyan/10',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 shadow-ptn-card',
              'animate-slide-up text-sm text-ptn-text',
              colors[t.type],
            )}
          >
            {icons[t.type]}
            <p className="flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-ptn-muted hover:text-ptn-text shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
