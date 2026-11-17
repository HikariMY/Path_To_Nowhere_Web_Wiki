import { safeHttpUrl } from './tierList'

// ============================================================
// ไกด์โหมด — logic ล้วน ไม่แตะ React / Supabase
// ข้อมูล Global (เช็กในเกมเอง) แสดงเป็นหลัก · ข้อมูลเซิร์ฟจีนแยกเป็น "ล่วงหน้า" พร้อมเครดิต
// กฎแบบ "หัวข้อ: รายละเอียด" ใช้ parsePoints / readPoints จาก cnGuides.ts
// ============================================================

export const MODE_ROUND_WARN_DAYS = 30
export const MODE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface ModeShot {
  url: string
  caption: string
}

/** array ของข้อความจาก jsonb — ทิ้งค่าที่ไม่ใช่ข้อความหรือว่าง */
export function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
}

/** บรรทัดละรายการ (เช่นชื่อ Boss / เคล็ดลับ) */
export function parseLines(text: string): string[] {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
}

export interface ModeStage {
  title: string
  body: string
}

/** รายชื่อด่าน/ชั้น — ชื่อจำเป็น รายละเอียดว่างได้ (เช่น EX1-1S) */
export function readStages(value: unknown): ModeStage[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(v => {
    if (!v || typeof v !== 'object') return []
    const { title, body } = v as Record<string, unknown>
    if (typeof title !== 'string' || !title.trim()) return []
    return [{ title, body: typeof body === 'string' ? body : '' }]
  })
}

/** "ชื่อ: รายละเอียด" บรรทัดละด่าน — ไม่มี ":" = มีแต่ชื่อ */
export function parseStages(text: string): ModeStage[] {
  return parseLines(text).map(line => {
    const at = line.indexOf(':')
    return at > 0 ? { title: line.slice(0, at).trim(), body: line.slice(at + 1).trim() } : { title: line, body: '' }
  })
}

/** ภาพจากในเกม — ต้องเป็นลิงก์ http(s) */
export function readShots(value: unknown): ModeShot[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(v => {
    if (!v || typeof v !== 'object') return []
    const { url, caption } = v as Record<string, unknown>
    if (!safeHttpUrl(url)) return []
    return [{ url: url as string, caption: typeof caption === 'string' ? caption : '' }]
  })
}

export type ModeStatusKey = 'global' | 'unverified' | 'cn-only'

/** ป้ายสถานะ: มีใน Global แล้ว / ชื่อยังไม่ยืนยัน / ยังไม่พบใน Global (+ ยังล็อกในเกม) */
export function modeStatus(m: { in_global: boolean; verified: boolean; locked: boolean }): { key: ModeStatusKey; label: string; locked: boolean } {
  if (!m.in_global) return { key: 'cn-only', label: 'ยังไม่พบใน Global', locked: m.locked }
  if (!m.verified) return { key: 'unverified', label: 'รอยืนยันชื่อ', locked: m.locked }
  return { key: 'global', label: 'Global', locked: m.locked }
}

/** รอบปัจจุบันของ Global: หมดแล้ว / ใกล้หมด (≤ 30 วัน) / ยังอีกนาน / ไม่มีรอบ */
export function seasonState(endsAt: string | null | undefined, now: Date = new Date()): { state: 'none' | 'ended' | 'ending' | 'running'; daysLeft: number | null } {
  if (!endsAt) return { state: 'none', daysLeft: null }
  const t = new Date(endsAt).getTime()
  if (Number.isNaN(t)) return { state: 'none', daysLeft: null }
  const daysLeft = Math.ceil((t - now.getTime()) / 864e5)
  if (t <= now.getTime()) return { state: 'ended', daysLeft: 0 }
  return { state: daysLeft <= MODE_ROUND_WARN_DAYS ? 'ending' : 'running', daysLeft }
}

/** ข้อความผิดพลาดภาษาไทย (ว่าง = บันทึกได้) */
export function validateMode(input: { name: string; slug: string; summary: string }): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('ใส่ชื่อโหมด')
  if (!MODE_SLUG_RE.test(input.slug.trim())) errors.push('slug ใช้ได้แค่ a-z 0-9 และ - เช่น dark-area')
  return errors
}
