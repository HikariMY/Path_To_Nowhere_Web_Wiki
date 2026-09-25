import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { RARITY_COLORS } from '../../lib/constants'

type CardChar = { name: string; portrait_url: string | null; rarity: 'S' | 'A' | 'B' | 'C' }

/** การ์ดตัวละครในเทียร์ลิสต์ — ใช้ขนาดเดียวกันทั้งหน้าจัดอันดับและหน้าดู */
export function TierCharCard({ char, selected = false }: { char: CardChar; selected?: boolean }) {
  const color = RARITY_COLORS[char.rarity]
  return (
    <div className="flex flex-col items-center gap-1" title={char.name}>
      <div
        className={cn(
          'relative flex h-[68px] w-14 items-center justify-center overflow-hidden rounded border bg-ptn-elevated sm:h-20 sm:w-16',
          'transition-shadow',
          selected && 'ring-2 ring-ptn-cyan ring-offset-2 ring-offset-ptn-bg',
        )}
        style={{ borderColor: `${color}80` }}
      >
        {char.portrait_url ? (
          <img src={char.portrait_url} alt={char.name} className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="font-heading text-xl font-bold" style={{ color }}>{char.name[0]}</span>
        )}
      </div>
      <span className="max-w-[4.5rem] truncate text-[11px] leading-tight text-ptn-muted">{char.name}</span>
    </div>
  )
}

/** ช่องชื่อระดับ — กว้างขึ้นและตัวเล็กลงเมื่อชื่อยาว (สูงสุด 12 ตัวอักษร) */
export function TierLabel({ label, color, children }: { label: string; color: string; children?: ReactNode }) {
  const len = [...label].length
  const size = len <= 3 ? 'text-xl' : len <= 6 ? 'text-base' : 'text-xs'
  return (
    <div
      className={cn(
        'flex w-16 shrink-0 flex-col items-center justify-center gap-1 break-words px-1 py-2 text-center font-heading font-bold leading-tight sm:w-24',
        size,
      )}
      style={{ background: `${color}20`, color, borderRight: `2px solid ${color}40` }}
    >
      {children ?? <span className="w-full">{label}</span>}
    </div>
  )
}
