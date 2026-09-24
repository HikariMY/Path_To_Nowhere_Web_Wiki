import { useState } from 'react'
import { RotateCcw, Star } from 'lucide-react'
import { Button } from '../ui/Button'
import { decodeBuild, encodeBuild, toggleNode, totalCost, type ExAnchorOption } from '../../lib/reforge'
import type { ReforgeData } from '../../types/models'
import { ReforgeTree, type ReforgeSelection } from '../reforge/ReforgeTree'
import { CostMeter } from '../reforge/CostMeter'
import { displayName } from '../reforge/reforgeStyle'

/** เลือก build Reforge ที่จะแนบในไกด์ — กดโหนดในต้นไม้เพื่อเปิด/ปิด */
export function GuideReforgePicker({ data, exOptions, nodes, ex, onChange }: {
  data: ReforgeData
  exOptions: ExAnchorOption[]
  nodes: string[]
  ex: string
  onChange: (nodes: string[], ex: string) => void
}) {
  const [selection, setSelection] = useState<ReforgeSelection>(null)

  const onSelect = (sel: ReforgeSelection) => {
    setSelection(sel)
    if (sel?.kind === 'node') onChange(toggleNode(data, nodes, sel.id), ex)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {data.presets.map(p => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant="cyan"
              onClick={() => onChange(decodeBuild(data, encodeBuild(p.node_ids)), ex)}
            >
              <Star size={13} /> {p.name}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange([], '')}>
            <RotateCcw size={13} /> ไม่แนบ build
          </Button>
        </div>
        <CostMeter used={totalCost(data, nodes)} base={data.cost_base} bonus={data.cost_bonus} />
      </div>

      <ReforgeTree data={data} activeIds={nodes} selection={selection} onSelect={onSelect} onToggle={() => {}} />

      {exOptions.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-ptn-muted">
          Overlimit Anchor
          <select
            value={ex}
            onChange={e => onChange(nodes, e.target.value)}
            className="min-w-0 flex-1 rounded border border-ptn-border bg-ptn-elevated px-2 py-1.5 text-sm text-ptn-text outline-none focus:border-ptn-cyan"
          >
            <option value="">— ไม่ระบุ —</option>
            {exOptions.map(o => (
              <option key={o.character_id} value={o.character_id}>
                {o.character_name} - {displayName(o.anchor)}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-[11px] text-ptn-disabled">กดโหนดเพื่อเปิด/ปิด — คนอ่านไกด์กดเปิด build นี้ในแท็บ Reforge ได้</p>
    </div>
  )
}
