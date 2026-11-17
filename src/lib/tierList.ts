import type {
  TierCharDetail, TierListMeta, TierListSource, TierMarkKey, TierRow, TierServer,
} from '../types/models'
import { isTierMarkKey } from './tierMarks'

// ============================================================
// Tier list — logic ล้วน ไม่แตะ React / Supabase
// ทุกฟังก์ชันคืน array ใหม่ ไม่แก้ของเดิม
// ============================================================

export const TIER_LABEL_MAX = 12
export const MIN_TIERS = 1
export const MAX_TIERS = 10

// สีให้เลือกในแถวระดับ — 6 สีแรกตรงกับค่าเริ่มต้น SS–D
export const TIER_PALETTE = [
  '#FF4444', '#FFD700', '#C084FC', '#60A5FA', '#6EE7B7', '#9898B0',
  '#FB923C', '#F472B6', '#22D3EE', '#A3E635',
] as const

export const TIER_NOTE_MAX = 120
export const CHAR_NOTE_MAX = 200
export const MAX_ROLE_COLUMNS = 4
export const ROLE_COLUMN_MAX = 20

// ---- รายละเอียดรายตัว (details) — เก็บในแถวที่ตัวละครอยู่ ----

function withoutDetail(row: TierRow, charId: string): TierRow {
  if (!row.details || !(charId in row.details)) return row
  const rest = { ...row.details }
  delete rest[charId]
  return { ...row, details: rest }
}

function withDetail(row: TierRow, charId: string, detail: TierCharDetail): TierRow {
  return { ...row, details: { ...row.details, [charId]: detail } }
}

/**
 * ย้ายตัวละครเข้าแถวที่ tierIndex (ออกจากแถวอื่นทั้งหมด) — tierIndex = -1 คือเอาออกจากทุกแถว
 * เครื่องหมาย/หมายเหตุย้ายตามไปด้วย · col = คอลัมน์บทบาทที่วาง (ไม่ใส่ = คงคอลัมน์เดิม)
 */
export function placeCharacter(tiers: readonly TierRow[], charId: string, tierIndex: number, col?: number): TierRow[] {
  const carried = findPlacement(tiers, charId)?.detail
  return tiers.map((t, i) => {
    const without = t.character_ids.filter(id => id !== charId)
    const cleared = withoutDetail({ ...t, character_ids: without }, charId)
    if (i !== tierIndex) return cleared
    const placed = { ...cleared, character_ids: [...without, charId] }
    const detail = col === undefined ? carried : { ...carried, col }
    return detail && Object.keys(detail).length ? withDetail(placed, charId, detail) : placed
  })
}

/** แถวที่ตัวละครอยู่ + รายละเอียดของตัวนั้น (ยังไม่ได้วาง = null) */
export function findPlacement(tiers: readonly TierRow[], charId: string): { tierIndex: number; detail: TierCharDetail } | null {
  const tierIndex = tiers.findIndex(t => t.character_ids.includes(charId))
  if (tierIndex < 0) return null
  return { tierIndex, detail: tiers[tierIndex].details?.[charId] ?? {} }
}

const cut = (text: string, max: number) => [...text].slice(0, max).join('')

/** แก้รายละเอียดของตัวละครที่วางแล้ว (ตัวที่ยังไม่ได้วางไม่ทำอะไร) */
export function updateCharDetail(tiers: readonly TierRow[], charId: string, patch: Partial<TierCharDetail>): TierRow[] {
  const at = findPlacement(tiers, charId)
  if (!at) return [...tiers]
  const next = { ...at.detail, ...patch }
  if (patch.note !== undefined) next.note = cut(patch.note, CHAR_NOTE_MAX)
  return tiers.map((t, i) => (i === at.tierIndex ? withDetail(t, charId, next) : t))
}

export function toggleCharMark(tiers: readonly TierRow[], charId: string, mark: TierMarkKey): TierRow[] {
  const marks = findPlacement(tiers, charId)?.detail.marks ?? []
  return updateCharDetail(tiers, charId, { marks: marks.includes(mark) ? marks.filter(m => m !== mark) : [...marks, mark] })
}

export function setTierNote(tiers: readonly TierRow[], index: number, note: string): TierRow[] {
  return updateAt(tiers, index, { note: cut(note, TIER_NOTE_MAX) })
}

// ---- คอลัมน์ตามบทบาท ----

/** "Damage, Support" → ['Damage', 'Support'] · ต่ำกว่า 2 คอลัมน์ = ไม่แบ่ง */
export function parseRoleColumns(text: string): string[] {
  const cols = [...new Set(text.split(',').map(s => cut(s.trim(), ROLE_COLUMN_MAX)).filter(Boolean))].slice(0, MAX_ROLE_COLUMNS)
  return cols.length > 1 ? cols : []
}

/** ตัวละครในคอลัมน์ col — คอลัมน์ที่เกินจำนวนตกไปคอลัมน์สุดท้าย · columnCount < 2 = ทุกตัว */
export function charsInColumn(row: TierRow, col: number, columnCount: number): string[] {
  if (columnCount < 2) return [...row.character_ids]
  return row.character_ids.filter(id => Math.min(row.details?.[id]?.col ?? 0, columnCount - 1) === col)
}

/** ลดจำนวนคอลัมน์แล้ว ดึงตัวที่อยู่เกินกลับมาคอลัมน์สุดท้าย */
export function clampColumns(tiers: readonly TierRow[], columnCount: number): TierRow[] {
  const last = Math.max(columnCount - 1, 0)
  return tiers.map(t => {
    if (!t.details) return t
    const details = Object.fromEntries(Object.entries(t.details).map(([id, d]) =>
      [id, d.col !== undefined && d.col > last ? { ...d, col: last } : d]))
    return { ...t, details }
  })
}

/** ตัวละครที่ยังไม่อยู่ในแถวไหน เรียงตาม allIds */
export function unassignedIds(allIds: readonly string[], tiers: readonly TierRow[]): string[] {
  const assigned = new Set(tiers.flatMap(t => t.character_ids))
  return allIds.filter(id => !assigned.has(id))
}

const updateAt = (tiers: readonly TierRow[], index: number, patch: Partial<TierRow>): TierRow[] =>
  tiers.map((t, i) => (i === index ? { ...t, ...patch } : t))

export function renameTier(tiers: readonly TierRow[], index: number, label: string): TierRow[] {
  return updateAt(tiers, index, { label: [...label].slice(0, TIER_LABEL_MAX).join('') })
}

export function recolorTier(tiers: readonly TierRow[], index: number, color: string): TierRow[] {
  return updateAt(tiers, index, { color })
}

/** เพิ่มแถวว่างท้ายสุด สีวนตาม palette — เต็ม MAX_TIERS แล้วไม่เพิ่ม */
export function addTier(tiers: readonly TierRow[]): TierRow[] {
  if (tiers.length >= MAX_TIERS) return [...tiers]
  const color = TIER_PALETTE[tiers.length % TIER_PALETTE.length]
  return [...tiers, { label: 'ใหม่', color, character_ids: [] }]
}

/** ลบแถว — ตัวละครในแถวนั้นกลับไปรายการที่ยังไม่จัดอันดับเอง (unassignedIds คำนวณจากแถวที่เหลือ) */
export function removeTier(tiers: readonly TierRow[], index: number): TierRow[] {
  if (tiers.length <= MIN_TIERS) return [...tiers]
  return tiers.filter((_, i) => i !== index)
}

/** เลื่อนแถวขึ้น (-1) หรือลง (+1) — เลื่อนเกินขอบไม่ทำอะไร */
export function moveTier(tiers: readonly TierRow[], index: number, dir: -1 | 1): TierRow[] {
  const target = index + dir
  if (target < 0 || target >= tiers.length) return [...tiers]
  const next = [...tiers]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function cleanDetail(d: TierCharDetail): TierCharDetail {
  const out: TierCharDetail = {}
  const marks = (d.marks ?? []).filter(isTierMarkKey)
  const note = d.note?.trim()
  if (marks.length) out.marks = [...new Set(marks)]
  if (note) out.note = note
  if (d.col !== undefined && d.col > 0) out.col = d.col
  return out
}

/**
 * ก่อนบันทึก: ตัดช่องว่างหัวท้ายชื่อระดับ ชื่อว่างให้เป็น "?"
 * ล้างหมายเหตุว่าง และรายละเอียดของตัวที่ไม่ได้อยู่ในแถวแล้ว — แถวที่ไม่มีรายละเอียดคงรูปแบบเดิม
 */
export function normalizeTiersForSave(tiers: readonly TierRow[]): TierRow[] {
  return tiers.map(t => {
    const { note, details, ...rest } = t
    const row: TierRow = { ...rest, label: t.label.trim() || '?' }
    const trimmed = note?.trim()
    if (trimmed) row.note = trimmed
    const kept = Object.entries(details ?? {})
      .filter(([id]) => t.character_ids.includes(id))
      .map(([id, d]) => [id, cleanDetail(d)] as const)
      .filter(([, d]) => Object.keys(d).length > 0)
    if (kept.length) row.details = Object.fromEntries(kept)
    return row
  })
}

// ============================================================
// คอลัมน์เสริมของ tier_lists (server / role_columns / legend / source / is_archived)
// ============================================================

/** ลิงก์ภายนอกต้องเป็น http(s) เท่านั้น — กัน javascript: และลิงก์แปลก ๆ */
export function safeHttpUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

function readSource(value: unknown): TierListSource | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  const url = safeHttpUrl(v.url)
  if (!url || typeof v.title !== 'string' || typeof v.author !== 'string') return null
  const source: TierListSource = { title: v.title, author: v.author, url: v.url as string }
  const original = safeHttpUrl(v.original_url)
  if (original) source.original_url = v.original_url as string
  if (typeof v.date === 'string') source.date = v.date
  return source
}

/** อ่านคอลัมน์เสริมจากแถว tier_lists — แถวก่อนรัน migration หรือค่าแปลก ๆ ได้ค่าเริ่มต้น */
export function readTierListMeta(row: Record<string, unknown>): TierListMeta {
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
  return {
    server: (row.server === 'cn' ? 'cn' : 'global') as TierServer,
    roleColumns: strings(row.role_columns).slice(0, MAX_ROLE_COLUMNS),
    legend: strings(row.legend).filter(isTierMarkKey),
    source: readSource(row.source),
    isArchived: row.is_archived === true,
  }
}

const DEFAULT_META: TierListMeta = { server: 'global', roleColumns: [], legend: [], source: null, isArchived: false }
const sameJson = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/**
 * ช่องเสริมที่ต้องส่งตอนบันทึก — ส่งเฉพาะช่องที่ไม่ใช่ค่าเริ่มต้น หรือเคยตั้งไว้ก่อน (เพื่อล้างค่า)
 * เทียร์ลิสต์ทั่วไปจึงบันทึกได้แม้ฐานข้อมูลยังไม่ได้รัน migration
 */
export function buildMetaPayload(meta: TierListMeta, original: TierListMeta = DEFAULT_META) {
  const fields = {
    server: [meta.server, original.server, DEFAULT_META.server],
    role_columns: [meta.roleColumns, original.roleColumns, DEFAULT_META.roleColumns],
    legend: [meta.legend, original.legend, DEFAULT_META.legend],
    source: [meta.source, original.source, DEFAULT_META.source],
    is_archived: [meta.isArchived, original.isArchived, DEFAULT_META.isArchived],
  } as const
  const out: Record<string, unknown> = {}
  for (const [key, [value, before, fallback]] of Object.entries(fields)) {
    if (!sameJson(value, fallback) || !sameJson(before, fallback)) out[key] = value
  }
  return out as Partial<{ server: TierServer; role_columns: string[]; legend: TierMarkKey[]; source: TierListSource | null; is_archived: boolean }>
}

export interface CharacterFilter {
  query?: string
  rarity?: string
  jobClass?: string
}

/** กรองตัวละครตามชื่อ (ไม่สนตัวพิมพ์เล็กใหญ่), Rank และคลาส — ช่องที่ว่างไม่กรอง */
export function filterCharacters<T extends { name: string; rarity: string; job_class: string }>(
  chars: readonly T[],
  { query = '', rarity = '', jobClass = '' }: CharacterFilter,
): T[] {
  const q = query.trim().toLowerCase()
  return chars.filter(c =>
    (!q || c.name.toLowerCase().includes(q))
    && (!rarity || c.rarity === rarity)
    && (!jobClass || c.job_class === jobClass),
  )
}
