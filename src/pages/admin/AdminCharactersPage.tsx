// @ts-nocheck
import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Search, Download, Trash2, ImageIcon, X } from 'lucide-react'
import { SEED_CHARACTERS } from '../../lib/seedData'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { slugify } from '../../lib/utils'
import { JOB_CLASS_LABEL, ALIGNMENT_LABEL } from '../../lib/constants'
import { useAbilityTags } from '../../hooks/useAbilityTags'

type OverviewCard = { title: string; content: string }
type MaterialEntry = { name: string; image_url: string; amount: string }
type MaterialSection = { label: string; items: MaterialEntry[] }
type MaterialsData = { rank_up: MaterialSection[]; skills: MaterialSection[] }
type CharDetails = { birthday: string; height: string; birthplace: string; ability: string; case_name: string }
type StatPair = { min: string; max: string }
type CharStats = { health: StatPair; attack: StatPair; defense: StatPair; magic_resistance: StatPair; attack_speed: StatPair; block: StatPair }

type CharForm = {
  name: string; rarity: 'S' | 'A' | 'B' | 'C'; faction: string; job_class: string
  portrait_url: string; portrait_pos_x: number; portrait_pos_y: number; portrait_zoom: number; is_limited: boolean; is_unreleased: boolean; release_date: string; release_order: string
  tags: string; ability_tags: string[]; trivia: string[]
  char_details: CharDetails
  char_stats: CharStats
  overview_cards: OverviewCard[]
  materials: MaterialsData
}

const blankPair = (): StatPair => ({ min: '', max: '' })
const blankStats = (): CharStats => ({
  health: blankPair(), attack: blankPair(), defense: blankPair(),
  magic_resistance: blankPair(), attack_speed: blankPair(), block: blankPair(),
})

const blankDetails = (): CharDetails => ({ birthday: '', height: '', birthplace: '', ability: '', case_name: '' })
const normalizeMaterials = (raw: unknown): MaterialsData => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return blankMaterials()
  const m = raw as Record<string, unknown>
  const toSections = (arr: unknown[], fallbackLabels: string[]): MaterialSection[] => {
    if (!Array.isArray(arr) || arr.length === 0) return fallbackLabels.map(l => ({ label: l, items: [] }))
    // new format: each element has 'label' + 'items'
    if (typeof arr[0] === 'object' && arr[0] !== null && 'label' in arr[0]) return arr as MaterialSection[]
    // old format: flat [{name, image_url}] → wrap in one section
    return [{ label: fallbackLabels[0] || 'Group', items: (arr as Record<string, string>[]).map(x => ({ name: x.name || '', image_url: x.image_url || '', amount: '' })) }]
  }
  return {
    rank_up: toSections(m.rank_up as unknown[] || [], ['Ascension 1', 'Ascension 2', 'Ascension 3']),
    skills:  toSections(m.skills  as unknown[] || [], ['Skill Modules', 'Skill Material', 'Other']),
  }
}

const blankMaterials = (): MaterialsData => ({
  rank_up: [
    { label: 'Ascension 1', items: [] },
    { label: 'Ascension 2', items: [] },
    { label: 'Ascension 3', items: [] },
  ],
  skills: [
    { label: 'Skill Modules', items: [] },
    { label: 'Skill Material', items: [] },
    { label: 'Other', items: [] },
  ],
})

const defaultForm: CharForm = {
  name: '', rarity: 'A', faction: 'anger', job_class: 'breaker',
  portrait_url: '', portrait_pos_x: 50, portrait_pos_y: 20, portrait_zoom: 1, is_limited: false, is_unreleased: false, release_date: '', release_order: '0', tags: '',
  ability_tags: [], trivia: [],
  char_details: blankDetails(),
  char_stats: blankStats(),
  overview_cards: [],
  materials: blankMaterials(),
}

// ── mini image slot for crimebrand sets ──────────────────────────────────────
function SlotImage({ url, bucket, onUpload }: { url: string; bucket: string; onUpload: (u: string) => void }) {
  const { toast } = useToast()
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)', 'error'); return }
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type })
    if (error) { toast('อัปโหลดล้มเหลว', 'error'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
    onUpload(publicUrl)
    setUploading(false)
  }

  return (
    <div
      className="flex-1 aspect-square rounded border border-ptn-border bg-ptn-elevated cursor-pointer hover:border-ptn-cyan/50 transition-colors overflow-hidden relative group"
      onClick={() => !uploading && ref.current?.click()}
    >
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {url ? (
        <>
          <img src={url} className="w-full h-full object-cover" alt="" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onUpload('') }}
            className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} className="text-white" />
          </button>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <ImageIcon size={16} className="text-ptn-disabled" />
          {uploading && <span className="text-[9px] text-ptn-disabled">กำลังอัปโหลด...</span>}
        </div>
      )}
    </div>
  )
}

export function AdminCharactersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const { groups: abilityTagGroups } = useAbilityTags()
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingChar, setEditingChar] = useState<Character | null>(null)
  const [form, setForm] = useState<CharForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchChars()
  }, [])

  const fetchChars = async () => {
    const { data } = await supabase.from('characters').select('*').order('rarity').order('name')
    setCharacters(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditingChar(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (char: Character) => {
    setEditingChar(char)
    setForm({
      name: char.name,
      rarity: char.rarity,
      faction: char.faction,
      job_class: char.job_class,
      portrait_url: char.portrait_url || '',
      is_unreleased: char.is_unreleased ?? false,
      portrait_pos_x: char.portrait_pos ? parseInt(char.portrait_pos.split(' ')[0]) : 50,
      portrait_pos_y: char.portrait_pos ? parseInt(char.portrait_pos.split(' ')[1]) : 20,
      portrait_zoom: char.portrait_zoom ?? 1,
      is_limited: char.is_limited,
      release_date: char.release_date || '',
      release_order: char.release_order?.toString() || '0',
      tags: (char.tags as string[] || []).join(', '),
      ability_tags: (char.ability_tags as string[] | null) || [],
      trivia: ((char.trivia as string[]) || []),
      char_details: (char.char_details as CharDetails | null) || blankDetails(),
      char_stats: (() => {
        const s = char.stats as CharStats | null
        if (!s || typeof s !== 'object') return blankStats()
        const p = (k: keyof CharStats): StatPair => ({ min: String(s[k]?.min ?? ''), max: String(s[k]?.max ?? '') })
        return { health: p('health'), attack: p('attack'), defense: p('defense'), magic_resistance: p('magic_resistance'), attack_speed: p('attack_speed'), block: p('block') }
      })(),
      overview_cards: ((char.overview_cards as OverviewCard[]) || []),
      materials: normalizeMaterials(char.materials),
    })
    setModalOpen(true)
  }

  const toggleAbilityTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      ability_tags: prev.ability_tags.includes(tag)
        ? prev.ability_tags.filter(t => t !== tag)
        : [...prev.ability_tags, tag],
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('กรุณากรอกชื่อตัวละคร', 'error'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name),
      rarity: form.rarity,
      faction: form.faction,
      job_class: form.job_class,
      portrait_url: form.portrait_url.trim() || null,
      portrait_pos: `${form.portrait_pos_x}% ${form.portrait_pos_y}%`,
      portrait_zoom: form.portrait_zoom,
      is_limited: form.is_limited,
      is_unreleased: form.is_unreleased,
      release_date: form.release_date || null,
      release_order: parseInt(form.release_order) || 0,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      ability_tags: form.ability_tags,
      trivia: form.trivia.filter(t => t.trim()),
      char_details: form.char_details,
      stats: form.char_stats,
      overview_cards: form.overview_cards.filter(c => c.title.trim() || c.content.trim()),
      materials: form.materials,
      updated_at: new Date().toISOString(),
    }

    let error
    if (editingChar) {
      const res = await supabase.from('characters').update(payload as never).eq('id', editingChar.id)
      error = res.error
      if (!error) {
        setCharacters(prev => prev.map(c => c.id === editingChar.id ? { ...c, ...payload } : c))
        await supabase.from('admin_logs').insert({ admin_id: profile!.id, action: `แก้ไขตัวละคร: ${form.name}`, target_table: 'characters', target_id: editingChar.id } as never)
      }
    } else {
      const res = await supabase.from('characters').insert(payload as never).select().single()
      error = res.error
      if (!error && res.data) {
        setCharacters(prev => [...prev, res.data as unknown as Character])
        await supabase.from('admin_logs').insert({ admin_id: profile!.id, action: `เพิ่มตัวละคร: ${form.name}`, target_table: 'characters', target_id: (res.data as unknown as Character).id } as never)
      }
    }

    setSaving(false)
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message, 'error') }
    else { toast('บันทึกสำเร็จ', 'success'); setModalOpen(false) }
  }

  const handleDelete = async (char: Character) => {
    if (!confirm(`ยืนยันการลบ ${char.name}?`)) return
    setDeleting(char.id)
    const { error } = await supabase.from('characters').delete().eq('id', char.id)
    if (!error) {
      setCharacters(prev => prev.filter(c => c.id !== char.id))
      toast('ลบสำเร็จ', 'success')
      await supabase.from('admin_logs').insert({ admin_id: profile!.id, action: `ลบตัวละคร: ${char.name}`, target_table: 'characters', target_id: char.id } as never)
    } else {
      toast('เกิดข้อผิดพลาด', 'error')
    }
    setDeleting(null)
  }

  const handleSeedData = async () => {
    if (!confirm(`นำเข้าตัวละครทั้งหมด ${SEED_CHARACTERS.length} ตัวลงฐานข้อมูล?\n(จะไม่ทับข้อมูลที่มีอยู่แล้ว)`)) return
    setSaving(true)
    const { data: existing } = await supabase.from('characters').select('slug')
    const existingSlugs = new Set((existing || []).map((c: any) => c.slug))
    const toInsert = SEED_CHARACTERS.filter(c => !existingSlugs.has(c.slug))
    if (toInsert.length === 0) { toast('ไม่มีข้อมูลใหม่ที่ต้องนำเข้า', 'info'); setSaving(false); return }
    const { error } = await supabase.from('characters').insert(toInsert as never)
    setSaving(false)
    if (error) toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    else { toast(`นำเข้าสำเร็จ ${toInsert.length} ตัว`, 'success'); fetchChars() }
  }

  const set = (field: keyof CharForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  }

  const filtered = characters.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการตัวละคร</h1>
        <div className="flex gap-2">
          {characters.length === 0 && (
            <Button onClick={handleSeedData} loading={saving} variant="ghost" size="sm">
              <Download size={14} /> นำเข้าข้อมูลเริ่มต้น ({SEED_CHARACTERS.length} ตัว)
            </Button>
          )}
          <Button onClick={openCreate} size="sm">
            <Plus size={14} /> เพิ่มตัวละคร
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input placeholder="ค้นหาตัวละคร..." value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} className="max-w-sm" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ptn-border bg-ptn-elevated">
                <th className="text-left p-3 text-ptn-muted font-medium">ชื่อ</th>
                <th className="text-left p-3 text-ptn-muted font-medium">Rank</th>
                <th className="text-left p-3 text-ptn-muted font-medium hidden sm:table-cell">Tendencies</th>
                <th className="text-left p-3 text-ptn-muted font-medium hidden md:table-cell">Alignments</th>
                <th className="text-right p-3 text-ptn-muted font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {c.portrait_url && <img src={c.portrait_url} alt={c.name} className="w-8 h-8 rounded object-cover border border-ptn-border" />}
                      <span className="font-medium text-ptn-text">{c.name}</span>
                      {c.is_limited && <span className="text-ptn-gold text-xs">★Limited</span>}
                    </div>
                  </td>
                  <td className="p-3"><Badge variant="rarity" value={c.rarity} /></td>
                  <td className="p-3 text-ptn-muted hidden sm:table-cell">{JOB_CLASS_LABEL[c.job_class] || c.job_class}</td>
                  <td className="p-3 text-ptn-muted hidden md:table-cell">{ALIGNMENT_LABEL[c.faction] || c.faction.toUpperCase()}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Edit2 size={13} /></Button>
                      <Button size="sm" variant="danger" loading={deleting === c.id} onClick={() => handleDelete(c)}><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-ptn-muted">ไม่พบตัวละคร</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingChar ? `แก้ไข: ${editingChar.name}` : 'เพิ่มตัวละครใหม่'} size="xl">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="ชื่อตัวละคร" value={form.name} onChange={set('name')} placeholder="ชื่อภาษาอังกฤษ" />
            <Select label="Rank" value={form.rarity} onChange={set('rarity')}>
              {['S','A','B','C'].map(r => <option key={r} value={r}>{r}-Rank</option>)}
            </Select>
            <Select label="Tendencies" value={form.job_class} onChange={set('job_class')}>
              {Object.entries(JOB_CLASS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select label="Alignments" value={form.faction} onChange={set('faction')}>
              {Object.entries(ALIGNMENT_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <ImageUpload
              bucket="characters"
              label="รูปภาพ (Portrait)"
              currentUrl={form.portrait_url || null}
              aspectRatio="portrait"
              onUpload={url => setForm(prev => ({ ...prev, portrait_url: url }))}
            />
            <Input label="วันที่ออก" type="date" value={form.release_date} onChange={set('release_date')} />
            <Input label="Release Order (ตัวใหม่ = เลขมาก)" type="number" value={form.release_order} onChange={set('release_order')} />
            <Input label="แท็ก (คั่นด้วยเครื่องหมาย ,)" value={form.tags} onChange={set('tags')} placeholder="ดาเมจ, แนวหน้า" />
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_limited} onChange={e => setForm(prev => ({...prev, is_limited: e.target.checked}))} className="accent-ptn-gold" />
                <span className="text-sm text-ptn-text">Limited</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_unreleased} onChange={e => setForm(prev => ({...prev, is_unreleased: e.target.checked}))} className="accent-ptn-muted" />
                <span className="text-sm text-ptn-muted">ยังไม่ออก</span>
              </label>
            </div>
          </div>
          {/* Portrait position sliders */}
          <div className="rounded-lg border border-ptn-border bg-ptn-elevated/40 p-4 space-y-3">
            <p className="text-sm font-medium text-ptn-text">ตำแหน่งภาพในการ์ด (Portrait Position)</p>
            <div className="flex gap-4">
              {/* Preview */}
              <div className="relative w-28 h-36 rounded-lg overflow-hidden border border-ptn-border bg-ptn-elevated shrink-0">
                {form.portrait_url ? (
                  <img
                    src={form.portrait_url}
                    alt="preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      objectPosition: `${form.portrait_pos_x}% ${form.portrait_pos_y}%`,
                      transform: `scale(${form.portrait_zoom})`,
                      transformOrigin: `${form.portrait_pos_x}% ${form.portrait_pos_y}%`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-ptn-disabled text-center px-2">ยังไม่มีรูป</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              {/* Sliders */}
              <div className="flex-1 space-y-4 pt-1">
                <div>
                  <label className="text-xs text-ptn-muted block mb-1">ซ้าย ↔ ขวา ({form.portrait_pos_x}%)</label>
                  <input type="range" min={0} max={100} value={form.portrait_pos_x}
                    onChange={e => setForm(p => ({ ...p, portrait_pos_x: Number(e.target.value) }))}
                    className="w-full accent-ptn-cyan" />
                </div>
                <div>
                  <label className="text-xs text-ptn-muted block mb-1">บน ↕ ล่าง ({form.portrait_pos_y}%)</label>
                  <input type="range" min={0} max={100} value={form.portrait_pos_y}
                    onChange={e => setForm(p => ({ ...p, portrait_pos_y: Number(e.target.value) }))}
                    className="w-full accent-ptn-cyan" />
                </div>
                <div>
                  <label className="text-xs text-ptn-muted block mb-1">ซูม ({form.portrait_zoom}x)</label>
                  <input type="range" min={1} max={3} step={0.1} value={form.portrait_zoom}
                    onChange={e => setForm(p => ({ ...p, portrait_zoom: Number(e.target.value) }))}
                    className="w-full accent-ptn-gold" />
                </div>
              </div>
            </div>
          </div>
          {/* ── Character Bio Details ── */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">ข้อมูลตัวละคร (INFO)</p>
            <p className="text-xs text-ptn-muted mb-3">แสดงในส่วน INFO ของแท็บข้อมูล</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="วันเกิด (Birthday)"
                value={form.char_details.birthday}
                onChange={e => setForm(p => ({ ...p, char_details: { ...p.char_details, birthday: e.target.value } }))}
                placeholder="เช่น July 14"
              />
              <Input
                label="ส่วนสูง (Height)"
                value={form.char_details.height}
                onChange={e => setForm(p => ({ ...p, char_details: { ...p.char_details, height: e.target.value } }))}
                placeholder="เช่น 175cm (5'9 นิ้ว)"
              />
              <Input
                label="บ้านเกิด (Birthplace)"
                value={form.char_details.birthplace}
                onChange={e => setForm(p => ({ ...p, char_details: { ...p.char_details, birthplace: e.target.value } }))}
                placeholder="เช่น The Metropoles"
              />
              <Input
                label="ความสามารถ (Ability)"
                value={form.char_details.ability}
                onChange={e => setForm(p => ({ ...p, char_details: { ...p.char_details, ability: e.target.value } }))}
                placeholder="เช่น Magnetic Storm"
              />
              <div className="sm:col-span-2">
                <Input
                  label="คดี (Case)"
                  value={form.char_details.case_name}
                  onChange={e => setForm(p => ({ ...p, char_details: { ...p.char_details, case_name: e.target.value } }))}
                  placeholder="เช่น DisCorp Serial Incidents"
                />
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">สถิติ (STATS LV1 → 90)</p>
            <p className="text-xs text-ptn-muted mb-3">ค่า Min (LV1) และ Max (LV90) ของแต่ละสถิติ</p>
            <div className="space-y-2">
              {([
                { key: 'health',           label: 'Health' },
                { key: 'attack',           label: 'Attack' },
                { key: 'defense',          label: 'Defense' },
                { key: 'magic_resistance', label: 'Magic Resistance' },
                { key: 'attack_speed',     label: 'Attack Speed' },
                { key: 'block',            label: 'Block' },
              ] as { key: keyof CharStats; label: string }[]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-ptn-disabled w-32 shrink-0">{label}</span>
                  <input
                    type="text"
                    value={form.char_stats[key].min}
                    onChange={e => setForm(p => ({ ...p, char_stats: { ...p.char_stats, [key]: { ...p.char_stats[key], min: e.target.value } } }))}
                    placeholder="LV1"
                    className="w-24 px-2 py-1.5 text-xs bg-ptn-elevated border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan text-center"
                  />
                  <span className="text-ptn-disabled text-xs">→</span>
                  <input
                    type="text"
                    value={form.char_stats[key].max}
                    onChange={e => setForm(p => ({ ...p, char_stats: { ...p.char_stats, [key]: { ...p.char_stats[key], max: e.target.value } } }))}
                    placeholder="LV90"
                    className="w-24 px-2 py-1.5 text-xs bg-ptn-elevated border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Materials ── */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">วัสดุ (Materials)</p>
            <p className="text-xs text-ptn-muted mb-4">แต่ละ Group มี items (รูป + จำนวน + ชื่อ) — เพิ่ม/ลบ Group และ Item ได้</p>
            {(['rank_up', 'skills'] as const).map(groupKey => (
              <div key={groupKey} className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-ptn-disabled">
                    {groupKey === 'rank_up' ? 'RANK-UP MATERIALS' : 'SKILL MATERIALS'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm(p => {
                      const mats = { ...p.materials }
                      const next = mats[groupKey].length + 1
                      const label = groupKey === 'rank_up' ? `Ascension ${next}` : `Group ${next}`
                      mats[groupKey] = [...mats[groupKey], { label, items: [] }]
                      return { ...p, materials: mats }
                    })}
                    className="flex items-center gap-1 text-xs text-ptn-cyan hover:text-ptn-text border border-ptn-cyan/30 px-2 py-1 rounded hover:bg-ptn-cyan/5 transition-colors"
                  >
                    <Plus size={11} /> เพิ่ม Group
                  </button>
                </div>

                <div className="space-y-3">
                  {form.materials[groupKey].map((section, si) => (
                    <div key={si} className="p-3 border border-ptn-border rounded-lg bg-ptn-elevated">
                      {/* Section label */}
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="text"
                          value={section.label}
                          onChange={e => setForm(p => {
                            const mats = { ...p.materials }
                            mats[groupKey] = [...mats[groupKey]]
                            mats[groupKey][si] = { ...mats[groupKey][si], label: e.target.value }
                            return { ...p, materials: mats }
                          })}
                          className="flex-1 text-xs font-semibold uppercase tracking-wider bg-transparent border-b border-ptn-border/60 text-ptn-disabled focus:outline-none focus:border-ptn-cyan pb-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(p => {
                            const mats = { ...p.materials }
                            mats[groupKey] = mats[groupKey].filter((_, j) => j !== si)
                            return { ...p, materials: mats }
                          })}
                          className="text-ptn-disabled hover:text-ptn-red shrink-0 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Items */}
                      <div className="flex flex-wrap gap-2 items-start">
                        {section.items.map((item, ii) => (
                          <div key={ii} className="flex flex-col items-center gap-1" style={{ width: '72px' }}>
                            <SlotImage
                              bucket="characters"
                              url={item.image_url}
                              onUpload={url => setForm(p => {
                                const mats = { ...p.materials }
                                mats[groupKey] = [...mats[groupKey]]
                                const items = [...mats[groupKey][si].items]
                                items[ii] = { ...items[ii], image_url: url }
                                mats[groupKey][si] = { ...mats[groupKey][si], items }
                                return { ...p, materials: mats }
                              })}
                            />
                            <input
                              type="text"
                              value={item.amount}
                              onChange={e => setForm(p => {
                                const mats = { ...p.materials }
                                mats[groupKey] = [...mats[groupKey]]
                                const items = [...mats[groupKey][si].items]
                                items[ii] = { ...items[ii], amount: e.target.value }
                                mats[groupKey][si] = { ...mats[groupKey][si], items }
                                return { ...p, materials: mats }
                              })}
                              placeholder="จำนวน"
                              className="w-full text-center text-[11px] px-1 py-0.5 bg-ptn-surface border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan"
                            />
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => setForm(p => {
                                const mats = { ...p.materials }
                                mats[groupKey] = [...mats[groupKey]]
                                const items = [...mats[groupKey][si].items]
                                items[ii] = { ...items[ii], name: e.target.value }
                                mats[groupKey][si] = { ...mats[groupKey][si], items }
                                return { ...p, materials: mats }
                              })}
                              placeholder="ชื่อ"
                              className="w-full text-center text-[11px] px-1 py-0.5 bg-ptn-surface border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan"
                            />
                            <button
                              type="button"
                              onClick={() => setForm(p => {
                                const mats = { ...p.materials }
                                mats[groupKey] = [...mats[groupKey]]
                                mats[groupKey][si] = { ...mats[groupKey][si], items: mats[groupKey][si].items.filter((_, j) => j !== ii) }
                                return { ...p, materials: mats }
                              })}
                              className="text-[10px] text-ptn-disabled hover:text-ptn-red transition-colors"
                            >
                              ลบ
                            </button>
                          </div>
                        ))}
                        {/* Add item */}
                        <button
                          type="button"
                          onClick={() => setForm(p => {
                            const mats = { ...p.materials }
                            mats[groupKey] = [...mats[groupKey]]
                            mats[groupKey][si] = {
                              ...mats[groupKey][si],
                              items: [...mats[groupKey][si].items, { name: '', image_url: '', amount: '' }],
                            }
                            return { ...p, materials: mats }
                          })}
                          className="w-[72px] aspect-square rounded border border-dashed border-ptn-border flex items-center justify-center text-ptn-disabled hover:text-ptn-cyan hover:border-ptn-cyan/40 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ability Tags */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">ความสามารถ (Ability Tags)</p>
            <p className="text-xs text-ptn-muted mb-3">คลิกเพื่อเลือก/ยกเลิก — แสดงในหน้าตัวละครและใช้กรองในหน้ารายชื่อ</p>
            <div className="space-y-3 p-3 bg-ptn-elevated rounded-lg border border-ptn-border">
              {abilityTagGroups.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: group.text }}>{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map(tag => {
                      const active = form.ability_tags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleAbilityTag(tag)}
                          style={{
                            background: active ? group.bg : 'transparent',
                            borderColor: active ? group.border : '#2a2a3a',
                            color: active ? group.text : '#555',
                          }}
                          className="text-xs px-2.5 py-1 rounded border transition-all hover:opacity-90"
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {form.ability_tags.length > 0 && (
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, ability_tags: [] }))}
                className="text-xs text-ptn-red hover:underline mt-2"
              >
                ล้างทั้งหมด ({form.ability_tags.length} tag)
              </button>
            )}
          </div>

          {/* Trivia / Lore */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">Trivia / Lore</p>
            <p className="text-xs text-ptn-muted mb-3">แสดงเป็นการ์ดเรียงกันในแท็บเรื่องราว</p>
            <div className="space-y-2">
              {form.trivia.map((entry, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-ptn-disabled font-mono text-xs w-6 pt-2.5 shrink-0 text-right">{i + 1}</span>
                  <textarea
                    value={entry}
                    onChange={e => setForm(prev => {
                      const trivia = [...prev.trivia]
                      trivia[i] = e.target.value
                      return { ...prev, trivia }
                    })}
                    rows={4}
                    placeholder={`Trivia #${i + 1}... (รองรับ Markdown เช่น **ตัวหนา**, - รายการ, # หัวข้อ)`}
                    className="flex-1 px-3 py-2 text-sm bg-ptn-elevated border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan resize-y"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, trivia: prev.trivia.filter((_, j) => j !== i) }))}
                    className="mt-1.5 text-ptn-disabled hover:text-ptn-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, trivia: [...prev.trivia, ''] }))}
              className="mt-3 flex items-center gap-1.5 text-xs text-ptn-cyan hover:text-ptn-text transition-colors border border-ptn-cyan/30 px-3 py-1.5 rounded hover:bg-ptn-cyan/5"
            >
              <Plus size={12} /> เพิ่ม Trivia
            </button>
          </div>

          {/* ── Overview Cards (Initial Attribute / Mania Intensify) ── */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-1">การ์ดคำอธิบาย (Overview Cards)</p>
            <p className="text-xs text-ptn-muted mb-3">แสดงเป็น 2 คอลัมน์ใต้ INFO เช่น "Initial Attribute", "Mania Intensify"</p>
            <div className="space-y-3">
              {form.overview_cards.map((card, i) => (
                <div key={i} className="p-3 border border-ptn-border rounded-lg bg-ptn-elevated space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={card.title}
                      onChange={e => setForm(p => {
                        const cards = [...p.overview_cards]
                        cards[i] = { ...cards[i], title: e.target.value }
                        return { ...p, overview_cards: cards }
                      })}
                      placeholder="ชื่อหัวข้อ เช่น Initial Attribute"
                      className="flex-1 px-3 py-1.5 text-sm bg-ptn-surface border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, overview_cards: p.overview_cards.filter((_, j) => j !== i) }))}
                      className="text-ptn-disabled hover:text-ptn-red transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    value={card.content}
                    onChange={e => setForm(p => {
                      const cards = [...p.overview_cards]
                      cards[i] = { ...cards[i], content: e.target.value }
                      return { ...p, overview_cards: cards }
                    })}
                    rows={5}
                    placeholder="เนื้อหาคำอธิบาย..."
                    className="w-full px-3 py-2 text-sm bg-ptn-surface border border-ptn-border rounded text-ptn-text placeholder-ptn-disabled focus:outline-none focus:border-ptn-cyan resize-y"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overview_cards: [...p.overview_cards, { title: '', content: '' }] }))}
              className="mt-3 flex items-center gap-1.5 text-xs text-ptn-cyan hover:text-ptn-text transition-colors border border-ptn-cyan/30 px-3 py-1.5 rounded hover:bg-ptn-cyan/5"
            >
              <Plus size={12} /> เพิ่มการ์ด
            </button>
          </div>

          <div className="p-3 rounded-lg border border-ptn-border bg-ptn-elevated/50 text-xs text-ptn-muted">
            Crimebrand Builds จัดการได้ที่หน้า <span className="text-ptn-cyan font-medium">จัดการ Crimebrand Builds</span> ในเมนูด้านซ้าย
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}><Plus size={14} /> {editingChar ? 'บันทึกการแก้ไข' : 'เพิ่มตัวละคร'}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
