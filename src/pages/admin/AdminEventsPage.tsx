// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { GameEvent } from '../../types'
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
import { formatDate } from '../../lib/utils'

type EventForm = {
  title: string; subtitle: string; description: string; event_type: GameEvent['event_type']
  banner_url: string; start_date: string; end_date: string; is_active: boolean
  image_position: string
}

const defaultForm: EventForm = {
  title: '', subtitle: '', description: '', event_type: 'story',
  banner_url: '', start_date: '', end_date: '', is_active: true,
  image_position: '50% 50%',
}

// 3×3 position picker
const POSITIONS = [
  ['0% 0%',   '50% 0%',   '100% 0%'  ],
  ['0% 50%',  '50% 50%',  '100% 50%' ],
  ['0% 100%', '50% 100%', '100% 100%'],
]
const POSITION_LABELS: Record<string, string> = {
  '0% 0%':'↖', '50% 0%':'↑', '100% 0%':'↗',
  '0% 50%':'←', '50% 50%':'●', '100% 50%':'→',
  '0% 100%':'↙', '50% 100%':'↓', '100% 100%':'↘',
}

function ImagePositionPicker({ position, onChange, previewUrl }: {
  position: string
  onChange: (pos: string) => void
  previewUrl?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ptn-muted mb-1.5">ตำแหน่งโฟกัสภาพ</label>
      <div className="flex gap-4 items-start">
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.flat().map(pos => (
            <button
              key={pos}
              type="button"
              title={pos}
              onClick={() => onChange(pos)}
              className={`w-9 h-9 rounded text-sm font-bold transition-all border ${
                position === pos
                  ? 'border-ptn-cyan bg-ptn-cyan/20 text-ptn-cyan'
                  : 'border-ptn-border text-ptn-muted hover:border-ptn-muted hover:text-ptn-text'
              }`}
            >
              {POSITION_LABELS[pos]}
            </button>
          ))}
        </div>
        {previewUrl && (
          <div className="flex-1 h-[108px] rounded overflow-hidden border border-ptn-border">
            <img
              src={previewUrl}
              alt="preview"
              className="w-full h-full object-cover transition-all"
              style={{ objectPosition: position }}
            />
          </div>
        )}
        {!previewUrl && (
          <div className="flex-1 h-[108px] rounded border border-dashed border-ptn-border flex items-center justify-center text-xs text-ptn-disabled">
            อัปโหลดรูปเพื่อดูตัวอย่าง
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminEventsPage() {
  const {} = useAuth()
  const { toast } = useToast()
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<GameEvent | null>(null)
  const [form, setForm] = useState<EventForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false })
    setEvents(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditingEvent(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (ev: GameEvent) => {
    setEditingEvent(ev)
    setForm({
      title: ev.title, subtitle: ev.subtitle || '', description: ev.description || '', event_type: ev.event_type,
      banner_url: ev.banner_url || '', start_date: ev.start_date.slice(0, 16),
      end_date: ev.end_date.slice(0, 16), is_active: ev.is_active,
      image_position: ev.image_position || '50% 50%',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_date || !form.end_date) {
      toast('กรุณากรอกข้อมูลให้ครบ', 'error'); return
    }
    setSaving(true)
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      event_type: form.event_type, banner_url: form.banner_url.trim() || null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(), is_active: form.is_active,
      image_position: form.image_position,
    }
    let error
    if (editingEvent) {
      const res = await supabase.from('events').update(payload as never).eq('id', editingEvent.id)
      error = res.error
      if (!error) setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...payload } : e))
    } else {
      const res = await supabase.from('events').insert(payload as never).select().single()
      error = res.error
      if (!error && res.data) setEvents(prev => [res.data as unknown as GameEvent, ...prev])
    }
    setSaving(false)
    if (error) toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    else { toast('บันทึกสำเร็จ', 'success'); setModalOpen(false) }
  }

  const handleDelete = async (ev: GameEvent) => {
    if (!confirm(`ยืนยันการลบอีเวนต์ "${ev.title}"?`)) return
    const { error } = await supabase.from('events').delete().eq('id', ev.id)
    if (!error) { setEvents(prev => prev.filter(e => e.id !== ev.id)); toast('ลบสำเร็จ', 'success') }
    else toast('เกิดข้อผิดพลาด', 'error')
  }

  const toggleActive = async (ev: GameEvent) => {
    const { error } = await supabase.from('events').update({ is_active: !ev.is_active } as never).eq('id', ev.id)
    if (!error) setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_active: !e.is_active } : e))
  }

  const setFeatured = async (ev: GameEvent) => {
    if (ev.is_featured) return
    // unset all, then set this one
    await supabase.from('events').update({ is_featured: false } as never).neq('id', ev.id)
    const { error } = await supabase.from('events').update({ is_featured: true } as never).eq('id', ev.id)
    if (!error) {
      setEvents(prev => prev.map(e => ({ ...e, is_featured: e.id === ev.id })))
      toast('ตั้งเป็น Hero ของหน้าแรกแล้ว', 'success')
    }
  }

  const set = (field: keyof EventForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการอีเวนต์</h1>
        <Button onClick={openCreate} size="sm"><Plus size={14} /> เพิ่มอีเวนต์</Button>
      </div>

      <div className="space-y-3">
        {events.length === 0 && (
          <Card className="p-8 text-center text-ptn-muted">ยังไม่มีอีเวนต์</Card>
        )}
        {events.map(ev => (
          <Card key={ev.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="event" value={ev.event_type} />
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ev.is_active ? 'text-green-400 bg-green-500/10' : 'text-ptn-disabled bg-ptn-elevated'}`}>
                    {ev.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                  {ev.is_featured && (
                    <span className="flex items-center gap-1 text-xs text-ptn-gold bg-ptn-gold/10 px-1.5 py-0.5 rounded">
                      <Star size={10} className="fill-ptn-gold" /> Hero
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-ptn-text">{ev.title}</h3>
                {ev.description && <p className="text-xs text-ptn-muted mt-0.5 line-clamp-1">{ev.description}</p>}
                <div className="flex items-center gap-3 text-xs text-ptn-muted mt-1">
                  <span>{formatDate(ev.start_date, { month: 'short', day: 'numeric' })} — {formatDate(ev.end_date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setFeatured(ev)}
                  title={ev.is_featured ? 'Hero ปัจจุบัน' : 'ตั้งเป็น Hero หน้าแรก'}
                  className={`p-1 transition-colors ${ev.is_featured ? 'text-ptn-gold' : 'text-ptn-disabled hover:text-ptn-gold'}`}
                >
                  <Star size={15} className={ev.is_featured ? 'fill-ptn-gold' : ''} />
                </button>
                <button onClick={() => toggleActive(ev)} className="text-ptn-muted hover:text-ptn-text">
                  {ev.is_active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                </button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(ev)}><Edit2 size={13} /></Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(ev)}><Trash2 size={13} /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingEvent ? 'แก้ไขอีเวนต์' : 'เพิ่มอีเวนต์ใหม่'} size="lg">
        <div className="space-y-4">
          <Input label="ชื่ออีเวนต์" value={form.title} onChange={set('title')} placeholder="เช่น JASMINE &amp; HESTIA" />
          <Input label="ชื่อตัวละคร / Subtitle (แสดงบนซ้ายการ์ด)" value={form.subtitle} onChange={set('subtitle')} placeholder="เช่น Jasmine, Hestia" />
          <Select label="ประเภท" value={form.event_type} onChange={set('event_type')}>
            {(['story','rerun','collab','maintenance','other'] as const).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="วันเริ่มต้น" type="datetime-local" value={form.start_date} onChange={set('start_date')} />
            <Input label="วันสิ้นสุด" type="datetime-local" value={form.end_date} onChange={set('end_date')} />
          </div>
          <ImageUpload
            bucket="events"
            label="รูปแบนเนอร์"
            currentUrl={form.banner_url || null}
            aspectRatio="banner"
            onUpload={url => setForm(prev => ({ ...prev, banner_url: url }))}
          />
          <ImagePositionPicker
            position={form.image_position}
            onChange={pos => setForm(prev => ({ ...prev, image_position: pos }))}
            previewUrl={form.banner_url || undefined}
          />
          <Textarea label="คำอธิบาย" value={form.description} onChange={set('description')} placeholder="รายละเอียดอีเวนต์..." rows={3} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(prev => ({...prev, is_active: e.target.checked}))} className="accent-ptn-red" />
            <span className="text-sm text-ptn-text">ใช้งาน (แสดงบนหน้าแรก)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving}>{editingEvent ? 'บันทึก' : 'เพิ่มอีเวนต์'}</Button>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
