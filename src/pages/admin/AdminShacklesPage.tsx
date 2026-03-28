// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Search, Unlink } from 'lucide-react'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import type { ShackleBreak } from '../../types/models'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { JOB_CLASS_LABEL } from '../../lib/constants'

type ShackleForm = {
  stage: string
  cost: string
  name: string
  icon_url: string
  bonus_th: string
  bonus: string
}

const blankForm = (): ShackleForm => ({
  stage: '1',
  cost: '0',
  name: '',
  icon_url: '',
  bonus_th: '',
  bonus: '',
})

const STAGE_COLORS = [
  '#64748b', // S1 slate
  '#22c55e', // S2 green
  '#3b82f6', // S3 blue
  '#a855f7', // S4 purple
  '#f59e0b', // S5 amber
  '#ef4444', // S6 red
]

export function AdminShacklesPage() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingChars, setLoadingChars] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [shackles, setShackles] = useState<ShackleBreak[]>([])
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<number | null>(null)
  const [form, setForm] = useState<ShackleForm>(blankForm())
  const [deleting, setDeleting] = useState<number | null>(null)

  useEffect(() => { fetchChars() }, [])

  const fetchChars = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, slug, rarity, faction, job_class, portrait_url, shackles')
      .order('rarity').order('name')
    setCharacters(data || [])
    setLoadingChars(false)
  }

  const selectCharacter = (char: Character) => {
    setSelectedChar(char)
    const raw = char.shackles
    setShackles(Array.isArray(raw) ? (raw as ShackleBreak[]) : [])
  }

  const persistShackles = async (updated: ShackleBreak[]) => {
    if (!selectedChar) return false
    setSaving(true)
    const { error } = await supabase
      .from('characters')
      .update({ shackles: updated, updated_at: new Date().toISOString() } as never)
      .eq('id', selectedChar.id)
    setSaving(false)
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message, 'error'); return false }
    setShackles(updated)
    setCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, shackles: updated } : c))
    setSelectedChar(prev => prev ? { ...prev, shackles: updated } : prev)
    await supabase.from('admin_logs').insert({
      admin_id: profile!.id,
      action: `แก้ไข Shackle Break: ${selectedChar.name}`,
      target_table: 'characters',
      target_id: selectedChar.id,
    } as never)
    return true
  }

  const openCreate = () => {
    setEditingStage(null)
    // suggest next missing stage
    const usedStages = shackles.map(s => s.stage)
    const nextStage = [1,2,3,4,5,6].find(n => !usedStages.includes(n)) ?? 1
    setForm({ ...blankForm(), stage: String(nextStage) })
    setModalOpen(true)
  }

  const openEdit = (s: ShackleBreak) => {
    setEditingStage(s.stage)
    setForm({
      stage: String(s.stage),
      cost: String(s.cost ?? 0),
      name: s.name || '',
      icon_url: s.icon_url || '',
      bonus_th: s.bonus_th || '',
      bonus: s.bonus || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.bonus_th.trim()) { toast('กรุณากรอกคำอธิบาย (ภาษาไทย)', 'error'); return }
    const payload: ShackleBreak = {
      stage: parseInt(form.stage) || 1,
      cost: parseInt(form.cost) || 0,
      name: form.name.trim(),
      icon_url: form.icon_url.trim() || undefined,
      bonus_th: form.bonus_th.trim(),
      bonus: form.bonus.trim() || form.bonus_th.trim(),
    }
    let updated: ShackleBreak[]
    if (editingStage !== null) {
      updated = shackles.map(s => s.stage === editingStage ? payload : s)
    } else {
      // replace if stage already exists, otherwise append
      const exists = shackles.find(s => s.stage === payload.stage)
      updated = exists
        ? shackles.map(s => s.stage === payload.stage ? payload : s)
        : [...shackles, payload]
    }
    // sort by stage
    updated.sort((a, b) => a.stage - b.stage)
    const ok = await persistShackles(updated)
    if (ok) { toast('บันทึกสำเร็จ', 'success'); setModalOpen(false) }
  }

  const handleDelete = async (stage: number) => {
    if (!confirm(`ลบ Shackle Break S${stage}?`)) return
    setDeleting(stage)
    const updated = shackles.filter(s => s.stage !== stage)
    const ok = await persistShackles(updated)
    if (ok) toast('ลบสำเร็จ', 'success')
    setDeleting(null)
  }

  const filteredChars = characters.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loadingChars) return <PageLoader />

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Character selector ─────────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col gap-3">
        <h2 className="font-heading text-lg font-bold text-ptn-text">เลือกตัวละคร</h2>
        <Input
          placeholder="ค้นหา..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={13} />}
        />
        <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
          {filteredChars.map(c => (
            <button
              key={c.id}
              onClick={() => selectCharacter(c)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-left text-sm transition-colors ${
                selectedChar?.id === c.id
                  ? 'bg-ptn-red/10 text-ptn-text border border-ptn-red/30'
                  : 'text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated border border-transparent'
              }`}
            >
              {c.portrait_url && (
                <img src={c.portrait_url} alt={c.name} className="w-7 h-7 rounded object-cover border border-ptn-border shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-medium text-ptn-text truncate">{c.name}</div>
                <div className="text-xs text-ptn-muted">{c.rarity}-Rank · {JOB_CLASS_LABEL[c.job_class] || c.job_class}</div>
              </div>
              {Array.isArray(c.shackles) && c.shackles.length > 0 && (
                <span className="ml-auto text-xs text-ptn-cyan shrink-0 font-mono">{c.shackles.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Shackles editor ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!selectedChar ? (
          <div className="flex flex-col items-center justify-center h-64 text-ptn-muted">
            <Unlink size={32} className="mb-3 opacity-30" />
            <p>เลือกตัวละครเพื่อจัดการ Shackle Break</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {selectedChar.portrait_url && (
                  <img src={selectedChar.portrait_url} alt={selectedChar.name} className="w-10 h-10 rounded object-cover border border-ptn-border" />
                )}
                <div>
                  <h1 className="font-heading text-xl font-bold text-ptn-text">{selectedChar.name}</h1>
                  <p className="text-sm text-ptn-muted">{selectedChar.rarity}-Rank · {shackles.length}/6 Shackle Breaks</p>
                </div>
              </div>
              <Button onClick={openCreate} size="sm" disabled={saving || shackles.length >= 6}>
                <Plus size={14} /> เพิ่ม Shackle Break
              </Button>
            </div>

            {/* Shackle grid */}
            <div className="space-y-2">
              {shackles.length > 0 ? shackles.map(s => {
                const color = STAGE_COLORS[(s.stage - 1) % STAGE_COLORS.length]
                return (
                  <Card key={s.stage} className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon or Stage badge */}
                      {s.icon_url ? (
                        <img src={s.icon_url} alt={`S${s.stage}`} className="shrink-0 w-10 h-10 rounded object-contain border border-ptn-border" />
                      ) : (
                        <div
                          className="shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-heading font-bold text-sm"
                          style={{ borderColor: color, color }}
                        >
                          S{s.stage}
                        </div>
                      )}
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="font-heading font-bold text-sm leading-snug" style={{ color }}>
                          S{s.stage}{s.name && <span className="ml-1.5 text-ptn-text font-medium">{s.name}</span>}
                        </p>
                        <p className="text-sm text-ptn-text leading-snug mt-0.5">{s.bonus_th}</p>
                        {s.bonus && s.bonus !== s.bonus_th && (
                          <p className="text-xs text-ptn-disabled mt-0.5">{s.bonus}</p>
                        )}
                      </div>
                      {/* Cost */}
                      {s.cost > 0 && (
                        <span className="shrink-0 text-xs text-ptn-disabled mt-1 font-mono">{s.cost} หิน</span>
                      )}
                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Edit2 size={13} /></Button>
                        <Button size="sm" variant="danger" loading={deleting === s.stage} onClick={() => handleDelete(s.stage)}><Trash2 size={13} /></Button>
                      </div>
                    </div>
                  </Card>
                )
              }) : (
                <Card className="p-8 text-center text-ptn-disabled">
                  ยังไม่มีข้อมูล Shackle Break — กด <span className="text-ptn-cyan">เพิ่ม Shackle Break</span> เพื่อเริ่มต้น
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStage !== null ? `แก้ไข Shackle Break S${editingStage}` : 'เพิ่ม Shackle Break'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Stage */}
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1.5">Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-ptn-elevated border border-ptn-border rounded text-ptn-text focus:outline-none focus:border-ptn-cyan"
              >
                {[1,2,3,4,5,6].map(n => (
                  <option key={n} value={String(n)}>S{n}</option>
                ))}
              </select>
            </div>
            {/* Cost */}
            <Input
              label="ค่าใช้จ่าย (หิน)"
              type="number"
              min="0"
              value={form.cost}
              onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
              placeholder="0"
            />
          </div>

          {/* Name + Icon */}
          <Input
            label="ชื่อ Shackle Break"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="เช่น Blade Incarnate"
          />

          <ImageUpload
            bucket="characters"
            label="ไอคอน (Icon)"
            currentUrl={form.icon_url || null}
            aspectRatio="square"
            onUpload={url => setForm(p => ({ ...p, icon_url: url }))}
          />

          <Textarea
            label="คำอธิบาย (ภาษาไทย) *"
            value={form.bonus_th}
            onChange={e => setForm(p => ({ ...p, bonus_th: e.target.value }))}
            rows={3}
            placeholder="เช่น เพิ่มพลังโจมตี 15%..."
          />

          <Textarea
            label="คำอธิบาย (ภาษาอังกฤษ) — ไม่บังคับ"
            value={form.bonus}
            onChange={e => setForm(p => ({ ...p, bonus: e.target.value }))}
            rows={3}
            placeholder="เช่น Increases ATK by 15%..."
          />

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} loading={saving}>
              <Plus size={14} /> {editingStage !== null ? 'บันทึกการแก้ไข' : 'เพิ่ม'}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
