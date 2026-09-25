// ============================================================
// Team Builder — logic ล้วน ไม่แตะ React / Supabase
// ทุกฟังก์ชันคืน array ใหม่ ไม่แก้ของเดิม
// ============================================================

/** ทีมในเกมมีได้สูงสุด 6 ตัว */
export const MAX_TEAM_SIZE = 6
export const TEAM_TITLE_MAX = 60
export const TEAM_DESCRIPTION_MAX = 500

/** หนึ่งช่องในทีม — build_id อ้าง character_crimebrand_builds ของตัวละครนั้น (ไม่เลือก = null) */
export interface TeamMember {
  character_id: string
  build_id: string | null
}

export function addMember(members: readonly TeamMember[], characterId: string): TeamMember[] {
  if (members.length >= MAX_TEAM_SIZE || members.some(m => m.character_id === characterId)) return [...members]
  return [...members, { character_id: characterId, build_id: null }]
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

export function setMemberBuild(members: readonly TeamMember[], characterId: string, buildId: string | null): TeamMember[] {
  return members.map(m => (m.character_id === characterId ? { ...m, build_id: buildId } : m))
}

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

/** อ่าน members (jsonb) จากฐานข้อมูลอย่างระวัง — ทิ้งช่องที่รูปแบบผิด ตัวซ้ำ และส่วนเกิน 6 ตัว */
export function parseMembers(raw: unknown): TeamMember[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const members: TeamMember[] = []
  for (const item of raw) {
    if (!isRecord(item) || typeof item.character_id !== 'string' || seen.has(item.character_id)) continue
    seen.add(item.character_id)
    members.push({ character_id: item.character_id, build_id: typeof item.build_id === 'string' ? item.build_id : null })
    if (members.length === MAX_TEAM_SIZE) break
  }
  return members
}
