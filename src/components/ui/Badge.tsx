import { cn } from '../../lib/utils'
import { RARITY_BG, RARITY_LABEL, ROLE_COLORS, ROLE_LABEL, EVENT_TYPE_COLORS, EVENT_TYPE_LABEL } from '../../lib/constants'

interface BadgeProps {
  children?: React.ReactNode
  className?: string
  variant?: 'default' | 'rarity' | 'role' | 'event'
  value?: string
}

export function Badge({ children, className, variant = 'default', value }: BadgeProps) {
  let colorClass = 'bg-ptn-elevated text-ptn-muted border-ptn-border'
  let label = children

  if (variant === 'rarity' && value) {
    colorClass = RARITY_BG[value] || colorClass
    label = RARITY_LABEL[value] || value
  } else if (variant === 'role' && value) {
    colorClass = ROLE_COLORS[value] || colorClass
    label = ROLE_LABEL[value] || value
  } else if (variant === 'event' && value) {
    colorClass = EVENT_TYPE_COLORS[value] || colorClass
    label = EVENT_TYPE_LABEL[value] || value
  }

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      colorClass,
      className,
    )}>
      {label}
    </span>
  )
}
