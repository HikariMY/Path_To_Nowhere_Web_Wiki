import { useEffect, useState } from 'react'
import { Braces, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { REFORGE_STAGES, parseReforge, toggleNode, totalCost, validateReforge } from '../../lib/reforge'
import type { ReforgeData, ReforgeNode, ReforgeSlotId } from '../../types/models'
import { ReforgeTree, type ReforgeSelection } from '../../components/reforge/ReforgeTree'
import { CostMeter } from '../../components/reforge/CostMeter'
import { ReforgeNodeModal } from './reforge/ReforgeNodeModal'
import { ExAnchorEditor, PresetsEditor, StagesEditor } from './reforge/ReforgeExtrasEditor'
import { ReforgeSlotGrid } from './reforge/ReforgeSlotGrid'

const emptyReforge = (): ReforgeData => ({
  nodes: [],
  stages: REFORGE_STAGES.map(stage => ({ stage, intensify: [], materials: [] })),
  presets: [],
})

/**
 * แผง Reforge ของตัวละครหนึ่งตัว — แก้เป็นร่างในเครื่องก่อน แล้วกด "บันทึก Reforge" ครั้งเดียว
 * พรีวิวด้านล่างใช้คอมโพเนนต์เดียวกับหน้าตัวละคร
 */
export function ReforgePanel({ characterId, characterName }: { characterId: string; characterName: string }) {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [draft, setDraft] = useState<ReforgeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // เปิดอยู่ = มี slot; editing = null คือเพิ่มโหนดใหม่ในช่องนั้น
  const [nodeModal, setNodeModal] = useState<{ slot: ReforgeSlotId; editing: ReforgeNode | null } | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')

  const [previewIds, setPreviewIds] = useState<string[]>([])
  const [previewSel, setPreviewSel] = useState<ReforgeSelection>(null)

  // ผู้เรียกใส่ key={characterId} — สลับตัวละครแล้ว mount ใหม่ state เริ่มจาก loading เสมอ
  useEffect(() => {
    let cancelled = false
    supabase.from('characters').select('reforge').eq('id', characterId).single()
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        if (error) { toast('โหลดข้อมูล Reforge ไม่สำเร็จ: ' + error.message, 'error'); return }
        setDraft(parseReforge(data?.reforge))
        setDirty(false)
        setErrors([])
        setPreviewIds([])
      })
    return () => { cancelled = true }
  }, [characterId, toast])

  const edit = (next: ReforgeData) => { setDraft(next); setDirty(true); setErrors([]) }

  const persist = async (value: ReforgeData | null, logAction: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('characters')
      .update({ reforge: value, updated_at: new Date().toISOString() } as never)
      .eq('id', characterId)
    setSaving(false)
    if (error) { toast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return false }
    setDirty(false)
    await supabase.from('admin_logs').insert({
      admin_id: profile!.id,
      action: `${logAction}: ${characterName}`,
      target_table: 'characters',
      target_id: characterId,
    } as never)
    return true
  }

  const handleSave = async () => {
    if (!draft) return
    const problems = validateReforge(draft)
    setErrors(problems)
    if (problems.length > 0) { toast('ยังบันทึกไม่ได้ — ดูรายการปัญหาด้านบน', 'error'); return }
    // ไม่มีทั้งโหนดและ EX = ไม่มี Reforge → เก็บเป็น null เพื่อซ่อนแท็บ
    const empty = draft.nodes.length === 0 && !draft.ex_anchor
    // ข้อมูลราย Stage / ชุดแนะนำที่ไม่มีโหนดรองรับจะหายไปด้วย — ต้องถามก่อน ไม่ลบเงียบ ๆ
    const hasStageData = draft.stages.some(s => s.intensify.length > 0 || s.materials.length > 0)
    if (empty && (hasStageData || draft.presets.length > 0)
      && !confirm('ยังไม่มีโหนดและ EX — บันทึกตอนนี้จะลบ Reforge ของตัวละครนี้ทั้งหมด รวมข้อมูลราย Stage และ Recommended Set ด้วย ต้องการบันทึกไหม?')) {
      return
    }
    if (await persist(empty ? null : draft, 'แก้ไข Reforge')) {
      if (empty) setDraft(null)
      toast(empty ? 'ลบข้อมูล Reforge แล้ว (ไม่มีโหนดและ EX)' : 'บันทึก Reforge แล้ว', 'success')
    }
  }

  const handleClearAll = async () => {
    if (!confirm(`ลบข้อมูล Reforge ทั้งหมดของ ${characterName}? ย้อนกลับไม่ได้`)) return
    if (await persist(null, 'ลบ Reforge')) {
      setDraft(null)
      toast('ลบข้อมูล Reforge แล้ว', 'success')
    }
  }

  const saveNode = (node: ReforgeNode) => {
    if (!draft) return
    const exists = draft.nodes.some(n => n.id === node.id)
    edit({ ...draft, nodes: exists ? draft.nodes.map(n => (n.id === node.id ? node : n)) : [...draft.nodes, node] })
    setNodeModal(null)
  }

  const deleteNode = (id: string) => {
    if (!draft) return
    edit({
      ...draft,
      nodes: draft.nodes.filter(n => n.id !== id),
      presets: draft.presets.map(p => ({ ...p, node_ids: p.node_ids.filter(x => x !== id) })),
    })
    setPreviewIds(prev => prev.filter(x => x !== id))
  }

  const applyJson = () => {
    let raw: unknown
    try {
      raw = JSON.parse(jsonText)
    } catch {
      toast('JSON ไม่ถูกต้อง', 'error')
      return
    }
    const parsed = parseReforge(raw)
    if (!parsed) { toast('ไม่พบโหนดหรือ EX ที่ใช้ได้ใน JSON', 'error'); return }
    // parseReforge ทิ้งรายการที่ข้อมูลไม่ครบแบบเงียบ ๆ — บอกแอดมินว่าหายไปกี่รายการ
    const count = (key: string) => {
      const list = (raw as Record<string, unknown>)[key]
      return Array.isArray(list) ? list.length : 0
    }
    // ข้อมูลราย Stage: นับสเตตัส + วัสดุของ Stage 1–4 ใน JSON เทียบกับที่อ่านได้
    const rawStages = (raw as Record<string, unknown>).stages
    const rawStageItems = (Array.isArray(rawStages) ? rawStages : []).reduce<number>((sum, s) => {
      if (typeof s !== 'object' || s === null || !REFORGE_STAGES.includes((s as { stage?: unknown }).stage as 1)) return sum
      const { intensify, materials } = s as { intensify?: unknown; materials?: unknown }
      return sum + (Array.isArray(intensify) ? intensify.length : 0) + (Array.isArray(materials) ? materials.length : 0)
    }, 0)
    const parsedStageItems = parsed.stages.reduce((sum, s) => sum + s.intensify.length + s.materials.length, 0)
    const dropped = (count('nodes') - parsed.nodes.length)
      + (count('presets') - parsed.presets.length)
      + (rawStageItems - parsedStageItems)
    edit(parsed)
    setJsonOpen(false)
    if (dropped > 0) {
      toast(`นำเข้าแล้ว แต่ข้ามไป ${dropped} รายการที่ข้อมูลไม่ครบ (เช่น slot ไม่ถูกต้อง หรือ cost/qty/value ไม่ใช่ตัวเลข) — ตรวจก่อนบันทึก`, 'error')
    } else {
      toast('นำเข้าร่างแล้ว — อย่าลืมกดบันทึก', 'info')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  if (!draft) {
    return (
      <Card className="p-8 text-center">
        <p className="mb-4 text-ptn-disabled">{characterName} ยังไม่มีข้อมูล Reforge — แท็บจะถูกซ่อนในหน้าตัวละคร</p>
        <Button onClick={() => { setDraft(emptyReforge()); setDirty(true) }}><Plus size={14} /> เริ่มสร้าง Reforge</Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── หัว: ปุ่มบันทึก (COST เป็นค่าคงที่ของระบบ 21(+5)) ── */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <p className="text-xs text-ptn-disabled">เพดาน COST 21(+5) เป็นค่าคงที่ของระบบ เหมือนกันทุกตัวละคร</p>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setJsonText(JSON.stringify(draft, null, 2)); setJsonOpen(true) }}>
            <Braces size={14} /> JSON
          </Button>
          <Button size="sm" variant="danger" onClick={handleClearAll} disabled={saving}>
            <Trash2 size={14} /> ลบทั้งหมด
          </Button>
          <Button size="sm" onClick={handleSave} loading={saving} className={dirty ? 'animate-pulse-slow' : undefined}>
            <Save size={14} /> บันทึก Reforge{dirty && ' *'}
          </Button>
        </div>
        {errors.length > 0 && (
          <ul className="w-full list-inside list-disc rounded border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-300">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
      </Card>

      <ReforgeSlotGrid
        nodes={draft.nodes}
        onAdd={slot => setNodeModal({ slot, editing: null })}
        onEdit={n => setNodeModal({ slot: n.slot, editing: n })}
        onDelete={deleteNode}
      />

      <StagesEditor data={draft} onChange={edit} />
      <ExAnchorEditor data={draft} onChange={edit} />
      <PresetsEditor data={draft} onChange={edit} />

      {/* ── พรีวิวสด ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-ptn-text">พรีวิว (ร่างปัจจุบัน)</h3>
          <CostMeter used={totalCost(draft, previewIds)} />
        </div>
        {draft.nodes.length > 0 ? (
          <ReforgeTree
            data={draft}
            activeIds={previewIds}
            selection={previewSel}
            onSelect={sel => {
              setPreviewSel(sel)
              if (sel?.kind === 'node') setPreviewIds(prev => toggleNode(draft, prev, sel.id))
            }}
            onToggle={() => {}}
          />
        ) : (
          <Card className="p-6 text-center text-sm text-ptn-disabled">เพิ่มโหนดเพื่อดูพรีวิว</Card>
        )}
        <p className="text-[11px] text-ptn-disabled">คลิกโหนดในพรีวิวเพื่อเปิด/ปิด (ไม่บันทึก)</p>
      </div>

      {nodeModal && (
        <ReforgeNodeModal
          editing={nodeModal.editing}
          slot={nodeModal.slot}
          onClose={() => setNodeModal(null)}
          onSave={saveNode}
        />
      )}

      <Modal open={jsonOpen} onClose={() => setJsonOpen(false)} title="นำเข้า / ส่งออก JSON" size="lg">
        <div className="space-y-3">
          <p className="text-xs text-ptn-muted">คัดลอกไปใช้กับตัวละครอื่น หรือวาง JSON แล้วกดนำเข้าเพื่อแทนที่ร่างทั้งหมด</p>
          <textarea
            className="h-80 w-full rounded border border-ptn-border bg-ptn-elevated p-2 font-mono text-xs text-ptn-text outline-none focus:border-ptn-cyan"
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex gap-2">
            <Button onClick={applyJson}>นำเข้า (แทนที่ร่าง)</Button>
            <Button variant="ghost" onClick={() => setJsonOpen(false)}>ปิด</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
