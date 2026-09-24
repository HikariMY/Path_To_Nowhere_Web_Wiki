import { useEffect, useState } from 'react'
import { Braces, Edit2, Plus, Save, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_COST_BASE, parseReforge, toggleNode, totalCost, validateReforge } from '../../lib/reforge'
import type { ReforgeData, ReforgeNode } from '../../types/models'
import { ReforgeTree, type ReforgeSelection } from '../../components/reforge/ReforgeTree'
import { CostMeter } from '../../components/reforge/CostMeter'
import { nodeRingColor } from '../../components/reforge/reforgeStyle'
import { ReforgeNodeModal } from './reforge/ReforgeNodeModal'
import { EffectsEditor, ExAnchorEditor, PresetsEditor } from './reforge/ReforgeExtrasEditor'

const emptyReforge = (): ReforgeData => ({ cost_base: DEFAULT_COST_BASE, cost_bonus: 5, nodes: [], effects: [], presets: [] })

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

  const [nodeModal, setNodeModal] = useState<{ open: boolean; editing: ReforgeNode | null }>({ open: false, editing: null })
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
    // Effect / ชุดแนะนำที่ไม่มีโหนดรองรับจะหายไปด้วย — ต้องถามก่อน ไม่ลบเงียบ ๆ
    if (empty && (draft.effects.length > 0 || draft.presets.length > 0)
      && !confirm('ยังไม่มีโหนดและ EX — บันทึกตอนนี้จะลบ Reforge ของตัวละครนี้ทั้งหมด รวม Reforge Effect และ Recommended Set ด้วย ต้องการบันทึกไหม?')) {
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
    setNodeModal({ open: false, editing: null })
  }

  const deleteNode = (id: string) => {
    if (!draft) return
    edit({
      ...draft,
      nodes: draft.nodes.filter(n => n.id !== id).map(n => (n.linked_to === id ? { ...n, linked_to: undefined } : n)),
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
    const dropped = (count('nodes') - parsed.nodes.length)
      + (count('effects') - parsed.effects.length)
      + (count('presets') - parsed.presets.length)
    edit(parsed)
    setJsonOpen(false)
    if (dropped > 0) {
      toast(`นำเข้าแล้ว แต่ข้ามไป ${dropped} รายการที่ข้อมูลไม่ครบ (เช่น stage/row/cost ผิดชนิด) — ตรวจก่อนบันทึก`, 'error')
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

  const stages = [...new Set(draft.nodes.map(n => n.stage))].sort((a, b) => a - b)
  const nextStage = stages.length > 0 ? stages[stages.length - 1] : 1

  return (
    <div className="space-y-4">
      {/* ── หัว: COST + ปุ่มบันทึก ── */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-24">
          <Input label="COST ฐาน" type="number" min="0" value={draft.cost_base} onChange={e => edit({ ...draft, cost_base: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="w-24">
          <Input label="COST โบนัส" type="number" min="0" value={draft.cost_bonus} onChange={e => edit({ ...draft, cost_bonus: parseInt(e.target.value) || 0 })} />
        </div>
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

      {/* ── รายการโหนด ── */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-ptn-text">โหนด ({draft.nodes.length})</h3>
          <Button size="sm" onClick={() => setNodeModal({ open: true, editing: null })}><Plus size={13} /> เพิ่มโหนด</Button>
        </div>
        {draft.nodes.length === 0 && <p className="text-sm text-ptn-disabled">ยังไม่มีโหนด</p>}
        <div className="space-y-3">
          {stages.map(stage => (
            <div key={stage}>
              <p className="mb-1 font-heading text-xs font-bold tracking-widest text-ptn-muted">STAGE {stage}</p>
              <div className="divide-y divide-ptn-border/50 rounded border border-ptn-border">
                {draft.nodes
                  .filter(n => n.stage === stage)
                  .sort((a, b) => (a.row === b.row ? a.col - b.col : a.row === 'top' ? -1 : 1))
                  .map(n => (
                    <div key={n.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: nodeRingColor(n) }} />
                      <span className="flex-1 text-ptn-text">
                        {n.name}
                        {n.choice_group && <span className="ml-2 text-xs text-rose-300">Choice: {n.choice_group}</span>}
                      </span>
                      <span className="text-xs text-ptn-disabled">{n.row === 'top' ? 'บน' : 'ล่าง'} · คอลัมน์ {n.col}</span>
                      <span className="w-6 text-center font-heading font-bold text-amber-400">{n.cost}</span>
                      <Button size="sm" variant="ghost" onClick={() => setNodeModal({ open: true, editing: n })} aria-label="แก้ไข"><Edit2 size={13} /></Button>
                      <Button size="sm" variant="danger" onClick={() => deleteNode(n.id)} aria-label="ลบ"><Trash2 size={13} /></Button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <EffectsEditor data={draft} onChange={edit} />
      <ExAnchorEditor data={draft} onChange={edit} />
      <PresetsEditor data={draft} onChange={edit} />

      {/* ── พรีวิวสด ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-ptn-text">พรีวิว (ร่างปัจจุบัน)</h3>
          <CostMeter used={totalCost(draft, previewIds)} base={draft.cost_base} bonus={draft.cost_bonus} />
        </div>
        {draft.nodes.length > 0 || draft.effects.length > 0 ? (
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

      {nodeModal.open && (
        <ReforgeNodeModal
          editing={nodeModal.editing}
          defaultStage={nextStage}
          allNodes={draft.nodes}
          onClose={() => setNodeModal({ open: false, editing: null })}
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
