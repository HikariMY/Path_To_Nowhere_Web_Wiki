import { cn } from '../../lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-ptn-border bg-ptn-surface shadow-ptn-sm',
        hover && 'transition-all duration-200 hover:border-ptn-red/40 hover:shadow-ptn-red cursor-pointer',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  )
}
