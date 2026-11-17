import { Map as MapIcon } from 'lucide-react'
import type { GameModeRow } from '../../types'
import { cn } from '../../lib/utils'
import { modeStatus, seasonState } from '../../lib/gameModes'

const badge = 'rounded border px-2 py-0.5 text-xs'

/** ป้ายสถานะ: Global / รอยืนยันชื่อ / ยังไม่พบใน Global + ยังล็อก */
export function ModeStatusBadges({ mode }: { mode: Pick<GameModeRow, 'in_global' | 'verified' | 'locked'> }) {
  const s = modeStatus(mode)
  return (
    <>
      <span className={cn(badge, s.key === 'global'
        ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400'
        : 'border-ptn-gold/25 bg-ptn-gold/10 text-ptn-gold')}
      >
        {s.label}
      </span>
      {s.locked && <span className={cn(badge, 'border-ptn-border bg-ptn-elevated text-ptn-muted')}>ยังล็อก</span>}
    </>
  )
}

/** รอบปัจจุบัน (Global) — หมดรอบแล้วขึ้นสีแดง */
export function SeasonBadge({ mode }: { mode: Pick<GameModeRow, 'season_label' | 'season_trait' | 'season_ends'> }) {
  if (!mode.season_label) return null
  const ended = seasonState(mode.season_ends).state === 'ended'
  const text = [mode.season_label, mode.season_trait].filter(Boolean).join(' · ')
  return (
    <span className={cn(badge, ended ? 'border-ptn-red/25 bg-ptn-red/10 text-ptn-red' : 'border-ptn-gold/25 bg-ptn-gold/10 text-ptn-gold')}>
      {ended ? `${mode.season_label} · หมดรอบแล้ว` : text}
    </span>
  )
}

/** เส้นทางกดในเกม เช่น DisCity → DisSea → Oblivion Pit */
export function ModePath({ path }: { path: string | null }) {
  if (!path) return null
  return (
    <p className="flex items-center gap-1.5 font-mono text-xs text-ptn-muted break-words">
      <MapIcon size={13} className="shrink-0 text-ptn-red" /> {path}
    </p>
  )
}
