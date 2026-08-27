import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Lock, Unlock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ForumCategory } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { slugify } from '../../lib/utils'

type CatForm = { name: string; description: string; icon: string; color: string; sort_order: string }
const defaultForm: CatForm = { name: '', description: '', icon: 'MessageSquare', color: '#60A5FA', sort_order: '0' }

export function AdminForumPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<ForumCategory | null>(null)
  const [form, setForm] = useState<CatForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchCats() }, [])

  const fetchCats = async () => {
    const { data } = await supabase.from('forum_categories').select('*').order('sort_order')
    setCategories(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditingCat(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (cat: ForumCategory) => {
    setEditingCat(cat)
    setForm({ name: cat.name, description: cat.description || '', icon: cat.icon || 'MessageSquare', color: cat.color || '#60A5FA', sort_order: String(cat.sort_order) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast('กรุณากรอกชื่อหมวดหมู่', 'error'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(), slug: slugify(form.name),
      description: form.description.trim() || null, icon: form.icon,
      color: form.color, sort_order: parseInt(form.sort_order) || 0,
    }
    let error
    if (editingCat) {
      const res = await supabase.from('forum_categories').update(payload as never).eq('id', editingCat.id)
      error = res.error
      if (!error) setCategories(prev => prev.map(c => c.id === editingCat.id ? { ...c, ...payload } : c))
    } else {
      const res = await supabase.from('forum_categories').insert(payload as never).select().single()
      error = res.error
      if (!error && res.data) setCategories(prev => [...prev, res.data as unknown as ForumCategory].sort((a, b) => a.sort_order - b.sort_order))
    }
    setSaving(false)
    if (error) toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    else { toast('บันทึกสำเร็จ', 'success'); setModalOpen(false) }
  }

  const handleDelete = async (cat: ForumCategory) => {
    if (!confirm(`ยืนยันการลบหมวดหมู่ "${cat.name}"?`)) return
    const { error } = await supabase.from('forum_categories').delete().eq('id', cat.id)
    if (!error) { setCategories(prev => prev.filter(c => c.id !== cat.id)); toast('ลบสำเร็จ', 'success') }
    else toast('เกิดข้อผิดพลาด', 'error')
  }

  const toggleLock = async (cat: ForumCategory) => {
    const { error } = await supabase.from('forum_categories').update({ is_locked: !cat.is_locked } as never).eq('id', cat.id)
    if (!error) setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_locked: !c.is_locked } : c))
  }

  const set = (field: keyof CatForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการฟอรัม</h1>
        <Button onClick={openCreate} size="sm"><Plus size={14} /> เพิ่มหมวดหมู่</Button>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <Card key={cat.id} className="p-4 flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border"
              style={{ background: `${cat.color}15`, borderColor: `${cat.color}30` }}
            >
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ptn-text">{cat.name}</span>
                {cat.is_locked && <Lock size={12} className="text-ptn-muted" />}
              </div>
              {cat.description && <p className="text-xs text-ptn-muted truncate">{cat.description}</p>}
              <p className="text-xs text-ptn-disabled">{cat.post_count} กระทู้ · ลำดับ {cat.sort_order}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => toggleLock(cat)} title={cat.is_locked ? 'ปลดล็อค' : 'ล็อค'}>
                {cat.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEdit(cat)}><Edit2 size={13} /></Button>
              <Button size="sm" variant="danger" onClick={() => handleDelete(cat)}><Trash2 size={13} /></Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCat ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}>
        <div className="space-y-4">
          <Input label="ชื่อหมวดหมู่" value={form.name} onChange={set('name')} placeholder="ชื่อหมวดหมู่..." />
          <Textarea label="คำอธิบาย" value={form.description} onChange={set('description')} placeholder="รายละเอียด..." rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="สีหมวดหมู่" type="color" value={form.color} onChange={set('color')} />
            <Input label="ลำดับ" type="number" value={form.sort_order} onChange={set('sort_order')} placeholder="0" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>{editingCat ? 'บันทึก' : 'เพิ่ม'}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
