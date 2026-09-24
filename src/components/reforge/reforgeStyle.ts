import type { ReforgeNode, ReforgeNodeCategory, ReforgeStat } from '../../types/models'
import { nodeCategory, type ReforgeOrb, type ReforgeSlotDef } from '../../lib/reforge'

// สีวงรอบโหนดตามในเกม: Attribute = น้ำเงิน, Special = ม่วง, Special COST 5 ขึ้นไป = ทอง
export const RING_ATTRIBUTE = '#3b82f6'
export const RING_SPECIAL = '#a855f7'
export const RING_SPECIAL_MAJOR = '#f59e0b'
export const MAJOR_COST = 5

export const COST_BADGE = '#f59e0b'
export const REFORGE_RED = '#e11d48'

export function nodeRingColor(node: Pick<ReforgeNode, 'slot' | 'cost'>): string {
  if (nodeCategory(node) === 'attribute') return RING_ATTRIBUTE
  return node.cost >= MAJOR_COST ? RING_SPECIAL_MAJOR : RING_SPECIAL
}

export const CATEGORY_LABEL: Record<ReforgeNodeCategory, string> = {
  attribute: 'Attribute Anchor',
  special: 'Special Effect Anchor',
}

export const ORB_LABEL: Record<ReforgeOrb, string> = {
  intensify: 'Intensify',
  leap: 'Leap',
}

export const ROMAN = ['I', 'II', 'III', 'IV'] as const

export function formatStat(s: ReforgeStat): string {
  const sign = s.value >= 0 ? '+' : ''
  return `${sign}${s.value}${s.unit === 'percent' ? '%' : ''}`
}

export const stageLabel = (stage: number) => `STAGE ${String(stage).padStart(2, '0')}`

/** เช่น "Stage II · ล่างขวา" — ใช้ในแผงแอดมินและข้อความ error */
export const slotLabel = (def: Pick<ReforgeSlotDef, 'stage' | 'row' | 'side'>) =>
  `Stage ${ROMAN[def.stage - 1]} · ${def.row === 'top' ? 'บน' : 'ล่าง'}${def.side === 'a' ? 'ซ้าย' : 'ขวา'}`

export const displayName = (n: { name: string; name_th?: string }) => n.name_th || n.name
