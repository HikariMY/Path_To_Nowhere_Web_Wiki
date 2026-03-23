// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Edit2, Search, Download, Trash2 } from 'lucide-react'
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

type CharForm = {
  name: string; rarity: 'S' | 'A' | 'B' | 'C'; faction: string; job_class: string
  overview: string; portrait_url: string; is_limited: boolean; release_date: string; tags: string
}

const defaultForm: CharForm = {
  name: '', rarity: 'A', faction: 'anger', job_class: 'breaker',
  overview: '', portrait_url: '', is_limited: false, release_date: '', tags: '',
}

export function AdminCharactersPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
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
      overview: char.overview || '',
      portrait_url: char.portrait_url || '',
      is_limited: char.is_limited,
      release_date: char.release_date || '',
      tags: (char.tags as string[] || []).join(', '),
    })
    setModalOpen(true)
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
      overview: form.overview.trim() || null,
      portrait_url: form.portrait_url.trim() || null,
      is_limited: form.is_limited,
      release_date: form.release_date || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
            <Input label="แท็ก (คั่นด้วยเครื่องหมาย ,)" value={form.tags} onChange={set('tags')} placeholder="ดาเมจ, แนวหน้า" />
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_limited} onChange={e => setForm(prev => ({...prev, is_limited: e.target.checked}))} className="accent-ptn-gold" />
                <span className="text-sm text-ptn-text">Limited</span>
              </label>
            </div>
          </div>
          <Textarea label="เรื่องราว (ภาษาไทย)" value={form.overview} onChange={set('overview')} placeholder="เขียนเรื่องราวของตัวละคร..." rows={5} />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}><Plus size={14} /> {editingChar ? 'บันทึกการแก้ไข' : 'เพิ่มตัวละคร'}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
