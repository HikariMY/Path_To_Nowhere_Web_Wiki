import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-ptn-muted">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ptn-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded border bg-ptn-elevated border-ptn-border',
              'text-ptn-text placeholder:text-ptn-disabled',
              'px-3 py-2 text-sm outline-none',
              'focus:border-ptn-red focus:ring-1 focus:ring-ptn-red/30',
              'transition-colors duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
