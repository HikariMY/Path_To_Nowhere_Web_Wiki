// ============================================================
// ค้นหาด่วน (Ctrl+K) — logic ล้วน ไม่แตะ React / Supabase
// ให้คะแนน: ตรงทั้งคำ 0 · ขึ้นต้นด้วย 1 · ขึ้นต้นคำใดคำหนึ่ง 2 · มีอยู่ข้างใน 3 (น้อย = ดีกว่า)
// ============================================================

export type SearchKind = 'page' | 'character' | 'crimebrand' | 'mode'

export interface SearchItem {
  kind: SearchKind
  label: string
  /** ข้อความรอง เช่น ชื่อไทยของหน้า หรือ Rank — ค้นเจอได้ด้วย */
  sub?: string
  href: string
  img?: string | null
}

export const KIND_ORDER: readonly SearchKind[] = ['page', 'character', 'crimebrand', 'mode']

export const KIND_LABEL: Record<SearchKind, string> = {
  page: 'หน้า',
  character: 'ตัวละคร',
  crimebrand: 'Crimebrand',
  mode: 'ไกด์โหมด',
}

export const DEFAULT_RESULT_LIMIT = 20

// ตัดเฉพาะช่องว่างและเครื่องหมายวรรคตอน — ห้ามตัดสระ/วรรณยุกต์ไทย
const SEPARATORS = /[\s\-_·.,:;'"()[\]!?/&+]+/g

const compact = (s: string) => s.toLowerCase().replace(SEPARATORS, '')
const words = (s: string) => s.toLowerCase().split(SEPARATORS).filter(Boolean)

export function matchScore(query: string, target: string): number | null {
  const q = compact(query)
  if (!q) return null
  const t = compact(target)
  if (t === q) return 0
  if (t.startsWith(q)) return 1
  if (words(target).some(w => w.startsWith(q))) return 2
  if (t.includes(q)) return 3
  return null
}

function bestScore(query: string, item: SearchItem): number | null {
  const scores = [matchScore(query, item.label), item.sub ? matchScore(query, item.sub) : null]
    .filter((s): s is number => s !== null)
  return scores.length ? Math.min(...scores) : null
}

/** เรียงตามคะแนน ถ้าเท่ากันคงลำดับเดิม (ข้อมูลส่งมาเรียงตามความสำคัญอยู่แล้ว) */
export function searchItems(items: readonly SearchItem[], query: string, limit = DEFAULT_RESULT_LIMIT): SearchItem[] {
  if (!compact(query)) return []
  return items
    .map((item, index) => ({ item, index, score: bestScore(query, item) }))
    .filter((r): r is { item: SearchItem; index: number; score: number } => r.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map(r => r.item)
}

export interface ResultGroup {
  kind: SearchKind
  items: SearchItem[]
}

export function groupResults(results: readonly SearchItem[]): ResultGroup[] {
  return KIND_ORDER
    .map(kind => ({ kind, items: results.filter(r => r.kind === kind) }))
    .filter(g => g.items.length > 0)
}
