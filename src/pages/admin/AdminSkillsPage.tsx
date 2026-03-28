// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Search, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { JOB_CLASS_LABEL, ALIGNMENT_LABEL } from '../../lib/constants'
import type { CharacterSkill, SkillRange } from '../../types/models'

// ── types ───────────────────────────────────────────────────────────────────

type SkillForm = {
  id: string
  name: string
  order: string      // "1" - "4"
  tags: string       // comma-separated
  description: string
  icon_url: string
  levels: string[]   // length 10
  hasRange: boolean
  range: SkillRange
}

const DEFAULT_RANGE: SkillRange = { rows: 3, cols: 3, cells: Array(9).fill(0) }

type ExclusiveForm = {
  name: string
  image_url: string
  description: string
  flavor_text: string
  hasRange: boolean
  range: SkillRange
}

const blankExclusive = (): ExclusiveForm => ({
  name: '',
  image_url: '',
  description: '',
  flavor_text: '',
  hasRange: false,
  range: { ...DEFAULT_RANGE, cells: [...DEFAULT_RANGE.cells] },
})

const newId = () => `skill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

const blankForm = (): SkillForm => ({
  id: newId(),
  name: '',
  order: '1',
  tags: '',
  description: '',
  icon_url: '',
  levels: Array(10).fill(''),
  hasRange: false,
  range: { ...DEFAULT_RANGE, cells: [...DEFAULT_RANGE.cells] },
})

const GRID_PRESETS = [
  { label: '1×1', rows: 1, cols: 1 },
  { label: '3×3', rows: 3, cols: 3 },
  { label: '3×4', rows: 3, cols: 4 },
  { label: '3×5', rows: 3, cols: 5 },
  { label: '5×5', rows: 5, cols: 5 },
]

// ── range grid editor ────────────────────────────────────────────────────────

function RangeGridEditor({ range, onChange }: {
  range: SkillRange
  onChange: (r: SkillRange) => void
}) {
  const toggle = (idx: number) => {
    const cells = [...range.cells]
    cells[idx] = (cells[idx] + 1) % 3
    onChange({ ...range, cells })
  }

  const setPreset = (rows: number, cols: number) => {
    onChange({ rows, cols, cells: Array(rows * cols).fill(0) })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {GRID_PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => setPreset(p.rows, p.cols)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              range.rows === p.rows && range.cols === p.cols
                ? 'bg-ptn-cyan/20 text-ptn-cyan border-ptn-cyan/40'
                : 'border-ptn-border text-ptn-muted hover:text-ptn-text'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="inline-grid gap-[3px] p-2 bg-black/50 rounded border border-ptn-border"
        style={{ gridTemplateColumns: `repeat(${range.cols}, 2rem)` }}
      >
        {range.cells.map((cell, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            title={cell === 0 ? 'ว่าง → คลิกเพื่อเปิด' : cell === 1 ? 'ช่วงโจมตี → คลิกเพื่อตั้งเป็นตำแหน่งตัวละคร' : 'ตำแหน่งตัวละคร → คลิกเพื่อล้าง'}
            className={`w-8 h-8 border rounded-sm flex items-center justify-center transition-colors ${
              cell === 2
                ? 'bg-red-700 border-red-500'
                : cell === 1
                  ? 'bg-zinc-600 border-zinc-400'
                  : 'bg-zinc-900/60 border-zinc-700/70'
            }`}
          >
            {cell === 2 && <div className="w-3 h-3 rounded-full bg-red-300" />}
          </button>
        ))}
      </div>
      <p className="text-xs text-ptn-muted">
        คลิกเพื่อสลับ: ว่าง → ช่วง (เทา) → ตัวละคร (แดง) → ว่าง
      </p>
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────

export function AdminSkillsPage() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [characters, setCharacters] = useState<Character[]>([])
  const [loadingChars, setLoadingChars] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedChar, setSelectedChar] = useState<Character | null>(null)
  const [skills, setSkills] = useState<CharacterSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SkillForm>(blankForm())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exclusiveForm, setExclusiveForm] = useState<ExclusiveForm>(blankExclusive())
  const [savingExclusive, setSavingExclusive] = useState(false)

  useEffect(() => { fetchChars() }, [])

  const fetchChars = async () => {
    const { data } = await supabase
      .from('characters')
      .select('id, name, slug, rarity, faction, job_class, portrait_url, skills, exclusive_crimebrand')
      .order('rarity').order('name')
    setCharacters(data || [])
    setLoadingChars(false)
  }

  const selectCharacter = (char: Character) => {
    setSelectedChar(char)
    setSkills(Array.isArray(char.skills) ? (char.skills as CharacterSkill[]) : [])
    const ec = char.exclusive_crimebrand as ExclusiveForm | null
    setExclusiveForm(ec ? {
      name: ec.name || '',
      image_url: ec.image_url || '',
      description: ec.description || '',
      flavor_text: ec.flavor_text || '',
      hasRange: !!ec.hasRange,
      range: ec.range ? { ...ec.range, cells: [...ec.range.cells] } : { ...DEFAULT_RANGE, cells: [...DEFAULT_RANGE.cells] },
    } : blankExclusive())
  }

  const persistSkills = async (updated: CharacterSkill[]) => {
    if (!selectedChar) return false
    setSaving(true)
    const { error } = await supabase
      .from('characters')
      .update({ skills: updated, updated_at: new Date().toISOString() } as never)
      .eq('id', selectedChar.id)
    setSaving(false)
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message, 'error'); return false }
    setSkills(updated)
    setCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, skills: updated } : c))
    setSelectedChar(prev => prev ? { ...prev, skills: updated } : prev)
    await supabase.from('admin_logs').insert({
      admin_id: profile!.id,
      action: `แก้ไขสกิล: ${selectedChar.name}`,
      target_table: 'characters',
      target_id: selectedChar.id,
    } as never)
    return true
  }

  const persistExclusive = async () => {
    if (!selectedChar) return
    setSavingExclusive(true)
    const payload = {
      name: exclusiveForm.name.trim(),
      image_url: exclusiveForm.image_url.trim(),
      description: exclusiveForm.description.trim(),
      flavor_text: exclusiveForm.flavor_text.trim(),
      hasRange: exclusiveForm.hasRange,
      range: exclusiveForm.hasRange ? exclusiveForm.range : null,
    }
    const { error } = await supabase
      .from('characters')
      .update({ exclusive_crimebrand: payload, updated_at: new Date().toISOString() } as never)
      .eq('id', selectedChar.id)
    setSavingExclusive(false)
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message, 'error'); return }
    toast('บันทึก Exclusive Crimebrand สำเร็จ', 'success')
    setCharacters(prev => prev.map(c => c.id === selectedChar.id ? { ...c, exclusive_crimebrand: payload } : c))
    setSelectedChar(prev => prev ? { ...prev, exclusive_crimebrand: payload } : prev)
    await supabase.from('admin_logs').insert({
      admin_id: profile!.id,
      action: `แก้ไข Exclusive Crimebrand: ${selectedChar.name}`,
      target_table: 'characters',
      target_id: selectedChar.id,
    } as never)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(blankForm())
    setModalOpen(true)
  }

  const openEdit = (skill: CharacterSkill) => {
    setEditingId(skill.id || null)
    setForm({
      id: skill.id || newId(),
      name: skill.name || '',
      order: String(skill.order ?? 1),
      tags: (skill.tags || []).join(', '),
      description: skill.description || '',
      icon_url: skill.icon_url || '',
      levels: Array(10).fill('').map((_, i) => skill.levels?.[i] ?? ''),
      hasRange: !!skill.range,
      range: skill.range ? { ...skill.range, cells: [...skill.range.cells] } : { ...DEFAULT_RANGE, cells: [...DEFAULT_RANGE.cells] },
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('กรุณากรอกชื่อสกิล', 'error'); return }
    const payload: CharacterSkill = {
      id: form.id,
      name: form.name.trim(),
      order: parseInt(form.order) || 1,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      description: form.description.trim(),
      icon_url: form.icon_url.trim() || undefined,
      levels: form.levels.map(l => l.trim()),
      range: form.hasRange ? form.range : undefined,
    }
    let updated: CharacterSkill[]
    if (editingId) {
      updated = skills.map(s => s.id === editingId ? payload : s)
    } else {
      updated = [...skills, payload]
    }
    const ok = await persistSkills(updated)
    if (ok) { toast('บันทึกสำเร็จ', 'success'); setModalOpen(false) }
  }

  const handleDelete = async (skill: CharacterSkill) => {
    if (!confirm(`ลบสกิล "${skill.name}"?`)) return
    setDeleting(skill.id || '')
    const updated = skills.filter(s => s.id !== skill.id)
    const ok = await persistSkills(updated)
    if (ok) toast('ลบสำเร็จ', 'success')
    setDeleting(null)
  }

  const setLevel = (i: number, val: string) => {
    setForm(prev => {
      const levels = [...prev.levels]
      levels[i] = val
      return { ...prev, levels }
    })
  }

  const filteredChars = characters.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loadingChars) return <PageLoader />

  const ordinal = (n: number) => ['1st','2nd','3rd','4th','5th'][n - 1] ?? `${n}th`

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Character selector ─────────────────────────────────────────── */}
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
              {Array.isArray(c.skills) && c.skills.length > 0 && (
                <span className="ml-auto text-xs text-ptn-cyan shrink-0 font-mono">{c.skills.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Skills editor ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {!selectedChar ? (
          <div className="flex flex-col items-center justify-center h-64 text-ptn-muted">
            <Zap size={32} className="mb-3 opacity-30" />
            <p>เลือกตัวละครเพื่อจัดการสกิล</p>
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
                  <p className="text-sm text-ptn-muted">
                    {selectedChar.rarity}-Rank · {JOB_CLASS_LABEL[selectedChar.job_class] || selectedChar.job_class} · {ALIGNMENT_LABEL[selectedChar.faction] || selectedChar.faction}
                  </p>
                </div>
              </div>
              <Button onClick={openCreate} size="sm" disabled={saving}>
                <Plus size={14} /> เพิ่มสกิล
              </Button>
            </div>

            {/* Skills table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ptn-border bg-ptn-elevated">
                      <th className="text-left p-3 text-ptn-muted font-medium">สกิล</th>
                      <th className="text-left p-3 text-ptn-muted font-medium">ลำดับ</th>
                      <th className="text-left p-3 text-ptn-muted font-medium hidden md:table-cell">Tags</th>
                      <th className="text-left p-3 text-ptn-muted font-medium hidden lg:table-cell">Levels</th>
                      <th className="text-right p-3 text-ptn-muted font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map(skill => (
                      <tr key={skill.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {skill.icon_url && (
                              <img src={skill.icon_url} alt={skill.name} className="w-9 h-9 rounded object-cover border border-ptn-border shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-ptn-text">{skill.name}</div>
                              {skill.description && (
                                <div className="text-xs text-ptn-muted line-clamp-1 max-w-xs">{skill.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-ptn-muted text-xs font-mono">{skill.order ? ordinal(skill.order) : '—'}</td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(skill.tags || []).slice(0, 3).map(t => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-ptn-elevated border border-ptn-border text-ptn-muted">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-ptn-muted text-xs">
                          {skill.levels?.filter(Boolean).length || 0} / 10
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(skill)}><Edit2 size={13} /></Button>
                            <Button size="sm" variant="danger" loading={deleting === skill.id} onClick={() => handleDelete(skill)}><Trash2 size={13} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {skills.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-ptn-muted">
                          ยังไม่มีสกิล — กด <span className="text-ptn-cyan">เพิ่มสกิล</span> เพื่อเริ่มต้น
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            {/* ── Exclusive Crimebrand section ─────────────────────── */}
            <Card className="overflow-hidden mt-4">
              <div className="px-4 py-3 border-b border-ptn-border bg-amber-900/10">
                <h3 className="font-heading text-sm font-bold text-amber-400/80 uppercase tracking-widest">Exclusive Crimebrand</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="ชื่อ Exclusive Crimebrand"
                    value={exclusiveForm.name}
                    onChange={e => setExclusiveForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="เช่น Regicide"
                  />
                  <div className="sm:col-span-2">
                    <ImageUpload
                      bucket="characters"
                      label="รูป Exclusive Crimebrand"
                      currentUrl={exclusiveForm.image_url || null}
                      aspectRatio="square"
                      onUpload={url => setExclusiveForm(p => ({ ...p, image_url: url }))}
                    />
                  </div>
                </div>
                <Textarea
                  label="คำอธิบาย"
                  value={exclusiveForm.description}
                  onChange={e => setExclusiveForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="อธิบายผลของ Exclusive Crimebrand..."
                />
                <Textarea
                  label="Flavor Text (แสดงเป็นตัวเอียง)"
                  value={exclusiveForm.flavor_text}
                  onChange={e => setExclusiveForm(p => ({ ...p, flavor_text: e.target.value }))}
                  rows={2}
                  placeholder="ข้อความบรรยายบรรยากาศ..."
                />
                <div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={exclusiveForm.hasRange}
                      onChange={e => setExclusiveForm(p => ({ ...p, hasRange: e.target.checked }))}
                      className="accent-ptn-cyan"
                    />
                    <span className="text-sm font-medium text-ptn-text">มี Range Grid</span>
                  </label>
                  {exclusiveForm.hasRange && (
                    <RangeGridEditor
                      range={exclusiveForm.range}
                      onChange={range => setExclusiveForm(p => ({ ...p, range }))}
                    />
                  )}
                </div>
                <Button onClick={persistExclusive} loading={savingExclusive} size="sm">
                  บันทึก Exclusive Crimebrand
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `แก้ไขสกิล: ${form.name}` : 'เพิ่มสกิลใหม่'}
        size="xl"
      >
        <div className="space-y-5 overflow-y-auto max-h-[70vh] pr-1">

          {/* Basic info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="ชื่อสกิล"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="เช่น Dynamic Defense Matrix"
            />
            <Select
              label="ลำดับสกิล (Slot)"
              value={form.order}
              onChange={e => setForm(p => ({ ...p, order: e.target.value }))}
            >
              {[1,2,3,4].map(n => <option key={n} value={String(n)}>{ordinal(n)} slot</option>)}
            </Select>
            <div className="sm:col-span-2">
              <Input
                label={`Tags (คั่นด้วย , )`}
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="เช่น Normal ATK   หรือ   Ultimate, 18 Energy, 1 Core Damage"
              />
              <p className="text-xs text-ptn-muted mt-1">ตัวอย่าง: <code>Normal ATK</code> / <code>Ultimate, 18 Energy, 1 Core Damage</code> / <code>Passive</code></p>
            </div>
          </div>

          {/* Icon */}
          <ImageUpload
            bucket="characters"
            label="ไอคอนสกิล"
            currentUrl={form.icon_url || null}
            aspectRatio="square"
            onUpload={url => setForm(p => ({ ...p, icon_url: url }))}
          />

          {/* Description */}
          <Textarea
            label="คำอธิบายสกิล (Base Description)"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="อธิบายการทำงานของสกิล..."
            rows={4}
          />

          {/* Level descriptions */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-2">ข้อมูลแต่ละเลเวล (LV 1 – 10)</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-ptn-disabled font-mono w-10 shrink-0">LV {i + 1}</span>
                  <input
                    type="text"
                    value={form.levels[i]}
                    onChange={e => setLevel(i, e.target.value)}
                    placeholder={`ผลของ LV ${i + 1}...`}
                    className="flex-1 px-2 py-1.5 text-xs bg-ptn-elevated border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Range grid */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.hasRange}
                onChange={e => setForm(p => ({ ...p, hasRange: e.target.checked }))}
                className="accent-ptn-cyan"
              />
              <span className="text-sm font-medium text-ptn-text">มี Range Grid</span>
            </label>
            {form.hasRange && (
              <RangeGridEditor
                range={form.range}
                onChange={range => setForm(p => ({ ...p, range }))}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>
              <Plus size={14} /> {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสกิล'}
            </Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
