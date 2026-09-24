import type { ReactNode } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { sumStats, type ExAnchorOption } from '../../lib/reforge'
import type { ReforgeData, ReforgeNode } from '../../types/models'
import { CATEGORY_LABEL, EFFECT_LABEL, displayName, formatStat } from './reforgeStyle'

interface OverviewProps {
  data: ReforgeData
  activeIds: readonly string[]
  onToggle: (nodeId: string) => void
  ex: ExAnchorOption | null
}

/** มุมมองรายการ (Overview ในเกม) — checkbox ต่อโหนด + สรุปสเตตัสรวม */
export function ReforgeOverview({ data, activeIds, onToggle, ex }: OverviewProps) {
  const stats = sumStats(data, activeIds)
  const byCategory = (c: ReforgeNode['category']) =>
    data.nodes.filter(n => n.category === c).sort((a, b) => a.stage - b.stage || a.col - b.col)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        {(['attribute', 'special'] as const).map(c => (
          <Group key={c} title={CATEGORY_LABEL[c]}>
            {byCategory(c).map(n => (
              <label key={n.id} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
                <span className="flex-1 text-ptn-text">
                  {displayName(n)}
                  {n.choice_group && <ArrowLeftRight size={11} className="ml-1 inline text-rose-300" aria-label="Choice" />}
                </span>
                <span className="w-8 text-center font-heading font-bold text-amber-400">{n.cost}</span>
                <input
                  type="checkbox"
                  checked={activeIds.includes(n.id)}
                  onChange={() => onToggle(n.id)}
                  className="h-4 w-4 accent-rose-600"
                />
              </label>
            ))}
          </Group>
        ))}
      </div>

      <div className="space-y-4">
        <Group title="สเตตัสรวม">
          {stats.length === 0 ? (
            <p className="py-1.5 text-sm text-ptn-disabled">—</p>
          ) : (
            stats.map(s => (
              <div key={`${s.label}-${s.unit}`} className="flex justify-between py-1 text-sm">
                <span className="text-ptn-muted">{s.label}</span>
                <span className="font-heading font-bold text-ptn-cyan">{formatStat(s)}</span>
              </div>
            ))
          )}
        </Group>

        {data.effects.length > 0 && (
          <Group title="Reforge Effect">
            {data.effects.map(e => (
              <div key={e.id} className="flex justify-between py-1 text-sm">
                <span className="text-ptn-text">{EFFECT_LABEL[e.type]} <span className="text-xs text-ptn-disabled">S{e.stage}</span></span>
                <span className="text-green-400">ปลดแล้ว</span>
              </div>
            ))}
          </Group>
        )}

        <Group title="Overlimit Anchor">
          <p className="py-1 text-sm text-ptn-text">
            {ex ? `${ex.character_name} - ${displayName(ex.anchor)}` : <span className="text-ptn-disabled">ยังไม่ได้เลือก</span>}
          </p>
        </Group>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ptn-border bg-ptn-surface px-4 py-3">
      <h3 className="mb-1 border-b border-ptn-border pb-1.5 font-heading text-base font-bold text-ptn-text">{title}</h3>
      <div className="divide-y divide-ptn-border/50">{children}</div>
    </section>
  )
}
