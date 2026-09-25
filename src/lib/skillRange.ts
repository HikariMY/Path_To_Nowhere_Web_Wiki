import type { SkillRange } from '../types/models'

// ขนาด grid ที่แอดมินเลือกได้ — ใช้ร่วมกันทั้งฟอร์มสกิลและ Exclusive Crimebrand
// ขนาดอื่นของ s1n ให้ยัดลงขนาดที่ใหญ่กว่าแล้วเว้นช่องว่าง (เช่น 1×4 → 3×4)
// label ใช้ตัวคูณ × (U+00D7) — ปุ่มที่เลือกอยู่ดูจาก rows/cols ไม่ได้เทียบ label
export const GRID_PRESETS: readonly { label: string; rows: number; cols: number }[] = [
  { label: '1×1', rows: 1, cols: 1 },
  { label: '3×3', rows: 3, cols: 3 },
  { label: '3×4', rows: 3, cols: 4 },
  { label: '3×5', rows: 3, cols: 5 },
  { label: '5×5', rows: 5, cols: 5 },
  { label: '3×6', rows: 3, cols: 6 },
  { label: '1×8', rows: 1, cols: 8 },
  { label: '3×8', rows: 3, cols: 8 },
]

const hasCells = (r: SkillRange | null | undefined): r is SkillRange => (r?.cells?.length ?? 0) > 0

/** range ของสกิลที่มีข้อมูลจริง เรียงตาม range → range2 → range3 (สูงสุด 3 อัน เช่นยิงได้ 3 ทิศ) */
export function skillRanges(skill: {
  range?: SkillRange | null
  range2?: SkillRange | null
  range3?: SkillRange | null
}): SkillRange[] {
  return [skill.range, skill.range2, skill.range3].filter(hasCells)
}

/** ขนาดช่องในหน้าตัวละคร — grid ยิ่งกว้างช่องยิ่งเล็ก ไม่ให้ล้นจอมือถือ */
export function rangeCellSize(cols: number): string {
  if (cols >= 6) return '1.2rem'
  if (cols >= 5) return '1.4rem'
  return '1.75rem'
}
