import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { ImageUpload } from '../../../components/ui/ImageUpload'
import { newReforgeId } from '../../../lib/reforge'
import type { ReforgeNode } from '../../../types/models'
import { ReforgeStatsEditor } from './ReforgeStatsEditor'

const blankNode = (stage: number): ReforgeNode => ({
  id: newReforgeId('n'),
  name: '',
  category: 'attribute',
  cost: 1,
  stage,
  row: 'top',
  col: 1,
  stats: [],
})

/**
 * Modal เพิ่ม/แก้โหนด — editing = null คือเพิ่มใหม่
 * ผู้เรียก mount ใหม่ทุกครั้งที่เปิด (render เฉพาะตอนเปิด) ฟอร์มจึงเริ่มจากค่าใหม่เสมอ
 */
export function ReforgeNodeModal({ editing, defaultStage, allNodes, onClose, onSave }: {
  editing: ReforgeNode | null
  defaultStage: number
  allNodes: ReforgeNode[]
  onClose: () => void
  onSave: (node: ReforgeNode) => void
}) {
  const [form, setForm] = useState<ReforgeNode>(() => editing ?? blankNode(defaultStage))

  const set = <K extends keyof ReforgeNode>(key: K, value: ReforgeNode[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))
  const num = (v: string, fallback: number) => (Number.isFinite(parseInt(v)) ? parseInt(v) : fallback)

  // กลุ่ม Choice ที่มีอยู่แล้ว — เลือกซ้ำเพื่อจับคู่
  const groups = [...new Set(allNodes.map(n => n.choice_group).filter((g): g is string => !!g))]
  const others = allNodes.filter(n => n.id !== form.id)

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      name: form.name.trim(),
      name_th: form.name_th?.trim() || undefined,
      description: form.description?.trim() || undefined,
      description_th: form.description_th?.trim() || undefined,
      choice_group: form.choice_group?.trim() || undefined,
      linked_to: form.linked_to || undefined,
      stats: (form.stats ?? []).filter(s => s.label.trim()),
    })
  }

  return (
    <Modal open onClose={onClose} title={editing ? `แก้ไขโหนด: ${editing.name}` : 'เพิ่มโหนด'} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="ชื่อ (อังกฤษ) *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Attack - Reforge" />
          <Input label="ชื่อ (ไทย)" value={form.name_th ?? ''} onChange={e => set('name_th', e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Select label="ประเภท" value={form.category} onChange={e => set('category', e.target.value as ReforgeNode['category'])}>
            <option value="attribute">Attribute</option>
            <option value="special">Special Effect</option>
          </Select>
          <Input label="COST" type="number" min="0" value={form.cost} onChange={e => set('cost', num(e.target.value, 0))} />
          <Input label="Stage" type="number" min="1" value={form.stage} onChange={e => set('stage', num(e.target.value, 1))} />
          <Select label="แถว" value={form.row} onChange={e => set('row', e.target.value as ReforgeNode['row'])}>
            <option value="top">บน</option>
            <option value="bottom">ล่าง</option>
          </Select>
          <Input label="คอลัมน์" type="number" min="1" value={form.col} onChange={e => set('col', num(e.target.value, 1))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Input
              label="กลุ่ม Choice (เว้นว่าง = ไม่ใช่ Choice)"
              value={form.choice_group ?? ''}
              onChange={e => set('choice_group', e.target.value)}
              list="reforge-choice-groups"
              placeholder="เช่น ult"
            />
            <datalist id="reforge-choice-groups">
              {groups.map(g => <option key={g} value={g} />)}
            </datalist>
            <p className="mt-1 text-[11px] text-ptn-disabled">โหนดในกลุ่มเดียวกันวางช่องเดียวกัน (Stage/แถว/คอลัมน์) ได้</p>
          </div>
          <Select label="เส้นเชื่อมไปโหนด" value={form.linked_to ?? ''} onChange={e => set('linked_to', e.target.value)}>
            <option value="">— ไม่มี —</option>
            {others.map(n => <option key={n.id} value={n.id}>S{n.stage} · {n.name}</option>)}
          </Select>
        </div>

        <ImageUpload
          bucket="characters"
          label="ไอคอน"
          currentUrl={form.icon_url || null}
          aspectRatio="square"
          onUpload={url => set('icon_url', url)}
        />

        <Textarea label="คำอธิบาย (ไทย) — รองรับ markdown" rows={3} value={form.description_th ?? ''} onChange={e => set('description_th', e.target.value)} />
        <Textarea label="คำอธิบาย (อังกฤษ)" rows={3} value={form.description ?? ''} onChange={e => set('description', e.target.value)} />

        <div>
          <p className="mb-1.5 text-sm font-medium text-ptn-muted">สเตตัส (ใช้รวมในสรุปสเตตัส)</p>
          <ReforgeStatsEditor stats={form.stats ?? []} onChange={stats => set('stats', stats)} />
        </div>

        <div className="flex gap-3 pt-1">
          <Button onClick={handleSave} disabled={!form.name.trim()}>{editing ? 'บันทึกโหนด' : 'เพิ่มโหนด'}</Button>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        </div>
        <p className="text-[11px] text-ptn-disabled">การแก้ไขยังอยู่ในร่าง — กด "บันทึก Reforge" ด้านบนเพื่อบันทึกลงฐานข้อมูล</p>
      </div>
    </Modal>
  )
}
