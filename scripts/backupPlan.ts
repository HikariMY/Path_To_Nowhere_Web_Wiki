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
  'favorite_characters',
  'reports',
] as const

/** ตารางใหม่ที่อาจยังไม่ได้รัน migration — ถ้าหาไม่เจอให้ข้ามได้ (ตารางหลักหาไม่เจอต้องล้มดัง ๆ) */
const OPTIONAL_TABLES: ReadonlySet<string> = new Set(['favorite_characters', 'reports'])

/**
 * ข้ามตารางนี้ได้ไหม — เฉพาะตารางใน OPTIONAL_TABLES และเฉพาะ error "ไม่มีตาราง"
 * PGRST205 = PostgREST หาตารางไม่เจอ, 42P01 = Postgres undefined_table
 */
export function canSkipMissingTable(table: string, error: { code?: string }): boolean {
  return OPTIONAL_TABLES.has(table) && (error.code === 'PGRST205' || error.code === '42P01')
}

// คอลัมน์ที่ใช้เรียงตอนดึงทีละหน้า ต้องไม่ซ้ำกันทั้งตาราง
// game_info บนฐานข้อมูลจริงไม่มีคอลัมน์ id (สร้างก่อนสคริปต์ใน repo) — แถวไม่ซ้ำกันด้วย (category, key)
const ORDER_OVERRIDES: Partial<Record<string, readonly string[]>> = {
  game_info: ['category', 'key'],
}

/** คอลัมน์เรียงลำดับของตาราง — ค่าเริ่มต้นคือ id */
export function orderColumns(table: string): readonly string[] {
  return ORDER_OVERRIDES[table] ?? ['id']
}

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
