import { isStale } from './cnGuides'
import { safeHttpUrl } from './tierList'

// ============================================================
// แหล่งอ้างอิงภายนอก (หน้าแอดมิน) — รวมเครดิตจากทุกที่ไว้ที่เดียว ไม่เก็บข้อมูลซ้ำ
//   สรุปไกด์จีน (character_cn_guides) · แหล่งอ้างอิงไกด์โหมด (game_mode_sources) · เครดิตเทียร์ลิสต์ทางการ (tier_lists.source)
// ============================================================

export type SourceKind = 'cn-guide' | 'mode' | 'tier-list'

export interface ExternalSource {
  kind: SourceKind
  id: string
  title: string
  author: string
  url: string
  checkedAt: string | null
  stale: boolean
  /** เทียร์ลิสต์เก็บวันที่ของต้นฉบับ ไม่ใช่วันที่ตรวจ จึงกด "ตรวจแล้ว" ไม่ได้ */
  canMarkChecked: boolean
  usedAt: { label: string; href: string }
}

interface Input {
  cnGuides: { id: string; source_title: string; source_author: string; source_url: string; checked_at: string; character: { name: string; slug: string } | null }[]
  modeSources: { id: string; title: string; author: string; url: string; checked_at: string; mode: { name: string; slug: string } | null }[]
  tierLists: { id: string; title: string; source: unknown }[]
}

export function collectSources(input: Input, now: Date = new Date()): ExternalSource[] {
  const rows: ExternalSource[] = []
  for (const g of input.cnGuides) {
    if (!safeHttpUrl(g.source_url) || !g.character) continue
    rows.push({
      kind: 'cn-guide', id: g.id, title: g.source_title, author: g.source_author, url: g.source_url,
      checkedAt: g.checked_at, stale: isStale(g.checked_at, now), canMarkChecked: true,
      usedAt: { label: `ไกด์ผู้เล่นจีน · ${g.character.name}`, href: `/characters/${g.character.slug}?tab=guides&src=cn` },
    })
  }
  for (const s of input.modeSources) {
    if (!safeHttpUrl(s.url) || !s.mode) continue
    rows.push({
      kind: 'mode', id: s.id, title: s.title, author: s.author, url: s.url,
      checkedAt: s.checked_at, stale: isStale(s.checked_at, now), canMarkChecked: true,
      usedAt: { label: `ไกด์โหมด · ${s.mode.name}`, href: `/modes/${s.mode.slug}` },
    })
  }
  for (const t of input.tierLists) {
    const src = t.source as Record<string, unknown> | null
    if (!src || typeof src !== 'object' || !safeHttpUrl(src.url)) continue
    const date = typeof src.date === 'string' ? src.date : null
    rows.push({
      kind: 'tier-list', id: t.id, title: String(src.title ?? ''), author: String(src.author ?? ''), url: src.url as string,
      checkedAt: date, stale: isStale(date, now), canMarkChecked: false,
      usedAt: { label: `เทียร์ลิสต์ · ${t.title}`, href: `/tier-lists/${t.id}` },
    })
  }
  return rows
}
