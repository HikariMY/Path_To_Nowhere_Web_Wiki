// ============================================================
// ป้าย NEW บนการ์ดตัวละคร — ขึ้นเองตามวันที่ออก ไม่ต้องไปติ๊กในแอดมินทุกครั้ง
// ============================================================

/** โชว์ป้าย NEW กี่วันนับจากวันที่ออก (รวมวันที่ออก) */
export const NEW_BADGE_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

interface NewBadgeFields {
  release_date: string | null
  is_new: boolean
  is_unreleased: boolean
}

/**
 * ป้าย NEW ขึ้นเมื่อ
 * - แอดมินติ๊ก is_new ไว้ (บังคับโชว์) หรือ
 * - ออกแล้ว และวันนี้ (เวลาไทย) อยู่ภายใน NEW_BADGE_DAYS วันนับจาก release_date
 */
export function isNewCharacter(char: NewBadgeFields, now: Date = new Date()): boolean {
  if (char.is_new) return true
  if (char.is_unreleased || !char.release_date) return false
  // release_date เป็นวันที่ตามเวลาไทย — เริ่มนับตอนเที่ยงคืนเวลาไทย
  const releasedAt = Date.parse(`${char.release_date}T00:00:00+07:00`)
  if (Number.isNaN(releasedAt)) return false
  const elapsed = now.getTime() - releasedAt
  return elapsed >= 0 && elapsed < NEW_BADGE_DAYS * DAY_MS
}
