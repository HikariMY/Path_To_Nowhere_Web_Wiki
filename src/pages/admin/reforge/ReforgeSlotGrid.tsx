import { Edit2, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { EX_SLOT_STAGE, REFORGE_SLOTS, REFORGE_STAGES, type ReforgeSlotDef } from '../../../lib/reforge'
import type { ReforgeNode, ReforgeSlotId } from '../../../types/models'
import { CATEGORY_LABEL, ROMAN, nodeRingColor } from '../../../components/reforge/reforgeStyle'

/**
 * ตารางช่องโหนดตาม layout ของเกม — แอดมินกดช่องไหนก็เพิ่ม/แก้โหนดของช่องนั้น
 * ช่องขวา (b) ใส่ได้ 2 โหนดเป็นคู่ Choice
 */
export function ReforgeSlotGrid({ nodes, onAdd, onEdit, onDelete }: {
  nodes: ReforgeNode[]
  onAdd: (slot: ReforgeSlotId) => void
  onEdit: (node: ReforgeNode) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className="p-4">
      <h3 className="mb-1 font-heading text-base font-bold text-ptn-text">โหนด ({nodes.length})</h3>
      <p className="mb-3 text-xs text-ptn-disabled">ตำแหน่งตายตัวเหมือนในเกม — ช่องขวาใส่ได้ 2 โหนดเพื่อทำเป็นคู่ Choice, ช่องที่ว่างจะไม่แสดงในหน้าตัวละคร</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {REFORGE_STAGES.map(stage => (
          <div key={stage} className="rounded border border-ptn-border p-3">
            <p className="mb-2 font-heading text-xs font-bold tracking-widest text-ptn-muted">STAGE {ROMAN[stage - 1]}</p>
            {(['top', 'bottom'] as const).map(row => {
              const slots = REFORGE_SLOTS.filter(s => s.stage === stage && s.row === row)
              return (
                <div key={row} className="mb-2 grid grid-cols-2 gap-2 last:mb-0">
                  {(['a', 'b'] as const).map(side => {
                    const def = slots.find(s => s.side === side)
                    if (def) {
                      return (
                        <SlotCard
                          key={side}
                          def={def}
                          nodes={nodes.filter(n => n.slot === def.id)}
                          onAdd={onAdd}
                          onEdit={onEdit}
                          onDelete={onDelete}
                        />
                      )
                    }
                    if (stage === EX_SLOT_STAGE && row === 'bottom' && side === 'b') {
                      return (
                        <div key={side} className="flex items-center justify-center rounded border border-dashed border-pink-400/40 p-2 text-center text-[11px] text-pink-300">
                          ช่อง EX — ตั้งค่าในส่วน Overlimit Anchor
                        </div>
                      )
                    }
                    return <div key={side} className="rounded border border-dashed border-ptn-border/40" aria-hidden />
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}

function SlotCard({ def, nodes, onAdd, onEdit, onDelete }: {
  def: ReforgeSlotDef
  nodes: ReforgeNode[]
  onAdd: (slot: ReforgeSlotId) => void
  onEdit: (node: ReforgeNode) => void
  onDelete: (id: string) => void
}) {
  const max = def.allowChoice ? 2 : 1
  return (
    <div className="min-h-[4.5rem] rounded border border-ptn-border bg-ptn-elevated/40 p-2">
      <p className="mb-1 text-[10px] text-ptn-disabled">
        {def.side === 'a' ? 'ซ้าย' : 'ขวา'} · {CATEGORY_LABEL[def.category]} · COST {def.defaultCost}
        {def.allowChoice && nodes.length === 2 && <span className="ml-1 text-rose-300">(Choice)</span>}
      </p>
      {nodes.map(n => (
        <div key={n.id} className="flex items-center gap-1.5 py-0.5 text-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: nodeRingColor(n) }} />
          <span className="min-w-0 flex-1 truncate text-ptn-text" title={n.name}>{n.name}</span>
          <span className="font-heading text-xs font-bold text-amber-400">{n.cost}</span>
          <button type="button" onClick={() => onEdit(n)} className="p-0.5 text-ptn-muted hover:text-ptn-cyan" aria-label={`แก้ไข ${n.name}`}>
            <Edit2 size={12} />
          </button>
          <button type="button" onClick={() => onDelete(n.id)} className="p-0.5 text-ptn-muted hover:text-red-400" aria-label={`ลบ ${n.name}`}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      {nodes.length < max && (
        <Button type="button" size="sm" variant="ghost" className="mt-0.5 w-full" onClick={() => onAdd(def.id)}>
          <Plus size={12} /> {nodes.length === 0 ? 'เพิ่มโหนด' : 'เพิ่มตัวเลือก Choice'}
        </Button>
      )}
    </div>
  )
}
