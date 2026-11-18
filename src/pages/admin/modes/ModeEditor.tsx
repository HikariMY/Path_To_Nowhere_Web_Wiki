import { useEffect, useState, type ReactNode } from 'react'
import { Trash2, Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { GameModeRow, GameModeSourceRow } from '../../../types'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { ImageUpload } from '../../../components/ui/ImageUpload'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../contexts/AuthContext'
import {
  MODE_NAME_MAX, SOURCE_AUTHOR_MAX, SOURCE_TITLE_MAX, blankModeForm, modeFormFromRow, modePayload, validateMode, type ModeForm,
} from '../../../lib/gameModes'
import { isStale } from '../../../lib/cnGuides'
import { safeHttpUrl } from '../../../lib/tierList'

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-ptn-border pt-4">
      <legend className="pr-2 text-xs font-bold uppercase tracking-wider text-ptn-muted">{title}</legend>
      {note && <p className="-mt-1 text-xs text-ptn-disabled">{note}</p>}
      {children}
    </fieldset>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ptn-text">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-ptn-red" />
      {label}
    </label>
  )
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * ฟอร์มแก้ไกด์โหมด: ข้อมูลหลัก · ข้อมูล Global (เช็กในเกม) · ภาพจากในเกม · ข้อมูลเซิร์ฟจีน (ล่วงหน้า) · แหล่งอ้างอิง
 * mode = null คือเพิ่มโหมดใหม่ (แหล่งอ้างอิงเพิ่มได้หลังบันทึกครั้งแรก)
 */
export function ModeEditor({ mode, onSaved, onClose }: { mode: GameModeRow | null; onSaved: () => void; onClose: () => void }) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<ModeForm>(() => (mode ? modeFormFromRow(mode as unknown as Record<string, unknown> & GameModeRow) : blankModeForm()))
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ModeForm>(key: K) => (value: ModeForm[K]) => setForm(f => ({ ...f, [key]: value }))
  const text = (key: keyof ModeForm) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }))

  const log = async (action: string, targetId: string) => {
    if (!profile) return
    await supabase.from('admin_logs').insert({ admin_id: profile.id, action, target_table: 'game_modes', target_id: targetId } as never)
  }

  const handleSave = async () => {
    const errors = validateMode(form)
    if (errors.length) { toast(errors.join(' · '), 'error'); return }
    setSaving(true)
    const payload = { ...modePayload(form), updated_at: new Date().toISOString() }
    const res = mode
      ? await supabase.from('game_modes').update(payload as never).eq('id', mode.id).select('id').single()
      : await supabase.from('game_modes').insert(payload as never).select('id').single()
    setSaving(false)
    if (res.error) {
      toast(res.error.code === '23505' ? 'slug นี้มีโหมดอื่นใช้แล้ว' : 'บันทึกไม่สำเร็จ: ' + res.error.message, 'error')
      return
    }
    await log(`${mode ? 'แก้' : 'เพิ่ม'}ไกด์โหมด: ${payload.name}`, (res.data as { id: string }).id)
    toast('บันทึกแล้ว', 'success')
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="ชื่อโหมด (อังกฤษ ตามในเกม) *" value={form.name} onChange={text('name')} maxLength={MODE_NAME_MAX} />
        <Input label="slug (ลิงก์ /modes/...) *" value={form.slug} onChange={text('slug')} placeholder="เช่น oblivion-pit" />
        <Input label="อยู่ในเมนู" value={form.global_menu} onChange={text('global_menu')} placeholder="เช่น DisSea, Broken Frontline" />
        <Input label="ป้ายกำกับ" value={form.tag} onChange={text('tag')} placeholder="เช่น Score Attack · Weekly" />
        <div className="sm:col-span-2">
          <Input label="เส้นทางในเกม" value={form.path} onChange={text('path')} placeholder="เช่น DisCity → DisSea → Oblivion Pit" />
        </div>
        <Input label="ชื่อจีน (ไว้เทียบแหล่งอ้างอิง ไม่แสดงบนเว็บ)" value={form.cn_name} onChange={text('cn_name')} />
        <Input label="ลำดับ (น้อยขึ้นก่อน)" type="number" value={form.sort_order} onChange={text('sort_order')} />
        <div className="sm:col-span-2">
          <Textarea label="สรุปสั้น" value={form.summary} onChange={text('summary')} rows={2} />
        </div>
        <Check label="ชื่อตรงกับในเกมเซิร์ฟ Global แล้ว" checked={form.verified} onChange={set('verified')} />
      </div>

      <Group title="ข้อมูลเซิร์ฟ Global" note="เช็กในเกมเอง แสดงเป็นหลักบนหน้าเว็บ">
        <div className="flex flex-wrap gap-4">
          <Check label="มีโหมดนี้ในเซิร์ฟ Global แล้ว" checked={form.in_global} onChange={set('in_global')} />
          <Check label='ยังล็อกในเกม (ขึ้นป้าย "ยังล็อก")' checked={form.locked} onChange={set('locked')} />
        </div>
        {form.in_global && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Textarea label='ระบบของโหมด — บรรทัดละข้อ "หัวข้อ: รายละเอียด"' value={form.rulesText} onChange={text('rulesText')} rows={5} />
            </div>
            <Input label="หัวข้อรายชื่อด่าน / ชั้น" value={form.stages_title} onChange={text('stages_title')} placeholder="เช่น ชั้นของรอบนี้" />
            <Textarea label='ด่าน / ชั้น — บรรทัดละข้อ "ชื่อ: รายละเอียด" (ไม่มีรายละเอียดก็ได้)' value={form.stagesText} onChange={text('stagesText')} rows={4} />
            <Input label="รอบ / Stage" value={form.season_label} onChange={text('season_label')} placeholder="เว้นว่างถ้าไม่หมุนเวียน" />
            <Input label="Trait" value={form.season_trait} onChange={text('season_trait')} placeholder="เว้นว่างได้" />
            <Input label="สิ้นสุดรอบ (เวลาไทย)" type="datetime-local" step={1} value={form.season_ends} onChange={text('season_ends')} />
            <Textarea label="Boss (บรรทัดละตัว)" value={form.bossesText} onChange={text('bossesText')} rows={3} />
          </div>
        )}
        <Textarea label="เคล็ดลับที่ใช้ได้กับ Global (บรรทัดละข้อ)" value={form.tipsText} onChange={text('tipsText')} rows={3} />
      </Group>

      <Group title="ภาพจากในเกม" note="ครอปเฉพาะหน้าต่างเกม ใส่คำอธิบายสั้น ๆ ทุกภาพ">
        {form.shots.map((s, i) => (
          <div key={`${i}-${s.url}`} className="flex items-center gap-3">
            <img src={s.url} alt="" className="h-12 w-20 shrink-0 rounded border border-ptn-border object-cover" />
            <input
              value={s.caption}
              onChange={e => set('shots')(form.shots.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))}
              placeholder="คำอธิบายภาพ"
              aria-label="คำอธิบายภาพ"
              className="min-w-0 flex-1 rounded border border-ptn-border bg-ptn-elevated px-3 py-2 text-sm text-ptn-text outline-none focus:border-ptn-red"
            />
            <button type="button" onClick={() => set('shots')(form.shots.filter((_, k) => k !== i))} aria-label="ลบภาพ" className="p-1.5 text-ptn-muted hover:text-ptn-red">
              <X size={14} />
            </button>
          </div>
        ))}
        {/* key เปลี่ยนทุกครั้งที่เพิ่มภาพ → ช่องอัปโหลดกลับมาว่างพร้อมรับภาพถัดไป */}
        <ImageUpload key={form.shots.length} bucket="events" aspectRatio="banner" label="เพิ่มภาพ" onUpload={url => setForm(f => ({ ...f, shots: [...f.shots, { url, caption: '' }] }))} />
      </Group>

      <Group title="ข้อมูลเซิร์ฟจีน (ล่วงหน้า)" note='สรุปจากแหล่งอ้างอิงด้วยคำของเราเอง แสดงแยกจาก Global พร้อมป้าย "ข้อมูลเซิร์ฟจีน" · ไม่ต้องใส่ชื่อภาษาจีน'>
        <Textarea label="ข้อควรระวัง (กรอบสีเหลืองบนสุด)" value={form.cn_note} onChange={text('cn_note')} rows={2} />
        <Textarea label='ระบบ / กลไก — บรรทัดละข้อ "หัวข้อ: รายละเอียด"' value={form.cnRulesText} onChange={text('cnRulesText')} rows={4} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="รอบ (เซิร์ฟจีน)" value={form.cn_season_label} onChange={text('cn_season_label')} placeholder="เช่น Season 35" />
          <Textarea label="เอฟเฟกต์ของรอบ" value={form.cn_season_effect} onChange={text('cn_season_effect')} rows={2} />
        </div>
        <Textarea label='บัฟตามคลาส — บรรทัดละข้อ "คลาส: บัฟ"' value={form.cnBuffsText} onChange={text('cnBuffsText')} rows={4} />
        <Textarea label="เคล็ดลับจากผู้เล่นจีน (บรรทัดละข้อ)" value={form.cnTipsText} onChange={text('cnTipsText')} rows={3} />
      </Group>

      {mode && <ModeSources modeId={mode.id} modeName={mode.name} />}

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 bg-ptn-surface px-1 py-3">
        <Button variant="ghost" onClick={onClose}>ปิด</Button>
        <Button onClick={handleSave} loading={saving}>บันทึก</Button>
      </div>
    </div>
  )
}

/** แหล่งอ้างอิงของโหมด — แก้ทีละแถว บันทึกทันที */
function ModeSources({ modeId, modeName }: { modeId: string; modeName: string }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<GameModeSourceRow[]>([])
  const [draft, setDraft] = useState({ title: '', author: '', url: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase.from('game_mode_sources').select('*').eq('mode_id', modeId).order('sort_order')
      .then(({ data }) => { if (!cancelled) setRows((data || []) as GameModeSourceRow[]) })
    return () => { cancelled = true }
  }, [modeId, reloadKey])

  const add = async () => {
    const tooLong = [...draft.title.trim()].length > SOURCE_TITLE_MAX || [...draft.author.trim()].length > SOURCE_AUTHOR_MAX
    if (tooLong || !draft.title.trim() || !draft.author.trim() || !safeHttpUrl(draft.url) || !/^https?:\/\//i.test(draft.url.trim())) {
      toast('แหล่งอ้างอิงต้องมีชื่อ ผู้เขียน และลิงก์ที่ขึ้นต้นด้วย https://', 'error')
      return
    }
    const { error } = await supabase.from('game_mode_sources').insert({
      mode_id: modeId, title: draft.title.trim(), author: draft.author.trim(), url: draft.url.trim(), checked_at: today(), sort_order: rows.length,
    } as never)
    if (error) { toast('เพิ่มไม่สำเร็จ: ' + error.message, 'error'); return }
    setDraft({ title: '', author: '', url: '' })
    setReloadKey(k => k + 1)
  }

  const remove = async (row: GameModeSourceRow) => {
    if (!confirm(`ลบแหล่งอ้างอิง "${row.title}" ของ ${modeName}?`)) return
    const { error } = await supabase.from('game_mode_sources').delete().eq('id', row.id)
    if (error) { toast('ลบไม่สำเร็จ: ' + error.message, 'error'); return }
    setReloadKey(k => k + 1)
  }

  return (
    <Group title="แหล่งอ้างอิง" note="ข้อมูลเซิร์ฟจีนต้องมีเครดิตอย่างน้อย 1 รายการ · ข้อมูลที่เช็กในเกมเองไม่ต้องมี · กด 'ตรวจแล้ว' ได้ที่หน้าแหล่งอ้างอิงภายนอก">
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between gap-2 rounded border border-ptn-border px-3 py-2 text-sm">
          <span className="min-w-0">
            <b className="break-words text-ptn-text">{r.title}</b>
            <span className="block text-xs text-ptn-muted">
              {r.author} · ตรวจล่าสุด {r.checked_at}{isStale(r.checked_at) && <span className="ml-1 text-ptn-gold">(ต้องตรวจใหม่)</span>}
            </span>
          </span>
          <button type="button" onClick={() => remove(r)} aria-label="ลบแหล่งอ้างอิง" className="p-1.5 text-ptn-muted hover:text-ptn-red"><Trash2 size={14} /></button>
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
        <Input placeholder="ชื่อบทความต้นฉบับ" maxLength={SOURCE_TITLE_MAX} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
        <Input placeholder="ผู้เขียน" maxLength={SOURCE_AUTHOR_MAX} value={draft.author} onChange={e => setDraft(d => ({ ...d, author: e.target.value }))} />
        <Input placeholder="https://wiki.biligame.com/wqmt/..." value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} />
        <Button variant="outline" onClick={add}><Plus size={14} /> เพิ่ม</Button>
      </div>
    </Group>
  )
}
