// ============================================================
// รายงานข้อมูลตัวละครที่ยังกรอกไม่ครบ (หน้าแอดมิน /admin/data-gaps) — logic ล้วน
// ============================================================

/** คอลัมน์ของตัวละครที่ใช้ตรวจ — ตรงกับที่หน้าแอดมิน select มา */
export interface GapCharacter {
  id: string
  slug: string
  name: string
  portrait_url: string | null
  overview: string | null
  release_date: string | null
  stats: unknown
  skills: unknown
  shackles: unknown
  ability_tags: string[] | null
  is_unreleased: boolean
  release_order: number | null
  created_at: string
}

export type DataCheckKey =
  | 'portrait' | 'overview' | 'release_date' | 'stats' | 'skills' | 'shackles' | 'ability_tags' | 'builds'

interface DataCheck {
  key: DataCheckKey
  label: string
  isMissing: (char: GapCharacter, buildCount: number) => boolean
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === ''
const isEmptyList = (value: unknown): boolean => !Array.isArray(value) || value.length === 0

/** มีค่าสถานะอย่างน้อยหนึ่งช่อง (เหมือนเงื่อนไขที่หน้าตัวละครใช้ตัดสินว่าจะโชว์การ์ดค่าสถานะ) */
const hasAnyStat = (stats: unknown): boolean =>
  typeof stats === 'object' && stats !== null
  && Object.values(stats).some(pair =>
    typeof pair === 'object' && pair !== null && !isBlank(String((pair as { min?: unknown }).min ?? '')))

/** รายการที่ตรวจ เรียงตามลำดับที่แสดงในตาราง — Reforge ไม่นับ เพราะไม่ได้มีทุกตัว */
export const DATA_CHECKS: readonly DataCheck[] = [
  { key: 'portrait',     label: 'รูป',             isMissing: c => isBlank(c.portrait_url) },
  { key: 'overview',     label: 'คำอธิบาย',        isMissing: c => isBlank(c.overview) },
  { key: 'release_date', label: 'วันที่ออก',        isMissing: c => isBlank(c.release_date) },
  { key: 'stats',        label: 'ค่าสถานะ',         isMissing: c => !hasAnyStat(c.stats) },
  { key: 'skills',       label: 'สกิล',            isMissing: c => isEmptyList(c.skills) },
  { key: 'shackles',     label: 'Shackle',          isMissing: c => isEmptyList(c.shackles) },
  { key: 'ability_tags', label: 'Ability tags',     isMissing: c => isEmptyList(c.ability_tags) },
  { key: 'builds',       label: 'Crimebrand build', isMissing: (_c, builds) => builds === 0 },
]

export interface DataGap {
  character: GapCharacter
  missing: DataCheckKey[]
}

// release_order ว่างหรือ 0 = เพิ่งเพิ่มในแอดมิน ยังไม่ได้รันสคริปต์ใส่ลำดับ → น่าจะใหม่สุด
const hasReleaseOrder = (c: GapCharacter): boolean => (c.release_order ?? 0) > 0

/** ตัวที่ยังไม่มีลำดับขึ้นก่อน → release_order มากไปน้อย → สร้างล่าสุดก่อน */
const newestFirst = (a: GapCharacter, b: GapCharacter): number =>
  Number(hasReleaseOrder(a)) - Number(hasReleaseOrder(b))
  || (b.release_order ?? 0) - (a.release_order ?? 0)
  || b.created_at.localeCompare(a.created_at)

/** ตัวละครที่ออกแล้วแต่ข้อมูลยังไม่ครบ พร้อมรายการที่ขาด เรียงตัวใหม่สุดขึ้นก่อน */
export function findDataGaps(
  characters: readonly GapCharacter[],
  buildCounts: ReadonlyMap<string, number>,
): DataGap[] {
  return characters
    .filter(char => !char.is_unreleased)
    .map(char => ({
      character: char,
      missing: DATA_CHECKS.filter(check => check.isMissing(char, buildCounts.get(char.id) ?? 0)).map(check => check.key),
    }))
    .filter(gap => gap.missing.length > 0)
    .sort((a, b) => newestFirst(a.character, b.character))
}
