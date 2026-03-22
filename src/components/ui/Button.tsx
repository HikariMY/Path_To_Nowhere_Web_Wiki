import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'cyan'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary:   'bg-ptn-red hover:bg-ptn-red-hover text-white border-transparent',
      secondary: 'bg-ptn-elevated hover:bg-ptn-border text-ptn-text border-ptn-border',
      danger:    'bg-red-900/40 hover:bg-red-900/60 text-red-400 border-red-500/30',
      ghost:     'bg-transparent hover:bg-ptn-elevated text-ptn-muted hover:text-ptn-text border-transparent',
      outline:   'bg-transparent hover:bg-ptn-elevated text-ptn-text border-ptn-border',
      cyan:      'bg-ptn-cyan/10 hover:bg-ptn-cyan/20 text-ptn-cyan border-ptn-cyan/30',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded border font-medium',
          'transition-colors duration-150 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
