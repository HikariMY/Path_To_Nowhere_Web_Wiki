import type { ReactNode } from 'react'
import { ArrowLeftRight, Dna, Triangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { EX_SLOT_STAGE, REFORGE_SLOTS, REFORGE_STAGES, STAGE_ORBS, type ReforgeOrb, type ReforgeSlotDef } from '../../lib/reforge'
import type { ReforgeData, ReforgeNode } from '../../types/models'
import { ReforgeNodeButton } from './ReforgeNodeButton'
import { ORB_LABEL, REFORGE_RED, stageLabel } from './reforgeStyle'

export type ReforgeSelection =
  | { kind: 'node'; id: string }
  | { kind: 'orb'; stage: number; orb: ReforgeOrb }
  | { kind: 'stage'; stage: number }
  | { kind: 'ex' }
  | null

interface TreeProps {
  data: ReforgeData
  activeIds: readonly string[]
  selection: ReforgeSelection
  onSelect: (s: ReforgeSelection) => void
  onToggle: (nodeId: string) => void
  /** ปุ่มช่อง EX (Stage 3 ล่างขวา) — ไม่ส่งมา = เว้นช่องว่าง */
  exSlot?: ReactNode
}

const ORB_ICON = { intensify: Dna, leap: Triangle } as const

/**
 * ต้นไม้ Reforge ตาม layout ตายตัวของเกม: 4 Stage, แถวบน/ล่าง, ช่องซ้าย ─ ขวา,
 * วงรางวัลมุมขวาบน, ช่อง EX ที่ Stage 3 ล่างขวา — เลื่อนซ้ายขวาได้บนจอแคบ
 */
export function ReforgeTree({ data, activeIds, selection, onSelect, onToggle, exSlot }: TreeProps) {
  const active = new Set(activeIds)
  const rowProps = { data, active, selection, onSelect, onToggle }

  return (
    <div className="relative overflow-hidden rounded-lg border border-ptn-border bg-[radial-gradient(ellipse_at_center,rgba(190,18,60,0.35)_0%,rgba(10,10,15,1)_75%)]">
      {/* เส้นพลังงานพาดกลาง */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 blur-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${REFORGE_RED} 15%, #fb7185 50%, ${REFORGE_RED} 85%, transparent)` }}
      />

      <div className="relative flex snap-x snap-mandatory overflow-x-auto">
        {REFORGE_STAGES.map(stage => (
          <section
            key={stage}
            aria-label={stageLabel(stage)}
            className="relative flex min-w-[17rem] shrink-0 snap-start flex-col justify-between gap-4 border-r border-white/5 px-4 py-5 last:border-r-0"
          >
            <StageRow stage={stage} row="top" {...rowProps} />
            <StageMarker
              stage={stage}
              selected={selection?.kind === 'stage' && selection.stage === stage}
              onClick={() => onSelect({ kind: 'stage', stage })}
            />
            <StageRow stage={stage} row="bottom" exSlot={stage === EX_SLOT_STAGE ? exSlot : undefined} {...rowProps} />
            <p className="text-center font-heading text-xs font-bold tracking-[0.2em] text-white/30">{stageLabel(stage)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

// ---- ส่วนกลาง (กรงเล็บ) — กดดูวัสดุปลดและ COST limit ------------------------

function StageMarker({ stage, selected, onClick }: { stage: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${stageLabel(stage)} — ดูวัสดุปลดและ COST limit`}
      className={cn(
        'mx-auto flex h-14 w-14 items-center justify-center gap-1 rounded-full border border-rose-300/20 bg-black/30 transition-transform',
        'hover:border-rose-300/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan',
        selected && 'scale-110 border-rose-300/60',
      )}
    >
      {Array.from({ length: stage }, (_, i) => (
        <span key={i} aria-hidden className="h-8 w-[3px] rounded-full bg-white shadow-[0_0_8px_#fb7185]" />
      ))}
    </button>
  )
}

// ---- แถวบน/ล่าง ------------------------------------------------------------

interface RowProps {
  data: ReforgeData
  stage: number
  row: 'top' | 'bottom'
  active: Set<string>
  selection: ReforgeSelection
  onSelect: (s: ReforgeSelection) => void
  onToggle: (nodeId: string) => void
  exSlot?: ReactNode
}

function StageRow({ data, stage, row, active, selection, onSelect, onToggle, exSlot }: RowProps) {
  const slots = REFORGE_SLOTS.filter(s => s.stage === stage && s.row === row)
  const nodesIn = (def: ReforgeSlotDef) => data.nodes.filter(n => n.slot === def.id)
  const orbs = row === 'top' ? STAGE_ORBS[stage] ?? [] : []

  const [left, right] = [slots.find(s => s.side === 'a'), slots.find(s => s.side === 'b')]
  const leftNodes = left ? nodesIn(left) : []
  const rightNodes = right ? nodesIn(right) : []
  // ช่องขวาเว้นที่ไว้เสมอเหมือนช่องซ้าย — ต้นไม้ที่ยังกรอกไม่ครบจะได้ไม่เบี้ยว
  const hasRight = !!right || !!exSlot
  const linked = leftNodes.length > 0 && rightNodes.length > 0

  const cell = (nodes: ReforgeNode[]) => (
    <SlotCell nodes={nodes} row={row} active={active} selection={selection} onSelect={onSelect} onToggle={onToggle} />
  )

  return (
    <div className="flex min-h-[6.5rem] items-center">
      {left && cell(leftNodes)}
      {hasRight && (
        <span aria-hidden className={cn('h-[2px] w-6 sm:w-8', linked ? 'bg-rose-300/70' : 'bg-transparent')} />
      )}
      {right && cell(rightNodes)}
      {exSlot}

      {orbs.map(orb => {
        const Icon = ORB_ICON[orb]
        const isSel = selection?.kind === 'orb' && selection.stage === stage && selection.orb === orb
        return (
          <button
            key={orb}
            type="button"
            onClick={() => onSelect({ kind: 'orb', stage, orb })}
            aria-label={`${ORB_LABEL[orb]} (ปลดแล้ว)`}
            className={cn(
              'ml-4 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-rose-200/40 text-white transition-transform',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan',
              isSel && 'scale-110',
            )}
            style={{ background: `radial-gradient(circle, #fb7185, ${REFORGE_RED})`, boxShadow: `0 0 12px ${REFORGE_RED}` }}
          >
            <Icon size={orb === 'leap' ? 13 : 16} />
            {orb === 'leap' && <span className="text-[7px] font-bold leading-none">COST</span>}
          </button>
        )
      })}
    </div>
  )
}

/** ช่องเดียว: ว่าง = เว้นที่ไว้ให้ตรงแนว, 1 โหนด = ปุ่มเดียว, 2 โหนด = คู่ Choice ซ้อนบน-ล่าง */
function SlotCell({ nodes, row, active, selection, onSelect, onToggle }: {
  nodes: ReforgeNode[]
  row: 'top' | 'bottom'
  active: Set<string>
  selection: ReforgeSelection
  onSelect: (s: ReforgeSelection) => void
  onToggle: (nodeId: string) => void
}) {
  if (nodes.length === 0) return <span aria-hidden className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />

  const button = (n: ReforgeNode, labelPosition: 'top' | 'bottom') => (
    <ReforgeNodeButton
      node={n}
      active={active.has(n.id)}
      selected={selection?.kind === 'node' && selection.id === n.id}
      onSelect={() => onSelect({ kind: 'node', id: n.id })}
      onToggle={() => onToggle(n.id)}
      labelPosition={labelPosition}
    />
  )

  if (nodes.length === 1) return button(nodes[0], row === 'top' ? 'top' : 'bottom')

  return (
    <div className="flex flex-col items-center gap-1">
      {nodes.map((n, j) => (
        <div key={n.id} className="flex flex-col items-center">
          {j > 0 && <ArrowLeftRight aria-label="เลือกได้ 1" size={14} className="my-0.5 rotate-90 text-rose-300" />}
          {button(n, j === 0 ? 'top' : 'bottom')}
        </div>
      ))}
    </div>
  )
}
