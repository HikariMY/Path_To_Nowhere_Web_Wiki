// ============================================================
// Redeem Code + แถบสถานะใต้เมนู — logic ล้วน ไม่แตะ React / Supabase
// โค้ดหมดอายุหรือปิดไว้จะซ่อนจากหน้าเว็บเอง · แถบสถานะโชว์อีเวนต์ที่กำลังเล่นและหมดเร็วที่สุด
// ============================================================

// ตรงกับ check ใน supabase_migration_redeem_codes.sql
export const REDEEM_CODE_MAX = 40
export const REDEEM_REWARD_MAX = 120
export const PATCH_NAME_MAX = 40

const CODE_RE = new RegExp(`^\\S{1,${REDEEM_CODE_MAX}}$`)

export type CodeCheck = { ok: true; code: string } | { ok: false; error: string }

/** ตัดช่องว่างหัวท้าย แล้วตรวจรูปแบบ — โค้ดในเกมไม่สนตัวพิมพ์ จึงกันซ้ำแบบไม่สนตัวพิมพ์ด้วย */
export function validateCode(raw: string, existing: readonly string[] = []): CodeCheck {
  const code = raw.trim()
  if (!code) return { ok: false, error: 'ใส่โค้ดก่อน' }
  if (!CODE_RE.test(code)) return { ok: false, error: `โค้ดต้องไม่มีช่องว่าง และยาวไม่เกิน ${REDEEM_CODE_MAX} ตัว` }
  if (existing.some(c => c.toLowerCase() === code.toLowerCase())) return { ok: false, error: 'มีโค้ดนี้อยู่แล้ว' }
  return { ok: true, code }
}

interface CodeVisibility {
  is_active: boolean
  expires_at: string | null
}

export function isCodeVisible(c: CodeVisibility, now: Date = new Date()): boolean {
  return c.is_active && (!c.expires_at || new Date(c.expires_at) > now)
}

export function visibleCodes<T extends CodeVisibility>(codes: readonly T[], now: Date = new Date()): T[] {
  return codes.filter(c => isCodeVisible(c, now))
}

interface EventTiming {
  start_date: string | null
  end_date: string | null
}

/** อีเวนต์ที่เริ่มแล้วและหมดเร็วที่สุด — อีเวนต์ถาวร (ไม่มีวันจบ) ไม่นับ */
export function pickEndingEvent<T extends EventTiming>(events: readonly T[], now: Date = new Date()): T | null {
  const running = events.filter(e =>
    e.end_date && new Date(e.end_date) > now && (!e.start_date || new Date(e.start_date) <= now))
  if (running.length === 0) return null
  return running.reduce((a, b) => (new Date(b.end_date!) < new Date(a.end_date!) ? b : a))
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** เวลาที่เหลือแบบสั้น: "3 วัน 5 ชม." · "2 ชม. 30 นาที" · "45 นาที" */
export function formatRemaining(ms: number): string {
  const left = Math.max(0, ms)
  const days = Math.floor(left / DAY)
  const hours = Math.floor((left % DAY) / HOUR)
  const minutes = Math.floor((left % HOUR) / MINUTE)
  if (days > 0) return `${days} วัน ${hours} ชม.`
  if (hours > 0) return `${hours} ชม. ${minutes} นาที`
  return `${minutes} นาที`
}
