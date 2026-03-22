import { cn } from '../../lib/utils'

interface AvatarProps {
  src?: string | null
  username?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ src, username, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  }

  const initial = username ? username[0].toUpperCase() : '?'

  if (src) {
    return (
      <img
        src={src}
        alt={username || 'avatar'}
        className={cn(
          'rounded-full object-cover border border-ptn-border bg-ptn-elevated',
          sizes[size],
          className,
        )}
      />
    )
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold',
      'bg-ptn-red/20 text-ptn-red border border-ptn-red/30',
      sizes[size],
      className,
    )}>
      {initial}
    </div>
  )
}
