import { supabase } from '../../lib/supabase'
import { NAV_LINKS } from '../../lib/navLinks'
import type { SearchItem } from '../../lib/quickSearch'

export const PAGE_ITEMS: SearchItem[] = NAV_LINKS.map(l => ({
  kind: 'page', label: l.label, sub: l.label === l.en ? undefined : l.en, href: l.to,
}))

type CharacterHit = { name: string; slug: string; portrait_url: string | null; rarity: string; is_unreleased: boolean }
type CrimebrandHit = { name: string; slug: string; icon_url: string | null; rank: string }
type ModeHit = { name: string; slug: string }

let cache: Promise<SearchItem[]> | null = null

/** โหลดครั้งแรกที่เปิดค้นหา แล้วจำไว้ทั้งเซสชัน — ถ้ามีส่วนไหนโหลดไม่ได้ ครั้งหน้าที่เปิดจะลองใหม่ */
export function loadSearchItems(): Promise<SearchItem[]> {
  if (!cache) {
    cache = fetchAll().then(({ items, complete }) => {
      if (!complete) cache = null
      return items
    })
  }
  return cache
}

async function fetchAll(): Promise<{ items: SearchItem[]; complete: boolean }> {
  const [chars, brands, modes] = await Promise.all([
    supabase.from('characters').select('name, slug, portrait_url, rarity, is_unreleased').order('name'),
    supabase.from('crimebrands').select('name, slug, icon_url, rank').order('release_order'),
    // ไกด์โหมดมาจาก migration แยก — โหลดไม่ได้ก็แค่ไม่มีกลุ่มนี้
    supabase.from('game_modes').select('name, slug').order('sort_order'),
  ])
  const items: SearchItem[] = [
    ...((chars.data || []) as CharacterHit[]).map(c => ({
      kind: 'character' as const, label: c.name, href: `/characters/${c.slug}`, img: c.portrait_url,
      sub: `${c.rarity}-Rank${c.is_unreleased ? ' · ยังไม่เปิด' : ''}`,
    })),
    ...((brands.data || []) as CrimebrandHit[]).map(b => ({
      kind: 'crimebrand' as const, label: b.name, href: `/crimebrands/${b.slug}`, img: b.icon_url, sub: b.rank,
    })),
    ...((modes.data || []) as ModeHit[]).map(m => ({
      kind: 'mode' as const, label: m.name, href: `/modes/${m.slug}`,
    })),
  ]
  return { items, complete: !chars.error && !brands.error && !modes.error }
}
