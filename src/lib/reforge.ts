import type {
  ReforgeData,
  ReforgeEffect,
  ReforgeExAnchor,
  ReforgeGuideBuild,
  ReforgeNode,
  ReforgePreset,
  ReforgeStat,
} from '../types/models'

// ============================================================
// Reforge — logic ล้วน ไม่แตะ React / Supabase
// หน้าเว็บให้ผู้เล่นเปิด/ปิดโหนดได้อิสระเพื่อดูผลตอนปลดครบ:
// ไม่บังคับลำดับ ไม่ล็อก stage และ COST เกินได้ (แค่เตือน)
// ข้อบังคับเดียวคือ choice_group เปิดได้ทีละ 1
// ============================================================

export const DEFAULT_COST_BASE = 21
const BUILD_SEPARATOR = '.'
// id โหนดต้องไม่มีตัวคั่น build และใช้ใน URL ได้ตรง ๆ
const NODE_ID_PATTERN = /^[A-Za-z0-9_-]+$/

const NODE_CATEGORIES = new Set(['attribute', 'special'])
const NODE_ROWS = new Set(['top', 'bottom'])
const EFFECT_TYPES = new Set(['intensify', 'leap', 'cost'])

// ---- COST ---------------------------------------------------

export function costCap(data: ReforgeData): number {
  return data.cost_base + data.cost_bonus
}

export function totalCost(data: ReforgeData, activeIds: readonly string[]): number {
  const active = new Set(activeIds)
  return data.nodes.reduce((sum, n) => (active.has(n.id) ? sum + n.cost : sum), 0)
}

export function isOverCap(data: ReforgeData, activeIds: readonly string[]): boolean {
  return totalCost(data, activeIds) > costCap(data)
}

// ---- การเปิด/ปิดโหนด -----------------------------------------

/** สลับสถานะโหนด — ถ้าอยู่ใน choice_group จะปิดตัวอื่นในกลุ่มให้เอง คืน array ใหม่เสมอ */
export function toggleNode(data: ReforgeData, activeIds: readonly string[], nodeId: string): string[] {
  const target = data.nodes.find(n => n.id === nodeId)
  if (!target) return [...activeIds]
  if (activeIds.includes(nodeId)) return activeIds.filter(id => id !== nodeId)

  const rivals = new Set(
    target.choice_group
      ? data.nodes.filter(n => n.choice_group === target.choice_group).map(n => n.id)
      : [],
  )
  return [...activeIds.filter(id => !rivals.has(id)), nodeId]
}

/** เปิดทุกโหนด โดย choice_group เลือกตัวแรกของกลุ่ม */
export function activateAll(data: ReforgeData): string[] {
  return sanitizeBuild(data, data.nodes.map(n => n.id))
}

/** กรอง id ที่ไม่มีจริง / ซ้ำ / ชนกันใน choice_group — ตัวที่มาก่อนชนะ */
export function sanitizeBuild(data: ReforgeData, ids: readonly string[]): string[] {
  const byId = new Map(data.nodes.map(n => [n.id, n]))
  const picked: string[] = []
  const usedGroups = new Set<string>()

  for (const id of ids) {
    const n = byId.get(id)
    if (!n || picked.includes(id)) continue
    if (n.choice_group) {
      if (usedGroups.has(n.choice_group)) continue
      usedGroups.add(n.choice_group)
    }
    picked.push(id)
  }
  return picked
}

// ---- ผลรวมสเตตัส ---------------------------------------------

const roundStat = (v: number) => Math.round(v * 1000) / 1000

/** รวมสเตตัสจาก Reforge Effect (ปลดครบเสมอ) + โหนดที่เปิดอยู่ จัดกลุ่มตาม label + unit */
export function sumStats(data: ReforgeData, activeIds: readonly string[]): ReforgeStat[] {
  const active = new Set(activeIds)
  const sources = [
    ...data.effects.flatMap(e => e.stats),
    ...data.nodes.filter(n => active.has(n.id)).flatMap(n => n.stats ?? []),
  ]

  const totals = new Map<string, ReforgeStat>()
  for (const s of sources) {
    const key = `${s.label}\u0000${s.unit}`
    const prev = totals.get(key)
    totals.set(key, { label: s.label, unit: s.unit, value: roundStat((prev?.value ?? 0) + s.value) })
  }
  return [...totals.values()]
}

// ---- แชร์ build ผ่าน URL ------------------------------------

export function encodeBuild(activeIds: readonly string[]): string {
  return activeIds.join(BUILD_SEPARATOR)
}

export function decodeBuild(data: ReforgeData, encoded: string | null | undefined): string[] {
  if (!encoded) return []
  return sanitizeBuild(data, encoded.split(BUILD_SEPARATOR))
}

// ---- build ที่แนบในไกด์ -----------------------------------------

/** แปลงสถานะในฟอร์มเป็นค่าที่เก็บลง DB — ไม่ได้เลือกอะไรเลย = null */
export function toGuideBuild(activeIds: readonly string[], exId: string | null): ReforgeGuideBuild | null {
  if (activeIds.length === 0 && !exId) return null
  return { nodes: [...activeIds], ex: exId }
}

export interface ParsedGuideBuild extends ReforgeGuideBuild {
  missing: number   // โหนดที่ถูกลบจากต้นไม้หลังไกด์ถูกเขียน
}

/** อ่าน build จากไกด์เทียบกับต้นไม้ปัจจุบัน — ข้อมูลเสีย/ว่างคืน null */
export function parseGuideBuild(raw: unknown, data: ReforgeData): ParsedGuideBuild | null {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) return null
  const ids = raw.nodes.filter(isStr)
  const ex = isStr(raw.ex) && raw.ex !== '' ? raw.ex : null
  if (ids.length === 0 && !ex) return null

  const known = new Set(data.nodes.map(n => n.id))
  return {
    nodes: sanitizeBuild(data, ids),
    ex,
    missing: new Set(ids.filter(id => !known.has(id))).size,
  }
}

let idCounter = 0

/** id สั้น ใช้ใน URL ได้ ไม่มีตัวคั่น build — เช่น n_lx3k2a0 */
export function newReforgeId(prefix: string): string {
  idCounter = (idCounter + 1) % 1296
  const time = Date.now().toString(36)
  const rand = Math.floor(Math.random() * 1296).toString(36)
  return `${prefix}_${time}${idCounter.toString(36)}${rand}`
}

// ---- อ่าน jsonb จาก DB (ข้อมูลภายนอก — ห้ามเชื่อ) -----------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isStr = (v: unknown): v is string => typeof v === 'string'

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function isNode(v: unknown): v is ReforgeNode {
  return isRecord(v)
    && isStr(v.id) && v.id !== ''
    && isStr(v.name)
    && NODE_CATEGORIES.has(v.category as string)
    && isNum(v.cost) && isNum(v.stage) && isNum(v.col)
    && NODE_ROWS.has(v.row as string)
}

function isEffect(v: unknown): v is ReforgeEffect {
  return isRecord(v) && isStr(v.id) && isNum(v.stage)
    && EFFECT_TYPES.has(v.type as string) && Array.isArray(v.stats)
}

function isPreset(v: unknown): v is ReforgePreset {
  return isRecord(v) && isStr(v.id) && isStr(v.name) && Array.isArray(v.node_ids)
}

function parseExAnchor(v: unknown): ReforgeExAnchor | undefined {
  if (!isRecord(v) || !isStr(v.name) || !isStr(v.description)) return undefined
  return { ...(v as unknown as ReforgeExAnchor), exclusive_classes: asArray(v.exclusive_classes).filter(isStr) }
}

/** คืน null ถ้าตัวละครไม่มีข้อมูล Reforge ที่ใช้ได้ (ไม่มีทั้งโหนดและ EX) */
export function parseReforge(raw: unknown): ReforgeData | null {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) return null

  const nodes = raw.nodes.filter(isNode)
  const exAnchor = parseExAnchor(raw.ex_anchor)
  if (nodes.length === 0 && !exAnchor) return null

  return {
    cost_base: isNum(raw.cost_base) ? raw.cost_base : DEFAULT_COST_BASE,
    cost_bonus: isNum(raw.cost_bonus) ? raw.cost_bonus : 0,
    nodes,
    effects: asArray(raw.effects).filter(isEffect),
    presets: asArray(raw.presets).filter(isPreset),
    ...(exAnchor ? { ex_anchor: exAnchor } : {}),
  }
}

// ---- ตรวจข้อมูลก่อนแอดมินบันทึก -------------------------------

/** คืนรายการข้อผิดพลาด (ภาษาไทย แสดงใน UI ได้เลย) — ว่าง = บันทึกได้ */
export function validateReforge(data: ReforgeData): string[] {
  const errors: string[] = []
  const ids = new Set(data.nodes.map(n => n.id))

  if (data.cost_base < 0 || data.cost_bonus < 0) errors.push('COST ฐาน/โบนัส ต้องไม่ติดลบ')

  const seen = new Set<string>()
  for (const n of data.nodes) {
    if (seen.has(n.id)) errors.push(`id โหนดซ้ำ: ${n.id}`)
    seen.add(n.id)
    if (!NODE_ID_PATTERN.test(n.id)) errors.push(`id ของ "${n.name}" ใช้ได้แค่ a-z A-Z 0-9 _ - (id นี้อยู่ในลิงก์แชร์ build)`)
    if (n.cost < 0) errors.push(`COST ของ "${n.name}" ต้องไม่ติดลบ`)
    if (n.stage < 1) errors.push(`Stage ของ "${n.name}" ต้องเริ่มที่ 1`)
    if (n.linked_to && !ids.has(n.linked_to)) errors.push(`"${n.name}" เชื่อมไปโหนดที่ไม่มีอยู่`)
  }

  const groupSizes = new Map<string, number>()
  for (const n of data.nodes) {
    if (n.choice_group) groupSizes.set(n.choice_group, (groupSizes.get(n.choice_group) ?? 0) + 1)
  }
  for (const [group, size] of groupSizes) {
    if (size < 2) errors.push(`กลุ่ม Choice "${group}" ต้องมีอย่างน้อย 2 โหนด`)
  }

  // ช่องเดียวกันวางได้หลายโหนดเฉพาะเมื่ออยู่ใน choice_group เดียวกัน (คู่ Choice ซ้อนบน-ล่าง)
  const slots = new Map<string, ReforgeNode>()
  for (const n of data.nodes) {
    const key = `${n.stage}-${n.row}-${n.col}`
    const other = slots.get(key)
    if (other && (!n.choice_group || other.choice_group !== n.choice_group)) {
      errors.push(`"${other.name}" กับ "${n.name}" อยู่ตำแหน่งเดียวกัน (Stage ${n.stage}, ${n.row}, คอลัมน์ ${n.col})`)
    }
    if (!other) slots.set(key, n)
  }

  for (const p of data.presets) {
    if (p.node_ids.some(id => !ids.has(id))) errors.push(`ชุด "${p.name}" อ้างถึงโหนดที่ไม่มีอยู่`)
  }

  return errors
}

// ---- Overlimit Anchor (EX) -----------------------------------

export interface ExAnchorOption {
  character_id: string
  character_name: string
  anchor: ReforgeExAnchor
}

/** EX ทุกตัวที่ตัวละครคลาสนี้ใส่ได้ — exclusive_classes ว่าง = ใส่ได้ทุกคลาส */
export function eligibleExAnchors(
  characters: readonly { id: string; name: string; reforge: unknown }[],
  jobClass: string,
): ExAnchorOption[] {
  return characters.flatMap(c => {
    const anchor = parseReforge(c.reforge)?.ex_anchor
    if (!anchor) return []
    const open = anchor.exclusive_classes.length === 0 || anchor.exclusive_classes.includes(jobClass)
    return open ? [{ character_id: c.id, character_name: c.name, anchor }] : []
  })
}
