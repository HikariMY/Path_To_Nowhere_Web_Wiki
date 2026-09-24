import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { ImageUpload } from '../../../components/ui/ImageUpload'
import { newReforgeId, slotDef } from '../../../lib/reforge'
import type { ReforgeNode, ReforgeSlotId } from '../../../types/models'
import { CATEGORY_LABEL, slotLabel } from '../../../components/reforge/reforgeStyle'
import { ReforgeStatsEditor } from './ReforgeStatsEditor'

const blankNode = (slot: ReforgeSlotId): ReforgeNode => ({
  id: newReforgeId('n'),
  slot,
  name: '',
  cost: slotDef(slot).defaultCost,
  stats: [],
})

/**
 * Modal เพิ่ม/แก้โหนดของช่องหนึ่ง — ตำแหน่งมาจากช่องที่กด ไม่ต้องกรอกเอง
 * ผู้เรียก mount ใหม่ทุกครั้งที่เปิด (render เฉพาะตอนเปิด) ฟอร์มจึงเริ่มจากค่าใหม่เสมอ
 */
export function ReforgeNodeModal({ editing, slot, onClose, onSave }: {
  editing: ReforgeNode | null
  slot: ReforgeSlotId
  onClose: () => void
  onSave: (node: ReforgeNode) => void
}) {
  const [form, setForm] = useState<ReforgeNode>(() => editing ?? blankNode(slot))
  const def = slotDef(form.slot)

  const set = <K extends keyof ReforgeNode>(key: K, value: ReforgeNode[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      name: form.name.trim(),
      name_th: form.name_th?.trim() || undefined,
      description: form.description?.trim() || undefined,
      description_th: form.description_th?.trim() || undefined,
      stats: (form.stats ?? []).filter(s => s.label.trim()),
    })
  }

  return (
    <Modal open onClose={onClose} title={editing ? `แก้ไขโหนด: ${editing.name}` : 'เพิ่มโหนด'} size="lg">
      <div className="space-y-4">
        <p className="rounded border border-ptn-border bg-ptn-elevated px-3 py-2 text-sm text-ptn-muted">
          {slotLabel(def)} · {CATEGORY_LABEL[def.category]}
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_6rem]">
          <Input label="ชื่อ (อังกฤษ) *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Attack - Reforge" />
          <Input label="ชื่อ (ไทย)" value={form.name_th ?? ''} onChange={e => set('name_th', e.target.value)} />
          <Input
            label="COST"
            type="number"
            min="0"
            value={form.cost}
            onChange={e => set('cost', Number.isFinite(parseInt(e.target.value)) ? parseInt(e.target.value) : 0)}
          />
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
