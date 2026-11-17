import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { findPlacement } from '../../lib/tierList'
import type { TierMarkKey, TierRow, TierServer } from '../../types'
import { TierMarkBadge } from './TierParts'

type Rank = { listId: string; patch: string | null; tier: TierRow; marks: TierMarkKey[]; note: string }

/**
 * อันดับของตัวละครในเทียร์ลิสต์ทางการปัจจุบันของเซิร์ฟนั้น (ใช้ในแท็บไกด์)
 * ไม่มีเทียร์ลิสต์ทางการ / ตัวนี้ไม่ได้จัดอันดับ / โหลดไม่ได้ → ไม่แสดงอะไร
 */
export function OfficialTierRank({ characterId, server }: { characterId: string; server: TierServer }) {
  const [rank, setRank] = useState<Rank | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('tier_lists')
      .select('id, patch_version, tiers')
      .eq('is_official', true)
      .eq('is_public', true)
      .eq('is_archived', false)
      .eq('server', server)
      .order('updated_at', { ascending: false })
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.[0] || !Array.isArray(data[0].tiers)) return
        // แถวที่ไม่มี character_ids (ข้อมูลเสีย) ข้ามไป ไม่ให้ findPlacement พัง
        const tiers = (data[0].tiers as TierRow[]).filter(t => Array.isArray(t?.character_ids))
        const at = findPlacement(tiers, characterId)
        if (!at) return
        setRank({ listId: data[0].id, patch: data[0].patch_version, tier: tiers[at.tierIndex], marks: at.detail.marks ?? [], note: at.detail.note ?? '' })
      }, () => { /* โหลดไม่ได้ = ไม่แสดงการ์ด */ })
    return () => { cancelled = true }
  }, [characterId, server])

  if (!rank) return null
  const heading = server === 'cn' ? 'เทียร์ลิสต์ทางการ · ข้อมูลเซิร์ฟจีน' : `เทียร์ลิสต์ทางการ · Global${rank.patch ? ` ${rank.patch}` : ''}`
  return (
    <Link
      to={`/tier-lists/${rank.listId}`}
      className="flex items-center gap-3 rounded-lg border border-ptn-border bg-ptn-surface p-3 transition-colors hover:border-ptn-muted"
    >
      <span
        className="grid h-12 min-w-12 shrink-0 place-items-center rounded px-2 font-heading text-lg font-bold text-black"
        style={{ background: rank.tier.color }}
      >
        {rank.tier.label}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-ptn-muted">{heading}</span>
        {rank.marks.length > 0 && (
          <span className="mt-1 flex gap-1">{rank.marks.map(m => <TierMarkBadge key={m} mark={m} />)}</span>
        )}
        <span className="mt-0.5 block text-sm text-ptn-text line-clamp-2">
          {rank.note || (rank.tier.note ? `Tier ${rank.tier.label}: ${rank.tier.note}` : 'ดูอันดับทั้งหมด')}
        </span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-ptn-muted" />
    </Link>
  )
}
