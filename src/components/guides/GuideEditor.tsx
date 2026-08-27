import { useState } from 'react'
import { Plus, Trash2, X, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CharacterSkill, ShackleBreak } from '../../types/models'
import type { GuideDraft, EcbOption, CharOption } from './guideDraft'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Modal } from '../ui/Modal'
import { GUIDE_TAGS } from '../../lib/constants'
import { cn } from '../../lib/utils'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ptn-muted">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-ptn-disabled">{hint}</p>}
    </div>
  )
}

/** ช่องเขียน markdown พร้อมสลับดูตัวอย่าง */
function MarkdownBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [preview, setPreview] = useState(false)
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-ptn-disabled">
          รองรับ markdown — **ตัวหนา**, - รายการ, | ตาราง |, ![รูป](ลิงก์)
        </span>
        <button
          type="button"
          onClick={() => setPreview(v => !v)}
          className="flex items-center gap-1 text-xs text-ptn-muted transition-colors hover:text-ptn-cyan"
        >
          {preview ? <EyeOff size={12} /> : <Eye size={12} />}
          {preview ? 'กลับไปแก้' : 'ดูตัวอย่าง'}
        </button>
      </div>
      {preview ? (
        <div className="prose-ptn min-h-[120px] rounded border border-ptn-border bg-ptn-bg px-3 py-2 text-sm">
          {value.trim()
            ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            : <span className="text-ptn-disabled">ยังไม่ได้เขียนอะไร</span>}
        </div>
      ) : (
        <Textarea rows={6} value={value} onChange={e => onChange(e.target.value)} placeholder="เขียนเนื้อหาหัวข้อนี้..." />
      )}
    </div>
  )
}

export function GuideEditor({
  open, onClose, draft, setDraft, onSave, saving, editing,
  skills, shackles, ecbOptions, charOptions,
}: {
  open: boolean
  onClose: () => void
  draft: GuideDraft
  setDraft: React.Dispatch<React.SetStateAction<GuideDraft>>
  onSave: () => void
  saving: boolean
  editing: boolean
  skills: CharacterSkill[]
  shackles: ShackleBreak[]
  ecbOptions: EcbOption[]
  charOptions: CharOption[]
}) {
  const [teamSearch, setTeamSearch] = useState('')

  const skillKey = (s: CharacterSkill) => s.id ?? s.name
  const patch = <T,>(k: keyof GuideDraft, v: T) => setDraft(p => ({ ...p, [k]: v }))

  const toggleArr = <T,>(arr: T[], v: T) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

  const moveSection = (i: number, dir: -1 | 1) => setDraft(p => {
    const next = [...p.sections]
    const j = i + dir
    if (j < 0 || j >= next.length) return p
    ;[next[i], next[j]] = [next[j], next[i]]
    return { ...p, sections: next }
  })

  const teamMatches = charOptions
    .filter(c => !draft.recommended_team.includes(c.id))
    .filter(c => !teamSearch.trim() || c.name.toLowerCase().includes(teamSearch.toLowerCase()))
    .slice(0, 8)

  return (
    <Modal open={open} onClose={onClose} size="xl" title={editing ? 'แก้ไขไกด์' : 'เขียนไกด์ใหม่'}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              label="ชื่อไกด์"
              value={draft.title}
              onChange={e => patch('title', e.target.value)}
              placeholder="เช่น สายเน้นดาเมจ ใช้คู่กับ Celine"
            />
          </div>
          <Input
            label="แพตช์ที่เขียน"
            value={draft.patch_version}
            onChange={e => patch('patch_version', e.target.value)}
            placeholder="เช่น 3.2"
          />
        </div>

        <Field label="แท็กบริบท" hint="ช่วยให้คนอ่านรู้ว่าไกด์นี้เขียนสำหรับสถานการณ์ไหน">
          <div className="flex flex-wrap gap-1.5">
            {GUIDE_TAGS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => patch('tags', toggleArr(draft.tags, t))}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  draft.tags.includes(t)
                    ? 'border-ptn-cyan/40 bg-ptn-cyan/15 text-ptn-cyan'
                    : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div className="rounded-lg border border-ptn-border bg-ptn-elevated/40 p-3 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ptn-muted">
            สรุปการลงทุน (เว้นว่างได้ทุกช่อง)
          </p>

          <Field label="ลำดับการอัปสกิล" hint="คลิกสกิลตามลำดับที่ควรอัปก่อน-หลัง คลิกที่รายการด้านล่างเพื่อเอาออก">
            {skills.length === 0 ? (
              <p className="text-xs text-ptn-disabled">ตัวละครนี้ยังไม่มีข้อมูลสกิล</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {skills.filter(s => !draft.skill_priority.includes(skillKey(s))).map(s => (
                    <button
                      key={skillKey(s)}
                      type="button"
                      onClick={() => patch('skill_priority', [...draft.skill_priority, skillKey(s)])}
                      className="rounded border border-ptn-border px-2 py-1 text-xs text-ptn-muted transition-colors hover:border-ptn-cyan/40 hover:text-ptn-text"
                    >
                      + {s.name}
                    </button>
                  ))}
                </div>
                {draft.skill_priority.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {draft.skill_priority.map((key, i) => {
                      const s = skills.find(x => skillKey(x) === key)
                      return (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && <span className="text-ptn-disabled">›</span>}
                          <button
                            type="button"
                            onClick={() => patch('skill_priority', draft.skill_priority.filter(k => k !== key))}
                            className="flex items-center gap-1 rounded bg-ptn-cyan/15 px-2 py-1 text-xs text-ptn-cyan hover:bg-ptn-red/20 hover:text-ptn-red"
                          >
                            {s?.name ?? key}<X size={10} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="เลเวลสกิลเริ่มต้น"
              value={draft.level_from}
              onChange={e => patch('level_from', e.target.value)}
              placeholder="เช่น 7777"
            />
            <Input
              label="เลเวลสกิลเป้าหมาย"
              value={draft.level_to}
              onChange={e => patch('level_to', e.target.value)}
              placeholder="เช่น 9090"
            />
          </div>

          <Field label="Shackle ที่คุ้มค่า">
            {shackles.length === 0 ? (
              <p className="text-xs text-ptn-disabled">ตัวละครนี้ยังไม่มีข้อมูล Shackle</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {shackles.map(s => (
                  <button
                    key={s.stage}
                    type="button"
                    title={s.bonus_th || s.bonus}
                    onClick={() => patch('notable_shackles', toggleArr(draft.notable_shackles, s.stage))}
                    className={cn(
                      'rounded border px-2 py-1 text-xs transition-colors',
                      draft.notable_shackles.includes(s.stage)
                        ? 'border-ptn-cyan/40 bg-ptn-cyan/15 text-ptn-cyan'
                        : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
                    )}
                  >
                    S{s.stage}{s.name ? ` · ${s.name}` : ''}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Select
            label="Crimebrand ที่แนะนำ"
            value={draft.recommended_ecb_id}
            onChange={e => patch('recommended_ecb_id', e.target.value)}
          >
            <option value="">— ไม่ระบุ —</option>
            {ecbOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>

          <Field label="ทีมที่เข้าขา">
            {draft.recommended_team.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {draft.recommended_team.map(id => {
                  const c = charOptions.find(x => x.id === id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => patch('recommended_team', draft.recommended_team.filter(x => x !== id))}
                      className="flex items-center gap-1.5 rounded bg-ptn-cyan/15 px-2 py-1 text-xs text-ptn-cyan hover:bg-ptn-red/20 hover:text-ptn-red"
                    >
                      {c?.portrait_url && <img src={c.portrait_url} alt="" className="h-5 w-5 rounded object-cover object-top" />}
                      {c?.name ?? id}<X size={10} />
                    </button>
                  )
                })}
              </div>
            )}
            <Input
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              placeholder="พิมพ์ชื่อตัวละครเพื่อค้นหา..."
            />
            {teamSearch.trim() && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {teamMatches.length === 0
                  ? <span className="text-xs text-ptn-disabled">ไม่พบตัวละคร</span>
                  : teamMatches.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { patch('recommended_team', [...draft.recommended_team, c.id]); setTeamSearch('') }}
                      className="flex items-center gap-1.5 rounded border border-ptn-border px-2 py-1 text-xs text-ptn-muted hover:border-ptn-cyan/40 hover:text-ptn-text"
                    >
                      {c.portrait_url && <img src={c.portrait_url} alt="" className="h-5 w-5 rounded object-cover object-top" />}
                      {c.name}
                    </button>
                  ))}
              </div>
            )}
          </Field>
        </div>

        {/* ── เนื้อไกด์ ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ptn-muted">เนื้อไกด์</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => patch('sections', [...draft.sections, { heading: '', body: '' }])}
            >
              <Plus size={13} /> เพิ่มหัวข้อ
            </Button>
          </div>

          {draft.sections.map((sec, i) => (
            <div key={i} className="rounded-lg border border-ptn-border p-3">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  className="flex-1"
                  value={sec.heading}
                  onChange={e => setDraft(p => ({
                    ...p,
                    sections: p.sections.map((s, j) => j === i ? { ...s, heading: e.target.value } : s),
                  }))}
                  placeholder="ชื่อหัวข้อ เช่น จุดเด่น / วิธีเล่น / ข้อควรระวัง"
                />
                <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0}
                  title="เลื่อนขึ้น" className="p-1 text-ptn-muted hover:text-ptn-text disabled:opacity-30">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => moveSection(i, 1)} disabled={i === draft.sections.length - 1}
                  title="เลื่อนลง" className="p-1 text-ptn-muted hover:text-ptn-text disabled:opacity-30">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => patch('sections', draft.sections.filter((_, j) => j !== i))}
                  disabled={draft.sections.length === 1}
                  title="ลบหัวข้อ" className="p-1 text-ptn-muted hover:text-ptn-red disabled:opacity-30">
                  <Trash2 size={14} />
                </button>
              </div>
              <MarkdownBox
                value={sec.body}
                onChange={v => setDraft(p => ({
                  ...p,
                  sections: p.sections.map((s, j) => j === i ? { ...s, body: v } : s),
                }))}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-ptn-border pt-4">
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={onSave} loading={saving}>
            {editing ? 'บันทึกการแก้ไข' : 'เผยแพร่ไกด์'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
