// @ts-nocheck
import { useEffect, useState } from 'react'
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

type Announcement = {
  id: string
  content: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export function AdminAnnouncementsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setItems(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newText.trim()) return
    setAdding(true)
    const { data, error } = await supabase
      .from('announcements')
      .insert({ content: newText.trim(), sort_order: items.length } as never)
      .select()
      .single()
    setAdding(false)
    if (error) { toast('เกิดข้อผิดพลาด: ' + error.message, 'error'); return }
    setItems(prev => [...prev, data as unknown as Announcement])
    setNewText('')
    toast('เพิ่มประกาศสำเร็จ', 'success')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันการลบ?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (!error) { setItems(prev => prev.filter(i => i.id !== id)); toast('ลบสำเร็จ', 'success') }
    else toast('เกิดข้อผิดพลาด', 'error')
  }

  const toggleActive = async (item: Announcement) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !item.is_active } as never)
      .eq('id', item.id)
    if (!error) setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
  }

  const startEdit = (item: Announcement) => {
    setEditingId(item.id)
    setEditText(item.content)
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    const { error } = await supabase
      .from('announcements')
      .update({ content: editText.trim() } as never)
      .eq('id', id)
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, content: editText.trim() } : i))
      toast('บันทึกสำเร็จ', 'success')
    } else toast('เกิดข้อผิดพลาด', 'error')
    setEditingId(null)
  }

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">ข่าวสารและประกาศ</h1>
        <p className="text-sm text-ptn-muted mt-1">
          จัดการรายการข่าวสารที่แสดงในหน้าแรก — เพิ่ม แก้ไข เปิด/ปิดได้ทันที
        </p>
      </div>

      {/* Add new */}
      <Card className="p-4 mb-6">
        <p className="text-sm font-medium text-ptn-text mb-2">เพิ่มประกาศใหม่</p>
        <div className="flex gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="เขียนข้อความประกาศ..."
            className="flex-1 bg-ptn-elevated border border-ptn-border rounded-md px-3 py-2 text-sm text-ptn-text placeholder:text-ptn-disabled outline-none focus:border-ptn-red transition-colors"
          />
          <Button onClick={handleAdd} loading={adding} size="sm">
            <Plus size={14} /> เพิ่ม
          </Button>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-2">
        {items.length === 0 && (
          <Card className="p-8 text-center text-ptn-muted">ยังไม่มีประกาศ กด "เพิ่มประกาศใหม่" ด้านบน</Card>
        )}
        {items.map(item => (
          <Card key={item.id} className={`p-3 transition-opacity ${!item.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <GripVertical size={14} className="text-ptn-disabled shrink-0" />

              {/* Toggle dot */}
              <button
                onClick={() => toggleActive(item)}
                className={`shrink-0 w-2 h-2 rounded-full transition-colors ${item.is_active ? 'bg-ptn-red' : 'bg-ptn-border'}`}
                title={item.is_active ? 'ซ่อน' : 'แสดง'}
              />

              {/* Content — inline edit */}
              {editingId === item.id ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEdit(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 bg-ptn-bg border border-ptn-red rounded px-2 py-1 text-sm text-ptn-text outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-sm text-ptn-muted cursor-pointer hover:text-ptn-text transition-colors"
                  onDoubleClick={() => startEdit(item)}
                  title="ดับเบิ้ลคลิกเพื่อแก้ไข"
                >
                  {item.content}
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {editingId === item.id ? (
                  <>
                    <button onClick={() => saveEdit(item.id)} className="p-1 text-green-400 hover:text-green-300">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-ptn-muted hover:text-ptn-text">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-ptn-disabled hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-ptn-disabled mt-4">
        💡 ดับเบิ้ลคลิกที่ข้อความเพื่อแก้ไขทันที • กดจุดสีเพื่อเปิด/ปิดการแสดงผล
      </p>
    </div>
  )
}
