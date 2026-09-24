import type {
  ReforgeData,
  ReforgeExAnchor,
  ReforgeGuideBuild,
  ReforgeMaterial,
  ReforgeNode,
  ReforgeNodeCategory,
  ReforgePreset,
  ReforgeSlotId,
  ReforgeStageInfo,
  ReforgeStat,
} from '../types/models'

// ============================================================
// Reforge — logic ล้วน ไม่แตะ React / Supabase
// หน้าเว็บให้ผู้เล่นเปิด/ปิดโหนดได้อิสระเพื่อดูผลตอนปลดครบ:
// ไม่บังคับลำดับ ไม่ล็อก stage และ COST เกินได้ (แค่เตือน)
// ข้อบังคับเดียวคือโหนดที่อยู่ช่องเดียวกัน (คู่ Choice) เปิดได้ทีละ 1
// ============================================================

// ---- layout ตายตัว เหมือนกันทุกตัวละคร ---------------------------------

export const REFORGE_STAGES = [1, 2, 3, 4] as const

export interface ReforgeSlotDef {
  id: ReforgeSlotId
  stage: number
  row: 'top' | 'bottom'
  side: 'a' | 'b'            // a = ซ้าย, b = ขวา (เส้นเชื่อม a ─ b ในแถวเดียวกัน)
  category: ReforgeNodeCategory
  defaultCost: number
  allowChoice: boolean       // ใส่ได้ 2 โหนดเป็นคู่ Choice
}

const slot = (id: ReforgeSlotId, category: ReforgeNodeCategory, defaultCost: number): ReforgeSlotDef => {
  const [s, row, side] = id.split('-')
  return {
    id,
    stage: Number(s.slice(1)),
    row: row === 'top' ? 'top' : 'bottom',
    side: side === 'a' ? 'a' : 'b',
    category,
    defaultCost,
    allowChoice: side === 'b',
  }
}

// ตามภาพในเกม: S1 1─3 / 1─3, S2 2─5 / 2─5, S3 2 / 2 + ช่อง EX, S4 — / 5─3
export const REFORGE_SLOTS: readonly ReforgeSlotDef[] = [
  slot('s1-top-a', 'attribute', 1), slot('s1-top-b', 'special', 3),
  slot('s1-bot-a', 'attribute', 1), slot('s1-bot-b', 'special', 3),
  slot('s2-top-a', 'attribute', 2), slot('s2-top-b', 'special', 5),
  slot('s2-bot-a', 'attribute', 2), slot('s2-bot-b', 'special', 5),
  slot('s3-top-a', 'attribute', 2),
  slot('s3-bot-a', 'attribute', 2),
  slot('s4-bot-a', 'special', 5), slot('s4-bot-b', 'special', 3),
]

const SLOT_BY_ID = new Map(REFORGE_SLOTS.map(s => [s.id, s]))

export function slotDef(id: ReforgeSlotId): ReforgeSlotDef {
  const def = SLOT_BY_ID.get(id)
  if (!def) throw new Error(`unknown reforge slot: ${id}`)
  return def
}

export const isSlotId = (v: unknown): v is ReforgeSlotId => typeof v === 'string' && SLOT_BY_ID.has(v as ReforgeSlotId)

export function nodeCategory(node: Pick<ReforgeNode, 'slot'>): ReforgeNodeCategory {
  return slotDef(node.slot).category
}

// วงรางวัลของแต่ละ Stage: วง Intensify (DNA) ทุก Stage, วง COST (Leap) ใน Stage 3–4
export type ReforgeOrb = 'intensify' | 'leap'
export const STAGE_ORBS: Record<number, readonly ReforgeOrb[]> = {
  1: ['intensify'],
  2: ['intensify'],
  3: ['leap', 'intensify'],
  4: ['leap', 'intensify'],
}

// ช่อง EX อยู่ Stage 3 แถวล่างขวา
export const EX_SLOT_STAGE = 3

// ---- COST (ค่าคงที่ของระบบ เหมือนกันทุกตัวละคร) ------------------------

// "COST limit can still be increased" เมื่อปลดถึง Stage I–IV
export const STAGE_COST_CAPS = [4, 8, 12, 16] as const
// วง COST สองวง (Stage 3–4) เพิ่มเพดานรวม +5 — ในเกมแสดงเป็น 21/21(+5)
export const COST_LEAP_BONUS = 5
export const COST_CAP = STAGE_COST_CAPS[STAGE_COST_CAPS.length - 1] + COST_LEAP_BONUS

export const MAX_MATERIALS_PER_STAGE = 2

const BUILD_SEPARATOR = '.'
// id โหนดต้องไม่มีตัวคั่น build และใช้ใน URL ได้ตรง ๆ
const NODE_ID_PATTERN = /^[A-Za-z0-9_-]+$/

export function totalCost(data: ReforgeData, activeIds: readonly string[]): number {
  const active = new Set(activeIds)
  return data.nodes.reduce((sum, n) => (active.has(n.id) ? sum + n.cost : sum), 0)
}

export function isOverCap(data: ReforgeData, activeIds: readonly string[]): boolean {
  return totalCost(data, activeIds) > COST_CAP
}

// ---- การเปิด/ปิดโหนด -----------------------------------------

/** สลับสถานะโหนด — ถ้าช่องเดียวกันมีอีกตัว (คู่ Choice) จะปิดให้เอง คืน array ใหม่เสมอ */
export function toggleNode(data: ReforgeData, activeIds: readonly string[], nodeId: string): string[] {
  const target = data.nodes.find(n => n.id === nodeId)
  if (!target) return [...activeIds]
  if (activeIds.includes(nodeId)) return activeIds.filter(id => id !== nodeId)

  const rivals = new Set(data.nodes.filter(n => n.slot === target.slot).map(n => n.id))
  return [...activeIds.filter(id => !rivals.has(id)), nodeId]
}

/** เปิดทุกโหนด โดยคู่ Choice เลือกตัวแรกของช่อง */
export function activateAll(data: ReforgeData): string[] {
  return sanitizeBuild(data, data.nodes.map(n => n.id))
}

/** กรอง id ที่ไม่มีจริง / ซ้ำ / ชนกันในช่องเดียวกัน — ตัวที่มาก่อนชนะ */
export function sanitizeBuild(data: ReforgeData, ids: readonly string[]): string[] {
  const byId = new Map(data.nodes.map(n => [n.id, n]))
  const picked: string[] = []
  const usedSlots = new Set<ReforgeSlotId>()

  for (const id of ids) {
    const n = byId.get(id)
    if (!n || usedSlots.has(n.slot)) continue
    usedSlots.add(n.slot)
    picked.push(id)
  }
  return picked
}

// ---- ผลรวมสเตตัส ---------------------------------------------

const roundStat = (v: number) => Math.round(v * 1000) / 1000

/** รวมสเตตัสจากวง Intensify ทุก Stage (ปลดครบเสมอ) + โหนดที่เปิดอยู่ จัดกลุ่มตาม label + unit */
export function sumStats(data: ReforgeData, activeIds: readonly string[]): ReforgeStat[] {
  const active = new Set(activeIds)
  const sources = [
    ...data.stages.flatMap(s => s.intensify),
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
    && isSlotId(v.slot)
    && isNum(v.cost)
}

function isStat(v: unknown): v is ReforgeStat {
  return isRecord(v) && isStr(v.label) && isNum(v.value) && (v.unit === 'percent' || v.unit === 'flat')
}

function isMaterial(v: unknown): v is ReforgeMaterial {
  return isRecord(v) && isStr(v.name) && isNum(v.qty)
}

function isPreset(v: unknown): v is ReforgePreset {
  return isRecord(v) && isStr(v.id) && isStr(v.name) && Array.isArray(v.node_ids)
}

function parseExAnchor(v: unknown): ReforgeExAnchor | undefined {
  if (!isRecord(v) || !isStr(v.name) || !isStr(v.description)) return undefined
  return { ...(v as unknown as ReforgeExAnchor), exclusive_classes: asArray(v.exclusive_classes).filter(isStr) }
}

/** คืน Stage ครบ 1–4 เสมอ — Stage ที่ไม่มีข้อมูลได้ค่าว่าง */
function parseStages(raw: unknown): ReforgeStageInfo[] {
  const byStage = new Map<number, Record<string, unknown>>()
  for (const s of asArray(raw)) {
    if (isRecord(s) && isNum(s.stage)) byStage.set(s.stage, s)
  }
  return REFORGE_STAGES.map(stage => {
    const s = byStage.get(stage)
    return {
      stage,
      intensify: asArray(s?.intensify).filter(isStat),
      materials: asArray(s?.materials).filter(isMaterial),
    }
  })
}

/** คืน null ถ้าตัวละครไม่มีข้อมูล Reforge ที่ใช้ได้ (ไม่มีทั้งโหนดและ EX) */
export function parseReforge(raw: unknown): ReforgeData | null {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) return null

  const nodes = raw.nodes.filter(isNode)
  const exAnchor = parseExAnchor(raw.ex_anchor)
  if (nodes.length === 0 && !exAnchor) return null

  return {
    nodes,
    stages: parseStages(raw.stages),
    presets: asArray(raw.presets).filter(isPreset),
    ...(exAnchor ? { ex_anchor: exAnchor } : {}),
  }
}

// ---- ตรวจข้อมูลก่อนแอดมินบันทึก -------------------------------

/** คืนรายการข้อผิดพลาด (ภาษาไทย แสดงใน UI ได้เลย) — ว่าง = บันทึกได้ */
export function validateReforge(data: ReforgeData): string[] {
  const errors: string[] = []
  const ids = new Set(data.nodes.map(n => n.id))

  const seen = new Set<string>()
  for (const n of data.nodes) {
    if (seen.has(n.id)) errors.push(`id โหนดซ้ำ: ${n.id}`)
    seen.add(n.id)
    if (!NODE_ID_PATTERN.test(n.id)) errors.push(`id ของ "${n.name}" ใช้ได้แค่ a-z A-Z 0-9 _ - (id นี้อยู่ในลิงก์แชร์ build)`)
    if (n.cost < 0) errors.push(`COST ของ "${n.name}" ต้องไม่ติดลบ`)
  }

  for (const def of REFORGE_SLOTS) {
    const count = data.nodes.filter(n => n.slot === def.id).length
    const max = def.allowChoice ? 2 : 1
    if (count > max) {
      errors.push(`Stage ${def.stage} ช่อง${def.row === 'top' ? 'บน' : 'ล่าง'}${def.side === 'a' ? 'ซ้าย' : 'ขวา'} ใส่ได้ไม่เกิน ${max} โหนด`)
    }
  }

  for (const s of data.stages) {
    if (s.materials.length > MAX_MATERIALS_PER_STAGE) {
      errors.push(`Stage ${s.stage} ใส่วัสดุได้ไม่เกิน ${MAX_MATERIALS_PER_STAGE} ชิ้น`)
    }
    if (s.materials.some(m => !m.name.trim() || m.qty <= 0)) {
      errors.push(`Stage ${s.stage} มีวัสดุที่ไม่มีชื่อหรือจำนวนไม่ถึง 1`)
    }
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
  /** คลาสตรงกับ exclusive_classes — ในเกมใส่ได้ทุกตัวอยู่แล้ว ใช้แสดงผลเท่านั้น */
  matches_class: boolean
}

/** EX ทุกตัวในระบบ — ใส่ได้ทุกตัวเหมือนในเกม */
export function listExAnchors(
  characters: readonly { id: string; name: string; reforge: unknown }[],
  jobClass: string,
): ExAnchorOption[] {
  return characters.flatMap(c => {
    const anchor = parseReforge(c.reforge)?.ex_anchor
    if (!anchor) return []
    const matches = anchor.exclusive_classes.length === 0 || anchor.exclusive_classes.includes(jobClass)
    return [{ character_id: c.id, character_name: c.name, anchor, matches_class: matches }]
  })
}
