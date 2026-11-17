import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle2, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { CharacterCnGuideRow } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { safeHttpUrl } from '../../lib/tierList'
import { CN_STALE_DAYS, isStale, parsePoints, pointsToText, readPoints, validateCnGuide } from '../../lib/cnGuides'

type Form = {
  verdict: string
  pointsText: string
  source_title: string
  source_author: string
  source_url: string
  checked_at: string
  sort_order: string
}

const today = () => new Date().toISOString().slice(0, 10)
const blankForm = (): Form => ({ verdict: '', pointsText: '', source_title: '', source_author: '', source_url: '', checked_at: today(), sort_order: '0' })

/**
 * สรุปไกด์จากผู้เล่นจีนของตัวละครหนึ่งตัว — แสดงในแท็บไกด์ฝั่ง "ข้อมูลจากผู้เล่นจีน"
 * เขียนสรุปด้วยคำของเราเอง (ไม่แปลทั้งบท) + เครดิตครบทุกครั้ง · เตือนเมื่อไม่ได้ตรวจกับต้นฉบับเกิน 60 วัน
 */
export function CnGuidesPanel({ characterId, characterName }: { characterId: string; characterName: string }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<CharacterCnGuideRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CharacterCnGuideRow | null>(null)
  const [form, setForm] = useState<Form>(blankForm())
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    supabase.from('character_cn_guides').select('*').eq('character_id', characterId)
      .order('sort_order').order('created_at')
      .then(({ data, error }) => {
        if (cancelled) return
        setLoadError(error ? 'โหลดไม่ได้ — ตรวจว่ารัน supabase_migration_cn_guides.sql แล้วหรือยัง' : null)
        setRows((data || []) as CharacterCnGuideRow[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [characterId, reloadKey])

  const log = async (action: string, targetId: string) => {
    if (!profile) return
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action, target_table: 'character_cn_guides', target_id: targetId } as never)
  }

  const openCreate = () => { setEditing(null); setForm(blankForm()); setModalOpen(true) }
  const openEdit = (row: CharacterCnGuideRow) => {
    setEditing(row)
    setForm({
      verdict: row.verdict ?? '',
      pointsText: pointsToText(readPoints(row.points)),
      source_title: row.source_title,
      source_author: row.source_author,
      source_url: row.source_url,
      checked_at: row.checked_at,
      sort_order: String(row.sort_order),
    })
    setModalOpen(true)
  }
  const set = (key: keyof Form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    const errors = validateCnGuide(form)
    if (errors.length) { toast(errors.join(' · '), 'error'); return }
    setSaving(true)
    const payload = {
      character_id: characterId,
      verdict: form.verdict.trim() || null,
      points: parsePoints(form.pointsText),
      source_title: form.source_title.trim(),
      source_author: form.source_author.trim(),
      source_url: form.source_url.trim(),
      checked_at: form.checked_at || today(),
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      updated_at: new Date().toISOString(),
    }
    const res = editing
      ? await supabase.from('character_cn_guides').update(payload as never).eq('id', editing.id).select('id').single()
      : await supabase.from('character_cn_guides').insert(payload as never).select('id').single()
    setSaving(false)
    if (res.error) { toast('บันทึกไม่สำเร็จ: ' + res.error.message, 'error'); return }
    await log(`${editing ? 'แก้' : 'เพิ่ม'}สรุปไกด์จีน: ${characterName} — ${payload.source_title}`, (res.data as { id: string }).id)
    toast('บันทึกแล้ว', 'success')
    setModalOpen(false)
    reload()
  }

  const handleDelete = async (row: CharacterCnGuideRow) => {
    if (!confirm(`ลบสรุปไกด์จีน "${row.source_title}"?`)) return
    const { error } = await supabase.from('character_cn_guides').delete().eq('id', row.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    await log(`ลบสรุปไกด์จีน: ${characterName} — ${row.source_title}`, row.id)
    toast('ลบแล้ว', 'success')
    reload()
  }

  // ตรวจกับต้นฉบับแล้ว → บันทึกวันที่วันนี้ (ล้างคำเตือนเกิน 60 วัน)
  const markChecked = async (row: CharacterCnGuideRow) => {
    const { error } = await supabase.from('character_cn_guides').update({ checked_at: today() } as never).eq('id', row.id)
    if (error) { toast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return }
    toast('บันทึกว่าตรวจแล้ววันนี้', 'success')
    reload()
  }

  if (loading) return <p className="text-sm text-ptn-muted">กำลังโหลด...</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ptn-muted">
          แสดงในแท็บไกด์ → "ข้อมูลจากผู้เล่นจีน" · เขียนสรุปด้วยคำของเราเอง ห้ามแปลทั้งบท · เตือนเมื่อไม่ได้ตรวจเกิน {CN_STALE_DAYS} วัน
        </p>
        <Button size="sm" onClick={openCreate} disabled={!!loadError}><Plus size={14} /> เพิ่มสรุป</Button>
      </div>

      {loadError && <Card className="p-4 text-sm text-red-400">{loadError}</Card>}

      {!loadError && rows.length === 0 && (
        <Card className="p-6 text-center text-sm text-ptn-muted">ยังไม่มีสรุปไกด์จีนของ {characterName}</Card>
      )}

      {rows.map(row => {
        const stale = isStale(row.checked_at)
        const url = safeHttpUrl(row.source_url)
        return (
          <Card key={row.id} className="p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-ptn-text">{row.verdict || <span className="text-ptn-muted">(ไม่มีสรุปสั้น)</span>}</p>
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-ptn-cyan hover:underline break-all">
                    <ExternalLink size={11} /> {row.source_title} — {row.source_author}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className={`rounded px-2 py-0.5 text-xs ${stale ? 'bg-ptn-gold/15 text-ptn-gold' : 'bg-emerald-400/10 text-emerald-400'}`}>
                  {stale ? 'ต้องตรวจใหม่' : 'ตรวจแล้ว'} · {row.checked_at}
                </span>
                <button type="button" onClick={() => markChecked(row)} title="ตรวจกับต้นฉบับแล้ววันนี้" className="p-1.5 text-ptn-muted hover:text-emerald-400"><CheckCircle2 size={14} /></button>
                <button type="button" onClick={() => openEdit(row)} title="แก้ไข" className="p-1.5 text-ptn-muted hover:text-ptn-text"><Edit2 size={14} /></button>
                <button type="button" onClick={() => handleDelete(row)} title="ลบ" className="p-1.5 text-ptn-muted hover:text-ptn-red"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-xs text-ptn-muted">{readPoints(row.points).length} ประเด็น</p>
          </Card>
        )
      })}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'แก้สรุปไกด์จีน' : `เพิ่มสรุปไกด์จีน · ${characterName}`}>
        <div className="space-y-3">
          <Input label="สรุปสั้น (ไม่บังคับ)" value={form.verdict} onChange={set('verdict')} placeholder="เช่น ไม่ค่อยคุ้มสุ่ม ใช้งานยาก" />
          <Textarea
            label='ประเด็น — บรรทัดละข้อ "หัวข้อ: รายละเอียด" (1–12 ข้อ)'
            value={form.pointsText}
            onChange={set('pointsText')}
            rows={7}
            placeholder={'บทบาท: DPS สาย Long Fight เน้น Physical Crit\nจุดเด่น: Crit Rate ในตัวสูง\nข้อควรรู้: Passive 2 ต้องมี ATK Speed 80%'}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="ชื่อบทความต้นฉบับ *" value={form.source_title} onChange={set('source_title')} placeholder="เช่น 承霄角色简评" />
            <Input label="ผู้เขียนต้นฉบับ *" value={form.source_author} onChange={set('source_author')} />
          </div>
          <Input label="ลิงก์ต้นฉบับ *" value={form.source_url} onChange={set('source_url')} placeholder="https://wiki.biligame.com/wqmt/..." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="ตรวจกับต้นฉบับล่าสุด" type="date" value={form.checked_at} onChange={set('checked_at')} />
            <Input label="ลำดับ (น้อยขึ้นก่อน)" type="number" value={form.sort_order} onChange={set('sort_order')} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleSave} loading={saving}>บันทึก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
