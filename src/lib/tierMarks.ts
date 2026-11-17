import type { TierMarkKey } from '../types/models'

// ============================================================
// เครื่องหมายมุมรูปในเทียร์ลิสต์ (แบบเทียร์ลิสต์ของผู้เล่นจีน)
// label = ชื่อสั้นภาษาอังกฤษ · th = ความหมายที่แสดงให้คนอ่าน
// ============================================================

export interface TierMarkDef {
  key: TierMarkKey
  short: string
  label: string
  th: string
  color: string
}

export const TIER_MARKS: readonly TierMarkDef[] = [
  { key: 'new', short: 'N', label: 'New', th: 'ตัวใหม่ในแพทช์นี้', color: '#3b82f6' },
  { key: 'limited', short: 'L', label: 'Limited', th: 'ตัว Limited กลับมาเฉพาะช่วงครบรอบ / ปีใหม่', color: '#f59e0b' },
  { key: 'collab', short: 'C', label: 'Collab', th: 'ตัว Collab ปกติไม่กลับมาอีก', color: '#ec4899' },
  { key: 'reforged', short: 'R', label: 'Reforged', th: 'ผ่าน Reforge แล้ว', color: '#ef4444' },
  { key: 'archetype', short: 'A', label: 'Archetype', th: 'แรงเมื่อใช้คู่กับสายทีมเฉพาะ', color: '#a855f7' },
  { key: 'budget', short: 'B', label: 'Budget', th: 'แรงก์ต่ำแต่แรงมาก หาง่าย', color: '#22c55e' },
  { key: 'dated', short: 'D', label: 'Dated', th: 'ออกนานแล้ว Stat ตามเวอร์ชันใหม่ไม่ทัน', color: '#64748b' },
]

const BY_KEY = new Map(TIER_MARKS.map(m => [m.key, m]))

export const tierMark = (key: TierMarkKey): TierMarkDef | undefined => BY_KEY.get(key)

export function isTierMarkKey(value: unknown): value is TierMarkKey {
  return typeof value === 'string' && BY_KEY.has(value as TierMarkKey)
}
