import { AlertTriangle, Network } from 'lucide-react'
import { costCap, totalCost, type ParsedGuideBuild } from '../../lib/reforge'
import type { ReforgeData } from '../../types/models'
import { displayName, nodeRingColor } from '../reforge/reforgeStyle'

/** สรุป build Reforge ที่แนบในไกด์ + ปุ่มเปิดในแท็บ Reforge */
export function GuideReforgeBuild({ build, data, exName, onOpen }: {
  build: ParsedGuideBuild
  data: ReforgeData
  exName: string | null
  onOpen?: () => void
}) {
  const picked = data.nodes
    .filter(n => build.nodes.includes(n.id))
    .sort((a, b) => a.stage - b.stage || a.col - b.col)
  const used = totalCost(data, build.nodes)
  const over = used > costCap(data)

  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2.5 sm:col-span-2">
      <Network size={15} className="mt-0.5 shrink-0 text-rose-300" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-widest text-ptn-muted">Build Reforge</p>
          <span className={over ? 'text-xs font-bold text-red-400' : 'text-xs font-bold text-amber-400'}>
            COST {used}/{data.cost_base}{data.cost_bonus > 0 && `(+${data.cost_bonus})`}
          </span>
        </div>

        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {picked.map(n => (
              <span
                key={n.id}
                className="rounded border-l-2 bg-ptn-bg px-1.5 py-0.5 text-xs text-ptn-text"
                style={{ borderLeftColor: nodeRingColor(n) }}
                title={n.description_th || n.description}
              >
                S{n.stage} · {displayName(n)}
              </span>
            ))}
          </div>
        )}

        {exName && (
          <p className="text-xs text-ptn-muted">
            <span className="mr-1 rounded bg-pink-400 px-1 text-[10px] font-black italic text-rose-900">EX</span>
            {exName}
          </p>
        )}

        {build.missing > 0 && (
          <p className="flex items-center gap-1 text-[11px] text-amber-400">
            <AlertTriangle size={11} /> มี {build.missing} โหนดที่ถูกลบจากต้นไม้แล้ว — build นี้อาจไม่ตรงกับปัจจุบัน
          </p>
        )}

        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-medium text-ptn-cyan hover:underline"
          >
            เปิด build นี้ในแท็บ Reforge ›
          </button>
        )}
      </div>
    </div>
  )
}
