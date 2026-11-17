import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { RARITY_COLORS } from '../../lib/constants'
import { TIER_MARKS, tierMark } from '../../lib/tierMarks'
import type { TierMarkKey, TierServer } from '../../types'

type CardChar = { name: string; portrait_url: string | null; rarity: 'S' | 'A' | 'B' | 'C' }

/** ป้ายเครื่องหมายตัวอักษรเดียว (มุมรูป / คำอธิบาย) */
export function TierMarkBadge({ mark, className }: { mark: TierMarkKey; className?: string }) {
  const m = tierMark(mark)
  if (!m) return null
  return (
    <span
      title={`${m.label} — ${m.th}`}
      className={cn('inline-grid h-4 w-4 shrink-0 place-items-center font-mono text-[10px] font-bold leading-none text-white shadow-[0_0_0_1px_rgba(0,0,0,.8)]', className)}
      style={{ background: m.color }}
    >
      {m.short}
    </span>
  )
}

/** การ์ดตัวละครในเทียร์ลิสต์ — ใช้ขนาดเดียวกันทั้งหน้าจัดอันดับและหน้าดู · marks/hasNote = รายละเอียดแบบเทียร์ลิสต์จีน */
export function TierCharCard({ char, selected = false, marks = [], hasNote = false }: {
  char: CardChar
  selected?: boolean
  marks?: TierMarkKey[]
  hasNote?: boolean
}) {
  const color = RARITY_COLORS[char.rarity]
  return (
    <div className="flex flex-col items-center gap-1" title={char.name}>
      <div className="relative">
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
        {marks.length > 0 && (
          <span className="pointer-events-none absolute -left-1.5 -top-1.5 flex gap-px">
            {marks.map(m => <TierMarkBadge key={m} mark={m} />)}
          </span>
        )}
        {hasNote && (
          <span aria-label="มีหมายเหตุ" className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-ptn-gold shadow-[0_0_0_2px_rgba(0,0,0,.7)]" />
        )}
      </div>
      <span className="max-w-[4.5rem] truncate text-[11px] leading-tight text-ptn-muted">{char.name}</span>
    </div>
  )
}

const SERVER_LABEL: Record<TierServer, string> = { global: 'Global', cn: 'ข้อมูลเซิร์ฟจีน' }

/** ป้ายเซิร์ฟ + แพทช์ก่อนหน้า — เทียร์ลิสต์ชุมชนของ Global ไม่ต้องติดป้าย (เกือบทุกอันเป็น Global) */
export function TierServerBadges({ server, archived, official = true }: { server: TierServer; archived: boolean; official?: boolean }) {
  return (
    <>
      {(official || server === 'cn') && <span className={cn(
        'rounded border px-2 py-0.5 text-xs',
        server === 'cn' ? 'border-ptn-red/25 bg-ptn-red/10 text-ptn-red' : 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400',
      )}>
        {SERVER_LABEL[server]}
      </span>}
      {archived && (
        <span className="rounded border border-ptn-border bg-ptn-elevated px-2 py-0.5 text-xs text-ptn-muted">แพทช์ก่อนหน้า</span>
      )}
    </>
  )
}

/** คำอธิบายเครื่องหมาย — keys ว่าง = ไม่แสดงอะไร */
export function TierLegend({ keys }: { keys: TierMarkKey[] }) {
  const marks = TIER_MARKS.filter(m => keys.includes(m.key))
  if (!marks.length) return null
  return (
    <ul className="grid gap-2">
      {marks.map(m => (
        <li key={m.key} className="flex items-start gap-2 text-sm">
          <TierMarkBadge mark={m.key} className="mt-0.5" />
          <span><b className="text-ptn-text">{m.label}</b> <span className="text-ptn-muted">— {m.th}</span></span>
        </li>
      ))}
    </ul>
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
