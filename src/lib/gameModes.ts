import { safeHttpUrl } from './tierList'
import { parsePoints, pointsToText, readPoints, type CnPoint } from './cnGuides'

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

/** โหมดนี้มีข้อมูลเซิร์ฟจีน (ล่วงหน้า) ให้แสดงไหม */
export function hasCnInfo(m: { cn_note: string | null; cn_rules: unknown; cn_season_label: string | null; cn_season_effect: string | null; cn_buffs: unknown; cn_tips: unknown }): boolean {
  const nonEmpty = (v: unknown) => Array.isArray(v) && v.length > 0
  return !!(m.cn_note || m.cn_season_label || m.cn_season_effect) || nonEmpty(m.cn_rules) || nonEmpty(m.cn_buffs) || nonEmpty(m.cn_tips)
}

// ============================================================
// ฟอร์มแอดมิน ↔ แถวในฐานข้อมูล
// ============================================================

/** ช่องของ game_modes ที่แอดมินแก้ได้ (ไม่รวม id / เวลา) */
export interface ModeData {
  slug: string
  name: string
  cn_name: string | null
  verified: boolean
  in_global: boolean
  locked: boolean
  global_menu: string | null
  path: string | null
  tag: string | null
  summary: string | null
  sort_order: number
  global_rules: CnPoint[]
  stages_title: string | null
  stages: ModeStage[]
  season_label: string | null
  season_trait: string | null
  season_ends: string | null
  season_bosses: string[]
  tips: string[]
  shots: ModeShot[]
  cn_note: string | null
  cn_rules: CnPoint[]
  cn_season_label: string | null
  cn_season_effect: string | null
  cn_buffs: CnPoint[]
  cn_tips: string[]
}

export interface ModeForm {
  slug: string
  name: string
  cn_name: string
  verified: boolean
  in_global: boolean
  locked: boolean
  global_menu: string
  path: string
  tag: string
  summary: string
  sort_order: string
  rulesText: string
  stages_title: string
  stagesText: string
  season_label: string
  season_trait: string
  season_ends: string // datetime-local ตามเวลาเครื่อง (ไทย)
  bossesText: string
  tipsText: string
  shots: ModeShot[]
  cn_note: string
  cnRulesText: string
  cn_season_label: string
  cn_season_effect: string
  cnBuffsText: string
  cnTipsText: string
}

export const blankModeForm = (): ModeForm => ({
  slug: '', name: '', cn_name: '', verified: false, in_global: true, locked: false, global_menu: '', path: '', tag: '', summary: '',
  sort_order: '0', rulesText: '', stages_title: '', stagesText: '', season_label: '', season_trait: '', season_ends: '',
  bossesText: '', tipsText: '', shots: [], cn_note: '', cnRulesText: '', cn_season_label: '', cn_season_effect: '', cnBuffsText: '', cnTipsText: '',
})

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO → ค่าสำหรับ <input type="datetime-local" step="1"> ตามเวลาเครื่อง */
export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** ค่าจาก datetime-local (เวลาเครื่อง) → ISO · ว่าง/ผิด = null */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const stagesToText = (stages: ModeStage[]) => stages.map(s => (s.body ? `${s.title}: ${s.body}` : s.title)).join('\n')
const orNull = (s: string) => (s.trim() ? s.trim() : null)

export function modeFormFromRow(row: Record<string, unknown> & { slug: string; name: string }): ModeForm {
  const text = (k: string) => (typeof row[k] === 'string' ? row[k] as string : '')
  return {
    slug: row.slug, name: row.name, cn_name: text('cn_name'),
    verified: row.verified === true, in_global: row.in_global !== false, locked: row.locked === true,
    global_menu: text('global_menu'), path: text('path'), tag: text('tag'), summary: text('summary'),
    sort_order: String(typeof row.sort_order === 'number' ? row.sort_order : 0),
    rulesText: pointsToText(readPoints(row.global_rules)),
    stages_title: text('stages_title'), stagesText: stagesToText(readStages(row.stages)),
    season_label: text('season_label'), season_trait: text('season_trait'), season_ends: toLocalInput(text('season_ends') || null),
    bossesText: readStrings(row.season_bosses).join('\n'), tipsText: readStrings(row.tips).join('\n'), shots: readShots(row.shots),
    cn_note: text('cn_note'), cnRulesText: pointsToText(readPoints(row.cn_rules)),
    cn_season_label: text('cn_season_label'), cn_season_effect: text('cn_season_effect'),
    cnBuffsText: pointsToText(readPoints(row.cn_buffs)), cnTipsText: readStrings(row.cn_tips).join('\n'),
  }
}

export function modePayload(f: ModeForm): ModeData {
  return {
    slug: f.slug.trim(), name: f.name.trim(), cn_name: orNull(f.cn_name),
    verified: f.verified, in_global: f.in_global, locked: f.locked,
    global_menu: orNull(f.global_menu), path: orNull(f.path), tag: orNull(f.tag), summary: orNull(f.summary),
    sort_order: Number.parseInt(f.sort_order, 10) || 0,
    global_rules: parsePoints(f.rulesText), stages_title: orNull(f.stages_title), stages: parseStages(f.stagesText),
    season_label: orNull(f.season_label), season_trait: orNull(f.season_trait), season_ends: fromLocalInput(f.season_ends),
    season_bosses: parseLines(f.bossesText), tips: parseLines(f.tipsText),
    shots: f.shots.filter(s => safeHttpUrl(s.url)).map(s => ({ url: s.url, caption: s.caption.trim() })),
    cn_note: orNull(f.cn_note), cn_rules: parsePoints(f.cnRulesText),
    cn_season_label: orNull(f.cn_season_label), cn_season_effect: orNull(f.cn_season_effect),
    cn_buffs: parsePoints(f.cnBuffsText), cn_tips: parseLines(f.cnTipsText),
  }
}

/** ข้อความผิดพลาดภาษาไทย (ว่าง = บันทึกได้) */
export function validateMode(input: { name: string; slug: string; summary: string }): string[] {
  const errors: string[] = []
  if (!input.name.trim()) errors.push('ใส่ชื่อโหมด')
  if (!MODE_SLUG_RE.test(input.slug.trim())) errors.push('slug ใช้ได้แค่ a-z 0-9 และ - เช่น dark-area')
  return errors
}
