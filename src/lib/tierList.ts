import type { TierRow } from '../types/models'

// ============================================================
// Tier list — logic ล้วน ไม่แตะ React / Supabase
// ทุกฟังก์ชันคืน array ใหม่ ไม่แก้ของเดิม
// ============================================================

export const TIER_LABEL_MAX = 12
export const MIN_TIERS = 1
export const MAX_TIERS = 10

// สีให้เลือกในแถวระดับ — 6 สีแรกตรงกับค่าเริ่มต้น SS–D
export const TIER_PALETTE = [
  '#FF4444', '#FFD700', '#C084FC', '#60A5FA', '#6EE7B7', '#9898B0',
  '#FB923C', '#F472B6', '#22D3EE', '#A3E635',
] as const

/** ย้ายตัวละครเข้าแถวที่ tierIndex (ออกจากแถวอื่นทั้งหมด) — tierIndex = -1 คือเอาออกจากทุกแถว */
export function placeCharacter(tiers: readonly TierRow[], charId: string, tierIndex: number): TierRow[] {
  return tiers.map((t, i) => {
    const without = t.character_ids.filter(id => id !== charId)
    return { ...t, character_ids: i === tierIndex ? [...without, charId] : without }
  })
}

/** ตัวละครที่ยังไม่อยู่ในแถวไหน เรียงตาม allIds */
export function unassignedIds(allIds: readonly string[], tiers: readonly TierRow[]): string[] {
  const assigned = new Set(tiers.flatMap(t => t.character_ids))
  return allIds.filter(id => !assigned.has(id))
}

const updateAt = (tiers: readonly TierRow[], index: number, patch: Partial<TierRow>): TierRow[] =>
  tiers.map((t, i) => (i === index ? { ...t, ...patch } : t))

export function renameTier(tiers: readonly TierRow[], index: number, label: string): TierRow[] {
  return updateAt(tiers, index, { label: [...label].slice(0, TIER_LABEL_MAX).join('') })
}

export function recolorTier(tiers: readonly TierRow[], index: number, color: string): TierRow[] {
  return updateAt(tiers, index, { color })
}

/** เพิ่มแถวว่างท้ายสุด สีวนตาม palette — เต็ม MAX_TIERS แล้วไม่เพิ่ม */
export function addTier(tiers: readonly TierRow[]): TierRow[] {
  if (tiers.length >= MAX_TIERS) return [...tiers]
  const color = TIER_PALETTE[tiers.length % TIER_PALETTE.length]
  return [...tiers, { label: 'ใหม่', color, character_ids: [] }]
}

/** ลบแถว — ตัวละครในแถวนั้นกลับไปรายการที่ยังไม่จัดอันดับเอง (unassignedIds คำนวณจากแถวที่เหลือ) */
export function removeTier(tiers: readonly TierRow[], index: number): TierRow[] {
  if (tiers.length <= MIN_TIERS) return [...tiers]
  return tiers.filter((_, i) => i !== index)
}

/** เลื่อนแถวขึ้น (-1) หรือลง (+1) — เลื่อนเกินขอบไม่ทำอะไร */
export function moveTier(tiers: readonly TierRow[], index: number, dir: -1 | 1): TierRow[] {
  const target = index + dir
  if (target < 0 || target >= tiers.length) return [...tiers]
  const next = [...tiers]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** ก่อนบันทึก: ตัดช่องว่างหัวท้ายชื่อระดับ ชื่อว่างให้เป็น "?" */
export function normalizeTiersForSave(tiers: readonly TierRow[]): TierRow[] {
  return tiers.map(t => ({ ...t, label: t.label.trim() || '?' }))
}

export interface CharacterFilter {
  query?: string
  rarity?: string
  jobClass?: string
}

/** กรองตัวละครตามชื่อ (ไม่สนตัวพิมพ์เล็กใหญ่), Rank และคลาส — ช่องที่ว่างไม่กรอง */
export function filterCharacters<T extends { name: string; rarity: string; job_class: string }>(
  chars: readonly T[],
  { query = '', rarity = '', jobClass = '' }: CharacterFilter,
): T[] {
  const q = query.trim().toLowerCase()
  return chars.filter(c =>
    (!q || c.name.toLowerCase().includes(q))
    && (!rarity || c.rarity === rarity)
    && (!jobClass || c.job_class === jobClass),
  )
}
