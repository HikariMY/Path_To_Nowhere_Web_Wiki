import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={cn(
          'relative w-full rounded-lg border border-ptn-border bg-ptn-surface shadow-ptn-card',
          'animate-slide-up',
          sizes[size],
          className,
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ptn-border p-4">
            <h2 className="font-heading text-lg font-semibold text-ptn-text">{title}</h2>
            <button
              onClick={onClose}
              className="text-ptn-muted hover:text-ptn-text transition-colors p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-ptn-muted hover:text-ptn-text transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
