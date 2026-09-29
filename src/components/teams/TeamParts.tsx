import { Users, Tags } from 'lucide-react'
import { Card } from '../ui/Card'
import { JOB_CLASS_LABEL, RARITY_COLORS } from '../../lib/constants'
import { CB_PIECE_LABEL, MAX_TEAM_SIZE, teamSummary, type CbSlotView, type TeamMember } from '../../lib/team'
import type { TeamCatalog, TeamCrimebrand } from '../../hooks/useTeamCatalog'

/** สรุปทีม — มีคลาสไหนกี่ตัว และ ability tag อะไรครอบคลุมกี่ตัว */
export function TeamSummaryPanel({ members, catalog }: { members: readonly TeamMember[]; catalog: TeamCatalog }) {
  const { classes, tags } = teamSummary(members, catalog.charById)

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ptn-text">
          <Users size={14} className="text-ptn-cyan" /> คลาสในทีม ({members.length}/{MAX_TEAM_SIZE})
        </h2>
        {classes.length === 0 ? (
          <p className="text-xs text-ptn-muted">ยังไม่มีตัวละคร</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {classes.map(c => (
              <span key={c.key} className="rounded border border-ptn-border bg-ptn-elevated px-2 py-0.5 text-xs text-ptn-text">
                {JOB_CLASS_LABEL[c.key] || c.key} × {c.count}
              </span>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ptn-text">
          <Tags size={14} className="text-ptn-gold" /> Ability tags ที่ครอบคลุม
        </h2>
        {tags.length === 0 ? (
          <p className="text-xs text-ptn-muted">ยังไม่มี tag</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t.key} className="rounded bg-ptn-gold/10 px-2 py-0.5 text-xs text-ptn-gold">
                {t.key}{t.count > 1 && ` × ${t.count}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

/** Crimebrand ของหนึ่งช่องในทีม — ชื่อ build แนะนำ (ถ้าใช้) + ไอคอนพร้อมชิ้นที่ใช้ */
export function CrimebrandBadge({ buildName, slots, cbById }: {
  buildName: string | null
  slots: readonly CbSlotView[]
  cbById: ReadonlyMap<string, TeamCrimebrand>
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-ptn-text">{buildName ?? 'เลือกเอง'}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {slots.map(slot => {
          const cb = cbById.get(slot.cb_id)
          if (!cb) return null
          const piece = slot.piece ? CB_PIECE_LABEL[slot.piece - 1] : null
          return (
            <span
              // Crimebrand เดียวกันลงได้หลายช่อง — key ต้องผูกกับตำแหน่งช่อง
              key={slot.position}
              title={`${cb.name}${piece ? ` ชิ้น ${piece}` : ''}`}
              className="flex items-center gap-1 rounded border bg-ptn-elevated px-1 py-0.5 text-[10px] text-ptn-muted"
              style={{ borderColor: `${RARITY_COLORS[cb.rank] ?? '#888'}60` }}
            >
              {cb.icon_url && <img src={cb.icon_url} alt="" className="h-4 w-4 object-contain" loading="lazy" />}
              <span className="max-w-[6rem] truncate">{cb.name}</span>
              {piece && <span className="font-mono text-ptn-disabled">{piece}</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}
