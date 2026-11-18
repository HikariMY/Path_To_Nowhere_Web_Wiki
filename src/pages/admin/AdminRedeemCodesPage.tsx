import { useCallback, useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { RedeemCodeRow, SiteStatusRow } from '../../types'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../contexts/AuthContext'
import { fromDateTimeInput, toDateTimeInput } from '../../lib/datetime'
import { cn, formatDate } from '../../lib/utils'
import { isCodeVisible, validateCode, PATCH_NAME_MAX, REDEEM_REWARD_MAX } from '../../lib/redeemCodes'

const MIGRATION_HINT = 'โหลดไม่ได้ — ตรวจว่ารัน supabase_migration_redeem_codes.sql แล้วหรือยัง'

type CodeForm = { id: string | null; code: string; reward: string; expires: string }
const EMPTY_FORM: CodeForm = { id: null, code: '', reward: '', expires: '' }

type StatusForm = Pick<SiteStatusRow, 'show_bar' | 'patch_name' | 'show_event'>
const DEFAULT_STATUS: StatusForm = { show_bar: true, patch_name: '', show_event: true }

/** แอดมิน → Redeem Code & แถบสถานะใต้เมนู */
export function AdminRedeemCodesPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [codes, setCodes] = useState<RedeemCodeRow[]>([])
  const [status, setStatus] = useState<StatusForm>(DEFAULT_STATUS)
  const [form, setForm] = useState<CodeForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [codesRes, statusRes] = await Promise.all([
        supabase.from('redeem_codes').select('*').order('sort_order').order('created_at'),
        supabase.from('site_status').select('*').eq('id', 1).maybeSingle(),
      ])
      if (cancelled) return
      setLoadError(codesRes.error || statusRes.error ? MIGRATION_HINT : null)
      setCodes((codesRes.data || []) as RedeemCodeRow[])
      if (statusRes.data) {
        const s = statusRes.data as SiteStatusRow
        setStatus({ show_bar: s.show_bar, patch_name: s.patch_name ?? '', show_event: s.show_event })
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [reloadKey])

  const log = async (action: string, targetTable: string, targetId: string | null) => {
    if (profile) await supabase.from('admin_logs').insert({ admin_id: profile.id, action, target_table: targetTable, target_id: targetId } as never)
  }

  const handleSaveCode = async () => {
    const others = codes.filter(c => c.id !== form.id).map(c => c.code)
    const check = validateCode(form.code, others)
    if ('error' in check) { toast(check.error, 'error'); return }
    const payload = {
      code: check.code,
      reward: form.reward.trim() || null,
      expires_at: fromDateTimeInput(form.expires),
    }
    setSaving(true)
    const { error } = form.id
      ? await supabase.from('redeem_codes').update(payload).eq('id', form.id)
      : await supabase.from('redeem_codes').insert({ ...payload, sort_order: codes.length })
    setSaving(false)
    if (error) { toast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return }
    await log(`${form.id ? 'แก้' : 'เพิ่ม'} Redeem Code: ${check.code}`, 'redeem_codes', form.id)
    toast(form.id ? 'บันทึกแล้ว' : 'เพิ่มโค้ดแล้ว', 'success')
    setForm(EMPTY_FORM)
    reload()
  }

  const toggleActive = async (c: RedeemCodeRow) => {
    const { error } = await supabase.from('redeem_codes').update({ is_active: !c.is_active }).eq('id', c.id)
    if (error) { toast('เปลี่ยนไม่สำเร็จ: ' + error.message, 'error'); return }
    setCodes(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: !c.is_active } : x)))
  }

  const handleDelete = async (c: RedeemCodeRow) => {
    if (!confirm(`ลบโค้ด "${c.code}"?`)) return
    const { error } = await supabase.from('redeem_codes').delete().eq('id', c.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    await log(`ลบ Redeem Code: ${c.code}`, 'redeem_codes', c.id)
    if (form.id === c.id) setForm(EMPTY_FORM)
    toast('ลบแล้ว', 'success')
    reload()
  }

  const handleSaveStatus = async () => {
    setSavingStatus(true)
    const patch = (status.patch_name ?? '').trim()
    const { error } = await supabase.from('site_status').upsert({
      id: 1, show_bar: status.show_bar, show_event: status.show_event,
      patch_name: patch || null, updated_at: new Date().toISOString(),
    })
    setSavingStatus(false)
    if (error) { toast('บันทึกไม่สำเร็จ: ' + error.message, 'error'); return }
    await log('ตั้งค่าแถบสถานะใต้เมนู', 'site_status', null)
    toast('บันทึกแถบสถานะแล้ว — มีผลเมื่อผู้ใช้โหลดหน้าใหม่', 'success')
  }

  const startEdit = (c: RedeemCodeRow) =>
    setForm({ id: c.id, code: c.code, reward: c.reward ?? '', expires: toDateTimeInput(c.expires_at) })

  if (loading) return <PageLoader />

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">Redeem Code & แถบสถานะ</h1>
        <p className="text-sm text-ptn-muted">โค้ดแสดงในกล่องหน้าแรกและแถบใต้เมนู กดคัดลอกได้ · หมดอายุหรือปิดไว้จะซ่อนเอง</p>
      </div>

      {loadError && <Card className="mb-4 p-4 text-sm text-red-400">{loadError}</Card>}

      <Card className="mb-6 p-4">
        <h2 className="mb-3 font-heading text-lg font-bold text-ptn-text">แถบสถานะใต้เมนู</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Input
            label="แพทช์ปัจจุบัน (Global)"
            value={status.patch_name ?? ''}
            maxLength={PATCH_NAME_MAX}
            placeholder="เช่น Requiem — เว้นว่าง = ไม่แสดง"
            onChange={e => setStatus(s => ({ ...s, patch_name: e.target.value }))}
          />
          <Check label="แสดงแถบสถานะ" checked={status.show_bar} onChange={v => setStatus(s => ({ ...s, show_bar: v }))} />
          <Check label="แสดงอีเวนต์ที่ใกล้หมด" checked={status.show_event} onChange={v => setStatus(s => ({ ...s, show_event: v }))} />
          <Button onClick={handleSaveStatus} loading={savingStatus} disabled={!!loadError}>บันทึก</Button>
        </div>
        <p className="mt-2 text-xs text-ptn-disabled">อีเวนต์ที่ใกล้หมดเลือกให้อัตโนมัติจากอีเวนต์ที่เปิดอยู่และมีวันสิ้นสุด</p>
      </Card>

      <Card className="mb-4 p-4">
        <h2 className="mb-3 font-heading text-lg font-bold text-ptn-text">{form.id ? 'แก้ไขโค้ด' : 'เพิ่มโค้ด'}</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto] sm:items-end">
          <Input label="โค้ด" value={form.code} placeholder="เช่น Happy4thAnniv" onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          <Input label="ของรางวัล (ไม่บังคับ)" value={form.reward} maxLength={REDEEM_REWARD_MAX} placeholder="เช่น Hypercube ×100" onChange={e => setForm(f => ({ ...f, reward: e.target.value }))} />
          <Input label="ใช้ได้ถึง (ไม่บังคับ)" type="datetime-local" value={form.expires} onChange={e => setForm(f => ({ ...f, expires: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={handleSaveCode} loading={saving} disabled={!!loadError}>
              {form.id ? 'บันทึก' : <><Plus size={14} /> เพิ่ม</>}
            </Button>
            {form.id && <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)} title="ยกเลิกการแก้ไข"><X size={14} /></Button>}
          </div>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="border-b border-ptn-border bg-ptn-elevated/50">
            <tr>
              {['โค้ด', 'ของรางวัล', 'ใช้ได้ถึง', 'แสดงบนเว็บ', ''].map(h => (
                <th key={h} className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-ptn-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map(c => <CodeRow key={c.id} code={c} onToggle={toggleActive} onEdit={startEdit} onDelete={handleDelete} />)}
            {codes.length === 0 && !loadError && (
              <tr><td colSpan={5} className="p-8 text-center text-ptn-muted">ยังไม่มีโค้ด — เพิ่มด้านบน</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="mt-3 text-xs text-ptn-disabled">
        ประกาศแบบเดิม "Redeem Code:..." ที่หน้าข่าวสาร/ประกาศยังอยู่ — ถ้าไม่อยากให้ขึ้นซ้ำในกล่องข่าวสาร ให้ปิดประกาศนั้นแทนการลบ
      </p>
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-ptn-text">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-ptn-red" />
      {label}
    </label>
  )
}

function CodeRow({ code: c, onToggle, onEdit, onDelete }: {
  code: RedeemCodeRow
  onToggle: (c: RedeemCodeRow) => void
  onEdit: (c: RedeemCodeRow) => void
  onDelete: (c: RedeemCodeRow) => void
}) {
  const expired = !!c.expires_at && !isCodeVisible({ is_active: true, expires_at: c.expires_at })
  return (
    <tr className={cn('border-b border-ptn-border last:border-0 hover:bg-ptn-elevated/50', (!c.is_active || expired) && 'opacity-60')}>
      <td className="p-3 font-mono font-semibold text-ptn-gold">{c.code}</td>
      <td className="p-3 text-ptn-muted">{c.reward || '—'}</td>
      <td className="p-3 text-xs text-ptn-muted">
        {c.expires_at ? formatDate(c.expires_at, { month: 'short', hour: 'numeric', minute: '2-digit', hour12: false }) : 'ไม่มีกำหนด'}
        {expired && <span className="ml-1.5 rounded border border-red-500/30 bg-red-900/20 px-1.5 py-0.5 text-red-400">หมดอายุ</span>}
      </td>
      <td className="p-3">
        <button
          type="button"
          onClick={() => onToggle(c)}
          title={c.is_active ? 'กดเพื่อซ่อนจากหน้าเว็บ' : 'กดเพื่อแสดงบนหน้าเว็บ'}
          className={cn('rounded border px-2 py-0.5 text-xs transition-colors',
            c.is_active ? 'border-green-500/30 bg-green-900/20 text-green-400' : 'border-ptn-border text-ptn-muted')}
        >
          {c.is_active ? 'เปิด' : 'ปิด'}
        </button>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-0.5">
          <button type="button" onClick={() => onEdit(c)} title="แก้ไข" className="p-1.5 text-ptn-muted hover:text-ptn-text"><Edit2 size={14} /></button>
          <button type="button" onClick={() => onDelete(c)} title="ลบ" className="p-1.5 text-ptn-muted hover:text-ptn-red"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  )
}
