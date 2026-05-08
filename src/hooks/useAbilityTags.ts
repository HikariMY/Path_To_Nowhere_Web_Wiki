import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ABILITY_TAG_GROUPS, TAG_DESCRIPTIONS, type TagGroup } from '../lib/abilityTags'

type GameInfoTagRow = {
  key: string
  data: {
    desc?: string
    group_label?: string
    is_custom?: boolean
  } | null
}

export type AbilityTagsState = {
  groups: TagGroup[]
  descriptions: Record<string, string>
  loading: boolean
}

const FALLBACK_GROUP_STYLE = {
  bg: '#1a1a2e',
  border: '#3a3a5a',
  text: '#9898B0',
}

export function useAbilityTags(): AbilityTagsState {
  const [groups, setGroups] = useState<TagGroup[]>(ABILITY_TAG_GROUPS)
  const [descriptions, setDescriptions] = useState<Record<string, string>>(TAG_DESCRIPTIONS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('game_info').select('key,data').eq('category', 'tag')
      .then(({ data }) => {
        const rows = (data || []) as GameInfoTagRow[]

        const desc: Record<string, string> = { ...TAG_DESCRIPTIONS }
        rows.forEach(r => { if (r.data?.desc) desc[r.key] = r.data.desc })

        const customByGroup = new Map<string, string[]>()
        rows.forEach(r => {
          if (!r.data?.is_custom) return
          const g = r.data.group_label || 'Other'
          if (!customByGroup.has(g)) customByGroup.set(g, [])
          customByGroup.get(g)!.push(r.key)
        })

        const merged: TagGroup[] = ABILITY_TAG_GROUPS.map(g => {
          const extra = customByGroup.get(g.label) || []
          return extra.length > 0 ? { ...g, tags: [...g.tags, ...extra] } : g
        })

        const knownLabels = new Set(ABILITY_TAG_GROUPS.map(g => g.label))
        customByGroup.forEach((tags, label) => {
          if (knownLabels.has(label)) return
          merged.push({ label, ...FALLBACK_GROUP_STYLE, tags })
        })

        setGroups(merged)
        setDescriptions(desc)
        setLoading(false)
      })
  }, [])

  return { groups, descriptions, loading }
}
