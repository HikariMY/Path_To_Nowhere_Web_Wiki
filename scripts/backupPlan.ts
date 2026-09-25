// ============================================================
// Backup รายคืน — logic ล้วน (ทดสอบได้) แยกจากตัวที่คุยกับ Supabase ใน backup.ts
// ============================================================

/** ตารางที่ backup — เนื้อหาเว็บ + ฟอรัม + profiles (ไม่มีอีเมล/รหัสผ่าน แต่ต้องมีไว้ผูกผู้เขียนตอนกู้คืน) */
export const BACKUP_TABLES = [
  'characters',
  'crimebrands',
  'character_crimebrand_builds',
  'character_guides',
  'character_guide_votes',
  'events',
  'announcements',
  'game_info',
  'tier_lists',
  'tier_list_votes',
  'forum_categories',
  'forum_posts',
  'forum_replies',
  'profiles',
] as const

export const BACKUP_BUCKET = 'backups'

/** เก็บ backup ย้อนหลังกี่วัน */
export const KEEP_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000
const THAI_OFFSET_MS = 7 * 60 * 60 * 1000
const BACKUP_NAME = /^(\d{4}-\d{2}-\d{2})\.json$/

const thaiDate = (time: number): string => new Date(time + THAI_OFFSET_MS).toISOString().slice(0, 10)

/** ชื่อไฟล์ตามวันที่เวลาไทย เช่น 2026-09-26.json */
export function backupFileName(now: Date): string {
  return `${thaiDate(now.getTime())}.json`
}

/** ไฟล์ backup ที่เก่ากว่า KEEP_DAYS วัน — ไฟล์ที่ไม่ได้ตั้งชื่อตามวันที่ (เช่น backup มือ) ไม่แตะ */
export function filesToPrune(names: readonly string[], now: Date): string[] {
  const oldestKept = thaiDate(now.getTime() - (KEEP_DAYS - 1) * DAY_MS)
  return names.filter(name => {
    const date = BACKUP_NAME.exec(name)?.[1]
    return date !== undefined && date < oldestKept
  })
}
