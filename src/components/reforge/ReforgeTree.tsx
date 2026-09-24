import type { ReactNode } from 'react'
import { ArrowLeftRight, ChevronsUp, Dna, Triangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { ReforgeData, ReforgeEffect, ReforgeNode } from '../../types/models'
import { ReforgeNodeButton } from './ReforgeNodeButton'
import { EFFECT_LABEL, REFORGE_RED, stageLabel } from './reforgeStyle'

export type ReforgeSelection =
  | { kind: 'node'; id: string }
  | { kind: 'effect'; id: string }
  | { kind: 'ex' }
  | null

interface TreeProps {
  data: ReforgeData
  activeIds: readonly string[]
  selection: ReforgeSelection
  onSelect: (s: ReforgeSelection) => void
  onToggle: (nodeId: string) => void
  /** ช่อง Overlimit (EX) ต่อท้ายต้นไม้ — ไม่ส่งมา = ไม่แสดง */
  exSlot?: ReactNode
}

const EFFECT_ICON = { intensify: Dna, leap: ChevronsUp, cost: Triangle } as const

/** ต้นไม้ Reforge แนวนอน: หนึ่งคอลัมน์ต่อ Stage, แถวบน/ล่าง, เส้นเรืองแสงพาดกลาง — เลื่อนซ้ายขวาได้บนจอแคบ */
export function ReforgeTree({ data, activeIds, selection, onSelect, onToggle, exSlot }: TreeProps) {
  const stages = [...new Set([...data.nodes.map(n => n.stage), ...data.effects.map(e => e.stage)])].sort((a, b) => a - b)
  const active = new Set(activeIds)

  const rowProps = { active, selection, onSelect, onToggle }

  return (
    <div className="relative overflow-hidden rounded-lg border border-ptn-border bg-[radial-gradient(ellipse_at_center,rgba(190,18,60,0.35)_0%,rgba(10,10,15,1)_75%)]">
      {/* เส้นพลังงานพาดกลาง */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 blur-[1px]"
        style={{ background: `linear-gradient(90deg, transparent, ${REFORGE_RED} 15%, #fb7185 50%, ${REFORGE_RED} 85%, transparent)` }}
      />

      <div className="relative flex snap-x snap-mandatory overflow-x-auto">
        {stages.map(stage => (
          <section
            key={stage}
            aria-label={stageLabel(stage)}
            className="relative flex min-w-[17rem] shrink-0 snap-start flex-col justify-between gap-6 border-r border-white/5 px-4 py-5 last:border-r-0"
          >
            <StageRow
              nodes={data.nodes.filter(n => n.stage === stage && n.row === 'top')}
              effects={data.effects.filter(e => e.stage === stage)}
              position="top"
              {...rowProps}
            />
            <StageMarker stage={stage} />
            <StageRow
              nodes={data.nodes.filter(n => n.stage === stage && n.row === 'bottom')}
              effects={[]}
              position="bottom"
              {...rowProps}
            />
            <p className="text-center font-heading text-xs font-bold tracking-[0.2em] text-white/30">{stageLabel(stage)}</p>
          </section>
        ))}

        {exSlot && (
          <section aria-label="Overlimit Anchor" className="flex min-w-[12rem] shrink-0 snap-start flex-col items-center justify-center gap-3 px-4 py-5">
            {exSlot}
            <p className="font-heading text-xs font-bold tracking-[0.2em] text-white/30">OVERLIMIT</p>
          </section>
        )}
      </div>
    </div>
  )
}

// ---- Stage marker (ขีดตามเลข stage แบบในเกม) -----------------------------

function StageMarker({ stage }: { stage: number }) {
  return (
    <div aria-hidden className="flex h-10 items-center justify-center gap-1">
      {Array.from({ length: stage }, (_, i) => (
        <span key={i} className="h-8 w-[3px] rounded-full bg-white shadow-[0_0_8px_#fb7185]" />
      ))}
    </div>
  )
}

// ---- แถวบน/ล่าง ------------------------------------------------------------

interface RowProps {
  nodes: ReforgeNode[]
  effects: ReforgeEffect[]
  position: 'top' | 'bottom'
  active: Set<string>
  selection: ReforgeSelection
  onSelect: (s: ReforgeSelection) => void
  onToggle: (nodeId: string) => void
}

/** จัดโหนดเป็นช่องตาม col — ช่องที่มีหลายโหนดคือคู่ Choice ซ้อนบน-ล่าง */
function groupSlots(nodes: ReforgeNode[]): ReforgeNode[][] {
  const byCol = new Map<number, ReforgeNode[]>()
  for (const n of nodes) byCol.set(n.col, [...(byCol.get(n.col) ?? []), n])
  return [...byCol.entries()].sort(([a], [b]) => a - b).map(([, slot]) => slot)
}

const slotsLinked = (a: ReforgeNode[], b: ReforgeNode[]) =>
  a.some(x => b.some(y => x.linked_to === y.id || y.linked_to === x.id))

function StageRow({ nodes, effects, position, active, selection, onSelect, onToggle }: RowProps) {
  const slots = groupSlots(nodes)
  const isSelected = (kind: 'node' | 'effect', id: string) =>
    selection?.kind === kind && selection.id === id

  return (
    <div className="flex min-h-[6.5rem] items-center justify-center">
      {slots.map((slot, i) => (
        <div key={slot[0].id} className="flex items-center">
          {i > 0 && (
            <span
              aria-hidden
              className={cn('h-[2px] w-6 sm:w-8', slotsLinked(slots[i - 1], slot) ? 'bg-rose-300/70' : 'bg-transparent')}
            />
          )}
          {slot.length === 1 ? (
            <ReforgeNodeButton
              node={slot[0]}
              active={active.has(slot[0].id)}
              selected={isSelected('node', slot[0].id)}
              onSelect={() => onSelect({ kind: 'node', id: slot[0].id })}
              onToggle={() => onToggle(slot[0].id)}
              labelPosition={position === 'top' ? 'top' : 'bottom'}
            />
          ) : (
            <div className="flex flex-col items-center gap-1">
              {slot.map((n, j) => (
                <div key={n.id} className="flex flex-col items-center">
                  {j > 0 && <ArrowLeftRight aria-label="เลือกได้ 1" size={14} className="my-0.5 rotate-90 text-rose-300" />}
                  <ReforgeNodeButton
                    node={n}
                    active={active.has(n.id)}
                    selected={isSelected('node', n.id)}
                    onSelect={() => onSelect({ kind: 'node', id: n.id })}
                    onToggle={() => onToggle(n.id)}
                    labelPosition={j === 0 ? 'top' : 'bottom'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {effects.map(e => {
        const Icon = EFFECT_ICON[e.type]
        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onSelect({ kind: 'effect', id: e.id })}
            aria-label={`${EFFECT_LABEL[e.type]} (ปลดแล้ว)`}
            className={cn(
              'ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200/40 text-white transition-transform',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan',
              isSelected('effect', e.id) && 'scale-110',
            )}
            style={{ background: `radial-gradient(circle, #fb7185, ${REFORGE_RED})`, boxShadow: `0 0 12px ${REFORGE_RED}` }}
          >
            <Icon size={16} />
          </button>
        )
      })}
    </div>
  )
}
