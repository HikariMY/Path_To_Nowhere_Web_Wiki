// ============================================================
// Team Builder — logic ล้วน ไม่แตะ React / Supabase
// ทุกฟังก์ชันคืน array ใหม่ ไม่แก้ของเดิม
// ============================================================

/** ทีมในเกมมีได้สูงสุด 6 ตัว */
export const MAX_TEAM_SIZE = 6
export const TEAM_TITLE_MAX = 60
export const TEAM_DESCRIPTION_MAX = 500

/** Crimebrand หนึ่งช่องที่ผู้ใช้เลือกเอง — piece คือชิ้นที่ 1–3 ของ Crimebrand นั้น */
export interface CustomCbSlot {
  cb_id: string
  piece: number
}

/** Crimebrand ที่เลือกเองมี 3 ช่องเสมอ ช่องที่ไม่เลือกเป็น null */
export type CustomCbSlots = readonly [CustomCbSlot | null, CustomCbSlot | null, CustomCbSlot | null]

export const CB_PIECES = [1, 2, 3] as const
/** ป้ายชิ้น / ช่องของ Crimebrand — แบบเดียวกับหน้าตัวละคร */
export const CB_PIECE_LABEL = ['I', 'II', 'III']
export const EMPTY_CUSTOM_CBS: CustomCbSlots = [null, null, null]

/**
 * หนึ่งช่องในทีม — ใส่ Crimebrand ได้ 2 แบบ ใช้ได้ทีละแบบ:
 * - build_id: build แนะนำของตัวละครนั้น (character_crimebrand_builds)
 * - custom_cbs: เลือกเองจาก Crimebrand ทั้งหมดในเว็บ ไม่ผูกกับตัวละคร
 */
export interface TeamMember {
  character_id: string
  build_id: string | null
  custom_cbs: CustomCbSlots
}

export function addMember(members: readonly TeamMember[], characterId: string): TeamMember[] {
  if (members.length >= MAX_TEAM_SIZE || members.some(m => m.character_id === characterId)) return [...members]
  return [...members, { character_id: characterId, build_id: null, custom_cbs: EMPTY_CUSTOM_CBS }]
}

export function removeMember(members: readonly TeamMember[], characterId: string): TeamMember[] {
  return members.filter(m => m.character_id !== characterId)
}

/** เลื่อนช่องไปซ้าย (-1) หรือขวา (+1) — เลื่อนเกินขอบไม่ทำอะไร */
export function moveMember(members: readonly TeamMember[], index: number, dir: -1 | 1): TeamMember[] {
  const target = index + dir
  if (target < 0 || target >= members.length) return [...members]
  const next = [...members]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** เลือก build แนะนำ — ล้าง Crimebrand ที่เลือกเองของตัวนั้นทิ้ง */
export function setMemberBuild(members: readonly TeamMember[], characterId: string, buildId: string | null): TeamMember[] {
  return members.map(m => (m.character_id === characterId ? { ...m, build_id: buildId, custom_cbs: EMPTY_CUSTOM_CBS } : m))
}

/** ตั้ง Crimebrand ที่เลือกเองช่องที่ index (0–2) — null = ล้างช่องนั้น · เลือกเองแล้วเลิกใช้ build แนะนำ */
export function setMemberCustomCb(
  members: readonly TeamMember[],
  characterId: string,
  index: 0 | 1 | 2,
  slot: CustomCbSlot | null,
): TeamMember[] {
  return members.map(m => {
    if (m.character_id !== characterId) return m
    const next = [...m.custom_cbs] as [CustomCbSlot | null, CustomCbSlot | null, CustomCbSlot | null]
    next[index] = slot
    return { ...m, build_id: null, custom_cbs: next }
  })
}

export const hasCustomCbs = (member: TeamMember): boolean => member.custom_cbs.some(s => s !== null)

export interface CountEntry {
  key: string
  count: number
}

interface SummaryCharacter {
  job_class: string
  ability_tags: string[] | null
}

const countEntries = (keys: readonly string[]): CountEntry[] => {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

/** สรุปทีม: มีคลาสไหนกี่ตัว และ ability tag อะไรครอบคลุมกี่ตัว (มากสุดขึ้นก่อน) */
export function teamSummary(
  members: readonly TeamMember[],
  characters: ReadonlyMap<string, SummaryCharacter>,
): { classes: CountEntry[]; tags: CountEntry[] } {
  const known = members.flatMap(m => {
    const char = characters.get(m.character_id)
    return char ? [char] : []
  })
  return {
    classes: countEntries(known.map(c => c.job_class)),
    tags: countEntries(known.flatMap(c => c.ability_tags ?? [])),
  }
}

/**
 * build ที่เลือกไว้ของช่องนี้ — เฉพาะถ้าเป็น build ของตัวละครในช่องนั้นจริง
 * (members เป็น jsonb ที่เจ้าของเขียนเองได้ อย่าโชว์ build ของตัวอื่นใต้การ์ดผิดตัว)
 */
export function memberBuild<B extends { character_id: string }>(
  member: TeamMember,
  buildById: ReadonlyMap<string, B>,
): B | undefined {
  const build = member.build_id ? buildById.get(member.build_id) : undefined
  return build?.character_id === member.character_id ? build : undefined
}

/** Crimebrand หนึ่งช่องสำหรับแสดงผล — position คือช่องที่ 0–2 (ขึ้นป้าย I/II/III) */
export interface CbSlotView {
  position: number
  cb_id: string
  piece: number | null
}

interface BuildLike {
  character_id: string
  build_name: string
  slots: { cb_id: string; piece: number | null }[]
}

/**
 * Crimebrand ที่ใช้แสดงของช่องนี้ — เลือกเองมาก่อน ไม่งั้นใช้ build แนะนำ
 * (ทีมที่บันทึกก่อนมีระบบเลือกเองมีแค่ build_id)
 */
export function memberCrimebrands<B extends BuildLike>(
  member: TeamMember,
  buildById: ReadonlyMap<string, B>,
): { buildName: string | null; slots: CbSlotView[] } {
  if (hasCustomCbs(member)) {
    return {
      buildName: null,
      slots: member.custom_cbs.flatMap((s, position) => (s ? [{ position, cb_id: s.cb_id, piece: s.piece }] : [])),
    }
  }
  const build = memberBuild(member, buildById)
  return {
    buildName: build?.build_name ?? null,
    slots: (build?.slots ?? []).map((s, position) => ({ position, cb_id: s.cb_id, piece: s.piece })),
  }
}

/** ข้อความ error ภาษาไทย หรือ null ถ้าบันทึกได้ */
export function validateTeam({ title, description = '', members }: {
  title: string
  description?: string
  members: readonly TeamMember[]
}): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'กรุณาตั้งชื่อทีม'
  if ([...trimmed].length > TEAM_TITLE_MAX) return `ชื่อทีมยาวได้ไม่เกิน ${TEAM_TITLE_MAX} ตัวอักษร`
  if (description.trim().length > TEAM_DESCRIPTION_MAX) return `คำอธิบายยาวได้ไม่เกิน ${TEAM_DESCRIPTION_MAX} ตัวอักษร`
  if (members.length === 0) return 'เลือกตัวละครอย่างน้อย 1 ตัว'
  if (members.length > MAX_TEAM_SIZE) return `ทีมหนึ่งมีได้ไม่เกิน ${MAX_TEAM_SIZE} ตัว`
  return null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseCustomCb = (raw: unknown): CustomCbSlot | null =>
  isRecord(raw) && typeof raw.cb_id === 'string' && (CB_PIECES as readonly unknown[]).includes(raw.piece)
    ? { cb_id: raw.cb_id, piece: raw.piece as number }
    : null

/** Crimebrand ที่เลือกเองจาก jsonb — รูปแบบผิดกลายเป็นช่องว่าง เกิน 3 ช่องทิ้ง */
function parseCustomCbs(raw: unknown): CustomCbSlots {
  if (!Array.isArray(raw)) return EMPTY_CUSTOM_CBS
  return [parseCustomCb(raw[0]), parseCustomCb(raw[1]), parseCustomCb(raw[2])]
}

/** อ่าน members (jsonb) จากฐานข้อมูลอย่างระวัง — ทิ้งช่องที่รูปแบบผิด ตัวซ้ำ และส่วนเกิน 6 ตัว */
export function parseMembers(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const members: TeamMember[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.character_id !== 'string' || seen.has(item.character_id)) continue
    seen.add(item.character_id)
    const custom_cbs = parseCustomCbs(item.custom_cbs)
    const hasCustom = custom_cbs.some(s => s !== null)
    members.push({
      character_id: item.character_id,
      // ใช้ได้ทีละแบบ — ถ้ามีทั้งคู่ (เขียนตรงเข้า DB) ให้แบบเลือกเองชนะ
      build_id: !hasCustom && typeof item.build_id === 'string' ? item.build_id : null,
      custom_cbs,
    })
    if (members.length === MAX_TEAM_SIZE) break
  }
  return members
}
