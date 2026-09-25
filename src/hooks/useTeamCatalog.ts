import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Character } from '../types'

export type TeamCharacter = Pick<
  Character,
  'id' | 'name' | 'slug' | 'portrait_url' | 'rarity' | 'job_class' | 'ability_tags' | 'is_unreleased'
>

export interface TeamBuild {
  id: string
  character_id: string
  build_name: string
  slots: { cb_id: string; piece: number | null }[]
}

export interface TeamCrimebrand {
  id: string
  name: string
  icon_url: string | null
  rank: string
}

export interface TeamCatalog {
  characters: TeamCharacter[]
  charById: Map<string, TeamCharacter>
  buildsByChar: Map<string, TeamBuild[]>
  buildById: Map<string, TeamBuild>
  cbById: Map<string, TeamCrimebrand>
}

type BuildRow = {
  id: string
  character_id: string
  build_name: string
  slot1_cb_id: string | null
  slot1_piece: number | null
  slot2_cb_id: string | null
  slot2_piece: number | null
  slot3_cb_id: string | null
  slot3_piece: number | null
}

const PAGE_SIZE = 1000

/** build ทั้งหมด — ดึงทีละหน้า เลื่อนตามจำนวนแถวที่ได้จริง (Max Rows อาจต่ำกว่า PAGE_SIZE) */
async function fetchAllBuilds(): Promise<BuildRow[]> {
  let rows: BuildRow[] = []
  while (true) {
    const { data, error } = await supabase
      .from('character_crimebrand_builds')
      .select('id, character_id, build_name, slot1_cb_id, slot1_piece, slot2_cb_id, slot2_piece, slot3_cb_id, slot3_piece')
      .order('sort_order')
      .order('id')
      .range(rows.length, rows.length + PAGE_SIZE - 1)
    if (error) throw error
    if (data.length === 0) return rows
    rows = rows.concat(data as BuildRow[])
  }
}

const toBuild = (row: BuildRow): TeamBuild => ({
  id: row.id,
  character_id: row.character_id,
  build_name: row.build_name,
  slots: ([1, 2, 3] as const).flatMap(n => {
    const cb_id = row[`slot${n}_cb_id`]
    return cb_id ? [{ cb_id, piece: row[`slot${n}_piece`] }] : []
  }),
})

async function loadCatalog(): Promise<TeamCatalog> {
  const [charsRes, buildRows, cbRes] = await Promise.all([
    supabase.from('characters').select('id, name, slug, portrait_url, rarity, job_class, ability_tags, is_unreleased')
      .order('release_order', { ascending: false }),
    fetchAllBuilds(),
    supabase.from('crimebrands').select('id, name, icon_url, rank'),
  ])
  if (charsRes.error) throw charsRes.error
  if (cbRes.error) throw cbRes.error

  const characters = (charsRes.data ?? []) as TeamCharacter[]
  const builds = buildRows.map(toBuild)
  const buildsByChar = new Map<string, TeamBuild[]>()
  for (const build of builds) {
    buildsByChar.set(build.character_id, [...(buildsByChar.get(build.character_id) ?? []), build])
  }
  return {
    characters,
    charById: new Map(characters.map(c => [c.id, c])),
    buildsByChar,
    buildById: new Map(builds.map(b => [b.id, b])),
    cbById: new Map((cbRes.data ?? []).map(cb => [cb.id, cb as TeamCrimebrand])),
  }
}

/** ข้อมูลตัวละคร + Crimebrand build ที่หน้าจัดทีม / ดูทีมใช้ — โหลดครั้งเดียว */
export function useTeamCatalog(): { catalog: TeamCatalog | null; failed: boolean; retry: () => void } {
  const [catalog, setCatalog] = useState<TeamCatalog | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    loadCatalog()
      .then(data => { if (active) { setCatalog(data); setFailed(false) } })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [reloadKey])

  return { catalog, failed, retry: () => { setFailed(false); setReloadKey(k => k + 1) } }
}
