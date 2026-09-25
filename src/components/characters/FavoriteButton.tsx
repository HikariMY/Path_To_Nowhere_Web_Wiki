import type { MouseEvent } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '../../lib/utils'

interface FavoriteButtonProps {
  active: boolean
  onToggle: () => void
  size?: number
  className?: string
}

/** ปุ่มหัวใจตัวละครโปรด — วางซ้อนใน Link ของการ์ดได้ (กดแล้วไม่พาไปหน้าตัวละคร) */
export function FavoriteButton({ active, onToggle, size = 16, className }: FavoriteButtonProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'เอาออกจากตัวละครโปรด' : 'เพิ่มเป็นตัวละครโปรด'}
      title={active ? 'เอาออกจากตัวละครโปรด' : 'เพิ่มเป็นตัวละครโปรด'}
      className={cn(
        'rounded-full p-1 transition-colors',
        active ? 'text-rose-500' : 'text-white/60 hover:text-rose-300',
        className,
      )}
    >
      <Heart size={size} className={cn('drop-shadow', active && 'fill-current')} />
    </button>
  )
}
