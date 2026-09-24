import type { ReforgeEffect, ReforgeNode, ReforgeStat } from '../../types/models'

// สีวงรอบโหนดตามในเกม: Attribute = น้ำเงิน, Special = ม่วง, Special COST 5 ขึ้นไป = ทอง
export const RING_ATTRIBUTE = '#3b82f6'
export const RING_SPECIAL = '#a855f7'
export const RING_SPECIAL_MAJOR = '#f59e0b'
export const MAJOR_COST = 5

export const COST_BADGE = '#f59e0b'
export const REFORGE_RED = '#e11d48'

export function nodeRingColor(node: Pick<ReforgeNode, 'category' | 'cost'>): string {
  if (node.category === 'attribute') return RING_ATTRIBUTE
  return node.cost >= MAJOR_COST ? RING_SPECIAL_MAJOR : RING_SPECIAL
}

export const CATEGORY_LABEL: Record<ReforgeNode['category'], string> = {
  attribute: 'Attribute Anchor',
  special: 'Special Effect Anchor',
}

export const EFFECT_LABEL: Record<ReforgeEffect['type'], string> = {
  intensify: 'Intensify',
  leap: 'Leap',
  cost: 'COST',
}

export function formatStat(s: ReforgeStat): string {
  const sign = s.value >= 0 ? '+' : ''
  return `${sign}${s.value}${s.unit === 'percent' ? '%' : ''}`
}

export const stageLabel = (stage: number) => `STAGE ${String(stage).padStart(2, '0')}`

export const displayName = (n: { name: string; name_th?: string }) => n.name_th || n.name
