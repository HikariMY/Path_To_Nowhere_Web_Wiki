import { safeHttpUrl } from './tierList'

// ============================================================
// สรุปไกด์จากผู้เล่นเซิร์ฟจีน — logic ล้วน ไม่แตะ React / Supabase
// ทีมงานเขียนสรุปเอง (ไม่แปลทั้งบท) + เครดิตผู้เขียน + ลิงก์ต้นฉบับ
// ============================================================

export const CN_VERDICT_MAX = 120
export const CN_POINTS_MAX = 12
export const CN_POINT_TITLE_MAX = 40
export const CN_POINT_BODY_MAX = 400
export const CN_STALE_DAYS = 60

export interface CnPoint {
  title: string
  body: string
}

const cut = (text: string, max: number) => [...text].slice(0, max).join('')

/** "หัวข้อ: รายละเอียด" บรรทัดละข้อ — ตัดที่ ":" ตัวแรกเท่านั้น บรรทัดไม่มี ":" = ไม่มีหัวข้อ */
export function parsePoints(text: string): CnPoint[] {
  return text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const at = line.indexOf(':')
      const title = at > 0 ? line.slice(0, at).trim() : ''
      const body = at > 0 ? line.slice(at + 1).trim() : line
      return { title: cut(title, CN_POINT_TITLE_MAX), body: cut(body, CN_POINT_BODY_MAX) }
    })
    .filter(p => p.body)
    .slice(0, CN_POINTS_MAX)
}

export function pointsToText(points: readonly CnPoint[]): string {
  return points.map(p => (p.title ? `${p.title}: ${p.body}` : p.body)).join('\n')
}

/** อ่าน points จาก jsonb แบบไม่เชื่อชนิดข้อมูล */
export function readPoints(value: unknown): CnPoint[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(v => {
    if (!v || typeof v !== 'object') return []
    const { title, body } = v as Record<string, unknown>
    if (typeof body !== 'string' || !body) return []
    return [{ title: typeof title === 'string' ? title : '', body }]
  })
}

export interface CnGuideInput {
  verdict: string
  pointsText: string
  source_title: string
  source_author: string
  source_url: string
}

/** ข้อความผิดพลาดภาษาไทย (ว่าง = บันทึกได้) — ต้องมีประเด็นและเครดิตครบทุกครั้ง */
export function validateCnGuide(input: CnGuideInput): string[] {
  const errors: string[] = []
  if ([...input.verdict.trim()].length > CN_VERDICT_MAX) errors.push(`สรุปสั้นยาวเกิน ${CN_VERDICT_MAX} ตัวอักษร`)
  if (parsePoints(input.pointsText).length === 0) errors.push('ใส่ประเด็นอย่างน้อย 1 ข้อ')
  if (!input.source_title.trim()) errors.push('ใส่ชื่อบทความต้นฉบับ')
  if (!input.source_author.trim()) errors.push('ใส่ชื่อผู้เขียนต้นฉบับ')
  if (!safeHttpUrl(input.source_url) || !/^https?:\/\//i.test(input.source_url.trim())) errors.push('ลิงก์ต้นฉบับต้องขึ้นต้นด้วย https://')
  return errors
}

/** ไม่ได้ตรวจกับต้นฉบับเกิน 60 วัน (ข้อมูลเกมเปลี่ยนตามแพตช์) — วันที่หาย/ผิด = ต้องตรวจ */
export function isStale(checkedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!checkedAt) return true
  const t = new Date(checkedAt).getTime()
  if (Number.isNaN(t)) return true
  return now.getTime() - t > CN_STALE_DAYS * 864e5
}
