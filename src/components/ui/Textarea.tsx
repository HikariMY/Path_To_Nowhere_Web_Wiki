import { type TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-ptn-muted">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded border bg-ptn-elevated border-ptn-border',
            'text-ptn-text placeholder:text-ptn-disabled',
            'px-3 py-2 text-sm outline-none resize-y min-h-[100px]',
            'focus:border-ptn-red focus:ring-1 focus:ring-ptn-red/30',
            'transition-colors duration-150',
            error && 'border-red-500',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
