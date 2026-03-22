import { type SelectHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-ptn-muted">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full rounded border bg-ptn-elevated border-ptn-border',
            'text-ptn-text text-sm px-3 py-2 outline-none',
            'focus:border-ptn-red focus:ring-1 focus:ring-ptn-red/30',
            'transition-colors duration-150 cursor-pointer',
            error && 'border-red-500',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
