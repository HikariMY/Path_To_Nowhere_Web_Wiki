import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { ImageUpload } from '../../../components/ui/ImageUpload'
import { Card } from '../../../components/ui/Card'
import { JOB_CLASS_LABEL } from '../../../lib/constants'
import { MAX_MATERIALS_PER_STAGE, newReforgeId, slotDef } from '../../../lib/reforge'
import type { ReforgeData, ReforgeExAnchor, ReforgeMaterial, ReforgePreset, ReforgeStageInfo } from '../../../types/models'
import { ROMAN } from '../../../components/reforge/reforgeStyle'
import { ReforgeStatsEditor } from './ReforgeStatsEditor'

type Change = (next: ReforgeData) => void

const smallInput = 'rounded border border-ptn-border bg-ptn-elevated px-2 py-1.5 text-sm text-ptn-text outline-none focus:border-ptn-cyan'

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-ptn-text">{title}</h3>
        {action}
      </div>
      {children}
    </Card>
  )
}

// ---- ข้อมูลราย Stage: วง Intensify + วัสดุปลด ------------------------------

export function StagesEditor({ data, onChange }: { data: ReforgeData; onChange: Change }) {
  const update = (stage: number, patch: Partial<ReforgeStageInfo>) =>
    onChange({ ...data, stages: data.stages.map(s => (s.stage === stage ? { ...s, ...patch } : s)) })

  const updateMaterial = (s: ReforgeStageInfo, i: number, patch: Partial<ReforgeMaterial>) =>
    update(s.stage, { materials: s.materials.map((m, j) => (j === i ? { ...m, ...patch } : m)) })

  return (
    <Section title="ข้อมูลราย Stage">
      <p className="mb-3 text-xs text-ptn-disabled">
        วง COST (Leap) กับเพดาน COST เป็นค่าคงที่ของระบบ ไม่ต้องกรอก — กรอกแค่สเตตัสวง Intensify และวัสดุปลด (ไม่เกิน {MAX_MATERIALS_PER_STAGE} ชิ้น)
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {data.stages.map(s => (
          <div key={s.stage} className="space-y-3 rounded border border-ptn-border p-3">
            <p className="font-heading text-sm font-bold text-ptn-text">Stage {ROMAN[s.stage - 1]}</p>

            <div>
              <p className="mb-1 text-xs text-ptn-muted">วง Intensify</p>
              <ReforgeStatsEditor stats={s.intensify} onChange={intensify => update(s.stage, { intensify })} />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-ptn-muted">วัสดุที่ใช้ปลด</p>
              {s.materials.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-14 shrink-0">
                    <ImageUpload
                      bucket="characters"
                      currentUrl={m.icon_url || null}
                      aspectRatio="square"
                      onUpload={url => updateMaterial(s, i, { icon_url: url })}
                    />
                  </div>
                  <input
                    className={`${smallInput} min-w-0 flex-1`}
                    value={m.name}
                    onChange={e => updateMaterial(s, i, { name: e.target.value })}
                    placeholder="ชื่อวัสดุ"
                    aria-label="ชื่อวัสดุ"
                  />
                  <input
                    className={`${smallInput} w-16`}
                    type="number"
                    min="1"
                    value={m.qty}
                    onChange={e => updateMaterial(s, i, { qty: parseInt(e.target.value) || 0 })}
                    aria-label="จำนวน"
                  />
                  <button
                    type="button"
                    className="p-1 text-ptn-muted hover:text-red-400"
                    onClick={() => update(s.stage, { materials: s.materials.filter((_, j) => j !== i) })}
                    aria-label="ลบวัสดุ"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {s.materials.length < MAX_MATERIALS_PER_STAGE && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => update(s.stage, { materials: [...s.materials, { name: '', qty: 1 }] })}
                >
                  <Plus size={13} /> เพิ่มวัสดุ
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ---- Overlimit Anchor (EX) ----------------------------------------------

const blankEx = (): ReforgeExAnchor => ({ name: '', description: '', exclusive_classes: [] })

export function ExAnchorEditor({ data, onChange }: { data: ReforgeData; onChange: Change }) {
  const ex = data.ex_anchor
  const set = (patch: Partial<ReforgeExAnchor>) => onChange({ ...data, ex_anchor: { ...(ex ?? blankEx()), ...patch } })
  const remove = () => onChange({ ...data, ex_anchor: undefined })
  const toggleClass = (key: string) => {
    const current = ex?.exclusive_classes ?? []
    set({ exclusive_classes: current.includes(key) ? current.filter(c => c !== key) : [...current, key] })
  }

  return (
    <Section
      title="Overlimit Anchor (EX) ของตัวละครนี้"
      action={ex
        ? <Button size="sm" variant="danger" onClick={remove}><Trash2 size={13} /> ลบ EX</Button>
        : <Button size="sm" variant="secondary" onClick={() => set({})}><Plus size={13} /> เพิ่ม EX</Button>}
    >
      {!ex ? (
        <p className="text-sm text-ptn-disabled">ไม่มี EX — ตัวละครอื่นจะยืม EX ของตัวนี้ไม่ได้</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="ชื่อ (อังกฤษ) *" value={ex.name} onChange={e => set({ name: e.target.value })} placeholder="Eternal Blossom" />
            <Input label="ชื่อ (ไทย)" value={ex.name_th ?? ''} onChange={e => set({ name_th: e.target.value || undefined })} />
          </div>
          <Textarea label="คำอธิบาย (อังกฤษ) *" rows={2} value={ex.description} onChange={e => set({ description: e.target.value })} />
          <Textarea label="คำอธิบาย (ไทย)" rows={2} value={ex.description_th ?? ''} onChange={e => set({ description_th: e.target.value || undefined })} />
          <div>
            <p className="mb-1.5 text-sm font-medium text-ptn-muted">Exclusive to (แสดงเป็นข้อมูลเท่านั้น — ในเกมใส่ได้ทุกคลาส)</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(JOB_CLASS_LABEL).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5 text-sm text-ptn-text">
                  <input type="checkbox" className="accent-rose-600" checked={ex.exclusive_classes.includes(key)} onChange={() => toggleClass(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <ImageUpload bucket="characters" label="ไอคอน EX" currentUrl={ex.icon_url || null} aspectRatio="square" onUpload={url => set({ icon_url: url })} />
        </div>
      )}
    </Section>
  )
}

// ---- Recommended Set ------------------------------------------------------

export function PresetsEditor({ data, onChange }: { data: ReforgeData; onChange: Change }) {
  const update = (id: string, patch: Partial<ReforgePreset>) =>
    onChange({ ...data, presets: data.presets.map(p => (p.id === id ? { ...p, ...patch } : p)) })
  const add = () =>
    onChange({ ...data, presets: [...data.presets, { id: newReforgeId('p'), name: 'Recommended Set', node_ids: [] }] })

  return (
    <Section title="Recommended Set" action={<Button size="sm" variant="secondary" onClick={add}><Plus size={13} /> เพิ่มชุด</Button>}>
      {data.presets.length === 0 && <p className="text-sm text-ptn-disabled">ยังไม่มี — ชุดแรกจะถูกเปิดเป็นค่าเริ่มต้นในหน้าตัวละคร</p>}
      <div className="space-y-3">
        {data.presets.map(p => (
          <div key={p.id} className="rounded border border-ptn-border p-3">
            <div className="mb-2 flex items-center gap-2">
              <input className={`${smallInput} flex-1`} value={p.name} onChange={e => update(p.id, { name: e.target.value })} aria-label="ชื่อชุด" />
              <button
                type="button"
                className="p-1 text-ptn-muted hover:text-red-400"
                onClick={() => onChange({ ...data, presets: data.presets.filter(x => x.id !== p.id) })}
                aria-label="ลบชุด"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2">
              {data.nodes.map(n => (
                <label key={n.id} className="flex items-center gap-1.5 text-xs text-ptn-text">
                  <input
                    type="checkbox"
                    className="accent-rose-600"
                    checked={p.node_ids.includes(n.id)}
                    onChange={() => update(p.id, {
                      node_ids: p.node_ids.includes(n.id) ? p.node_ids.filter(id => id !== n.id) : [...p.node_ids, n.id],
                    })}
                  />
                  S{slotDef(n.slot).stage} · {n.name} <span className="text-amber-400">({n.cost})</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
