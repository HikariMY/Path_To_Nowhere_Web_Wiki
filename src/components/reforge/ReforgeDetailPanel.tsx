import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeftRight } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import { JOB_CLASS_LABEL } from '../../lib/constants'
import type { ExAnchorOption } from '../../lib/reforge'
import type { ReforgeData, ReforgeStat } from '../../types/models'
import type { ReforgeSelection } from './ReforgeTree'
import { CATEGORY_LABEL, EFFECT_LABEL, displayName, formatStat, nodeRingColor } from './reforgeStyle'

interface PanelProps {
  data: ReforgeData
  activeIds: readonly string[]
  selection: ReforgeSelection
  onToggle: (nodeId: string) => void
  exOptions: ExAnchorOption[]
  exId: string | null
  onPickEx: (characterId: string | null) => void
}

/** แผงขวา — รายละเอียดของสิ่งที่เลือกในต้นไม้ */
export function ReforgeDetailPanel(props: PanelProps) {
  const { selection } = props
  return (
    <aside className="rounded-lg border border-ptn-border bg-ptn-surface p-4 lg:min-h-[22rem]">
      {selection === null && (
        <p className="py-10 text-center text-sm text-ptn-disabled">
          กดที่โหนดเพื่อดูรายละเอียด
          <br />
          <span className="text-xs">ดับเบิลคลิกโหนดเพื่อเปิด/ปิดได้ทันที</span>
        </p>
      )}
      {selection?.kind === 'node' && <NodeDetail {...props} nodeId={selection.id} />}
      {selection?.kind === 'effect' && <EffectDetail data={props.data} effectId={selection.id} />}
      {selection?.kind === 'ex' && <ExPicker {...props} />}
    </aside>
  )
}

function StatList({ stats }: { stats: ReforgeStat[] }) {
  if (stats.length === 0) return null
  return (
    <dl className="mt-3 space-y-1">
      {stats.map((s, i) => (
        <div key={i} className="flex justify-between text-sm">
          <dt className="text-ptn-muted">{s.label}</dt>
          <dd className="font-heading font-bold text-ptn-cyan">{formatStat(s)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Description({ th, en }: { th?: string; en?: string }) {
  const main = th || en
  if (!main) return null
  return (
    <div className="mt-3 space-y-2 text-sm leading-relaxed text-ptn-text">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{main}</ReactMarkdown>
      {th && en && th !== en && <p className="text-xs text-ptn-disabled">{en}</p>}
    </div>
  )
}

function NodeDetail({ data, activeIds, onToggle, nodeId }: PanelProps & { nodeId: string }) {
  const node = data.nodes.find(n => n.id === nodeId)
  if (!node) return null
  const active = activeIds.includes(node.id)
  const ring = nodeRingColor(node)
  const rival = node.choice_group
    ? data.nodes.find(n => n.choice_group === node.choice_group && n.id !== node.id)
    : undefined

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {node.choice_group && (
          <span className="inline-flex items-center gap-1 rounded bg-rose-700/70 px-1.5 py-0.5 text-[11px] font-bold text-white">
            <ArrowLeftRight size={11} /> Choice
          </span>
        )}
        <span className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: ring }}>
          {CATEGORY_LABEL[node.category]}
        </span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="font-heading text-xl font-bold leading-tight text-ptn-text">{displayName(node)}</h3>
        <div className="shrink-0 text-center">
          <p className="font-heading text-2xl font-bold leading-none text-amber-400">{node.cost}</p>
          <p className="text-[10px] tracking-widest text-ptn-muted">COST</p>
        </div>
      </div>
      {node.name_th && node.name_th !== node.name && <p className="text-xs text-ptn-disabled">{node.name}</p>}

      <Description th={node.description_th} en={node.description} />
      <StatList stats={node.stats ?? []} />

      {rival && !active && activeIds.includes(rival.id) && (
        <p className="mt-3 text-xs text-amber-400">เปิดโหนดนี้จะปิด "{displayName(rival)}" ให้อัตโนมัติ</p>
      )}

      <Button
        className="mt-4 w-full"
        variant={active ? 'outline' : 'primary'}
        onClick={() => onToggle(node.id)}
      >
        {active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
      </Button>
    </div>
  )
}

function EffectDetail({ data, effectId }: { data: ReforgeData; effectId: string }) {
  const effect = data.effects.find(e => e.id === effectId)
  if (!effect) return null
  return (
    <div>
      <h3 className="font-heading text-xl font-bold text-ptn-text">{EFFECT_LABEL[effect.type]}</h3>
      <p className="text-xs text-ptn-muted">รางวัล Stage {effect.stage}</p>
      <StatList stats={effect.stats} />
      <p className="mt-4 text-center text-sm font-medium text-amber-400">ปลดแล้ว</p>
    </div>
  )
}

function ExPicker({ exOptions, exId, onPickEx }: PanelProps) {
  if (exOptions.length === 0) {
    return <p className="py-10 text-center text-sm text-ptn-disabled">ยังไม่มี Overlimit Anchor ที่ใส่ได้</p>
  }
  return (
    <div className="space-y-2">
      <h3 className="font-heading text-lg font-bold text-ptn-text">เลือก Overlimit Anchor</h3>
      {exOptions.map(o => {
        const on = o.character_id === exId
        return (
          <button
            key={o.character_id}
            type="button"
            onClick={() => onPickEx(on ? null : o.character_id)}
            aria-pressed={on}
            className={cn(
              'w-full rounded border p-3 text-left transition-colors',
              on ? 'border-rose-500 bg-rose-950/40' : 'border-ptn-border hover:border-rose-500/50',
            )}
          >
            <div className="flex items-center gap-2">
              {o.anchor.icon_url && <img src={o.anchor.icon_url} alt="" className="h-8 w-8 rounded-full object-contain" />}
              <p className="flex-1 text-sm font-bold text-ptn-text">
                {o.character_name} - {displayName(o.anchor)}
              </p>
              <span className="rounded bg-pink-400 px-1.5 text-[11px] font-black italic text-rose-900">EX</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ptn-muted">{o.anchor.description_th || o.anchor.description}</p>
            {o.anchor.exclusive_classes.length > 0 && (
              <p className="mt-1 text-[11px] text-ptn-cyan">
                เฉพาะ: {o.anchor.exclusive_classes.map(c => JOB_CLASS_LABEL[c] ?? c).join(', ')}
              </p>
            )}
            {on && <p className="mt-1 text-[11px] font-bold text-green-400">ใช้อยู่</p>}
          </button>
        )
      })}
    </div>
  )
}
