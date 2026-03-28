// @ts-nocheck
import { useState, useEffect } from 'react'
import { Edit2, RotateCcw, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { ABILITY_TAG_GROUPS, TAG_DESCRIPTIONS } from '../../lib/abilityTags'
import { ALIGNMENT_LABEL, ALIGNMENT_ICON, TENDENCY_ICON, JOB_CLASS_LABEL } from '../../lib/constants'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'

// ---- Types -----------------------------------------------------------------

type GameInfoRow = {
  category: string
  key: string
  data: {
    desc?: string
    color?: string
    icon_url?: string
    label?: string
    group_label?: string
    is_custom?: boolean
  }
}

type EditState = {
  category: string
  key: string
  label: string
  desc: string
  color: string
  hasColor: boolean
  isCustom: boolean
}

type AddForm = {
  key: string          // tag name / alignment key / tendency key
  label: string        // display name (alignment/tendency only)
  desc: string
  color: string        // tendency only
  icon_url: string     // alignment/tendency only
  group_label: string  // tag only
}

const BLANK_ADD: AddForm = { key: '', label: '', desc: '', color: '#ffffff', icon_url: '', group_label: '' }

// ---- Default descriptions --------------------------------------------------

const DEFAULT_ALIGNMENT_DESC: Record<string, string> = {
  violence:   'ผู้ที่เลือกใช้กำลังและความรุนแรงเป็นเครื่องมือ ไม่ว่าจะเพื่อเป้าหมายใดก็ตาม',
  love:       'ขับเคลื่อนด้วยความรักและความผูกพัน ยอมเสี่ยงทุกอย่างเพื่อผู้ที่ตนรัก',
  greed:      'แสวงหาทรัพยากรและอำนาจโดยไม่รู้จักพอ มองทุกสิ่งเป็นโอกาสที่จะได้มาซึ่งประโยชน์',
  treachery:  'เชี่ยวชาญการหักหลังและใช้กลอุบาย ไว้ใจได้ยาก แต่มักได้ผลลัพธ์ที่ต้องการ',
  limbo:      'ลอยอยู่ระหว่างขั้ว ไม่ยึดติดกับฝ่ายใดอย่างแน่ชัด ปรับตัวได้กับทุกสถานการณ์',
  anger:      'ถูกขับเคลื่อนด้วยความโกรธและความเคียดแค้น พลังงานเชิงลบกลายเป็นแรงผลักดันที่ไม่อาจหยุดยั้ง',
  sloth:      'ดูเฉื่อยชาภายนอก แต่ซ่อนศักยภาพไว้ภายใน เลือกเคลื่อนไหวเฉพาะเมื่อจำเป็น',
  fraud:      'เชี่ยวชาญการหลอกลวงและสร้างภาพลักษณ์ ความจริงและเท็จในมือของพวกเขาเป็นเพียงเครื่องมือ',
  heresy:     'ท้าทายความเชื่อและกฎเกณฑ์ที่มีอยู่ มองโลกด้วยมุมมองที่แตกต่างจากคนส่วนใหญ่อย่างสิ้นเชิง',
  immortal:   'ผู้ที่อยู่เหนือกาลเวลา ประสบการณ์อันยาวนานทำให้มีมุมมองที่แตกต่างจากมนุษย์ธรรมดา',
  pestilence: 'เชื่อมโยงกับพลังของโรคระบาดและการแพร่กระจาย ตัวแทนของความเปลี่ยนแปลงที่หลีกเลี่ยงไม่ได้',
  infinite:   'แสวงหาความเป็นอนันต์ ไม่มีขีดจำกัดในความทะเยอทะยานและศักยภาพ',
  famine:     'ตัวแทนของความขาดแคลนและความหิวโหย พลังงานของพวกเขามาจากความต้องการที่ไม่เคยได้รับการเติมเต็ม',
  war:        'เกิดมาเพื่อสงคราม ความขัดแย้งคือที่ที่พวกเขาเปล่งประกายและรู้สึกมีชีวิตชีวาที่สุด',
  death:      'เผชิญหน้ากับความตายอย่างไม่หวั่นเกรง บางครั้งทำหน้าที่เป็นผู้นำพาหรือตัวแทนของจุดสิ้นสุด',
  sequester:  'เลือกที่จะแยกตัวออกจากสังคม พลังของพวกเขาเติบโตในความเงียบสงัดและการสันโดษ',
}

const DEFAULT_TENDENCY: Record<string, { desc: string; color: string }> = {
  arcane:    { desc: 'นักเวทย์มนตร์ที่ใช้ Magic DMG โจมตีศัตรู มักมีสกิลพิเศษที่ควบคุมพลังงานเวทมนตร์', color: '#a855f7' },
  breaker:   { desc: 'นักรบ Umbra ที่เชี่ยวชาญการสร้าง Core Damage และทำลายการป้องกันของศัตรู', color: '#f97316' },
  fury:      { desc: 'นักรบดุดันที่เน้น Physical DMG สูง ดีลสูงในระยะสั้น เหมาะกับการรุกอย่างต่อเนื่อง', color: '#ef4444' },
  guard:     { desc: 'ผู้พิทักษ์ Endura ที่เน้นการป้องกัน รับดาเมจแทนเพื่อนร่วมทีม และใช้ Shield Support', color: '#3b82f6' },
  inclusion: { desc: 'ผู้สนับสนุน Catalyst ที่ช่วยทีมด้วยการบัฟ ฮีล และ Energy Recovery ต่างๆ', color: '#22c55e' },
  reticle:   { desc: 'นักยิงระยะไกล Reticle โจมตีจากระยะปลอดภัย มักมีสกิลที่ใช้ Weakspot หรือ True DMG', color: '#eab308' },
}

const TABS = [
  { id: 'tags',      label: 'Ability Tags' },
  { id: 'alignment', label: 'Alignment' },
  { id: 'tendency',  label: 'Tendency' },
]

// ---- Page ------------------------------------------------------------------

export function AdminGameInfoPage() {
  const [activeTab, setActiveTab] = useState('tags')
  const [rows, setRows] = useState<GameInfoRow[]>([])
  const [loading, setLoading] = useState(true)

  // Edit existing
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  // Add new
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(BLANK_ADD)
  const [adding, setAdding] = useState(false)

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null)
  const [resetting, setResetting] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => { fetchRows() }, [])

  async function fetchRows() {
    setLoading(true)
    const { data } = await supabase.from('game_info').select('*')
    setRows(data || [])
    setLoading(false)
  }

  function getRow(category: string, key: string): GameInfoRow | undefined {
    return rows.find(r => r.category === category && r.key === key)
  }

  function getDesc(category: string, key: string, fallback: string) {
    return getRow(category, key)?.data?.desc ?? fallback
  }

  function getColor(category: string, key: string, fallback: string) {
    return getRow(category, key)?.data?.color ?? fallback
  }

  function isCustom(category: string, key: string) {
    return !!getRow(category, key)?.data?.is_custom
  }

  function isModified(category: string, key: string) {
    return !!getRow(category, key) && !isCustom(category, key)
  }

  // Custom rows for a category
  function customRows(category: string) {
    return rows.filter(r => r.category === category && r.data?.is_custom)
  }

  // ---- Edit ----------------------------------------------------------------

  function openEdit(category: string, key: string, label: string, defaultDesc: string, defaultColor?: string) {
    const row = getRow(category, key)
    setEditState({
      category,
      key,
      label,
      desc: row?.data?.desc ?? defaultDesc,
      color: row?.data?.color ?? defaultColor ?? '',
      hasColor: !!defaultColor,
      isCustom: !!row?.data?.is_custom,
    })
  }

  async function saveRow(category: string, itemKey: string, data: Record<string, unknown>) {
    const existing = getRow(category, itemKey)
    let error
    if (existing) {
      const res = await supabase
        .from('game_info')
        .update({ data })
        .eq('category', category)
        .eq('key', itemKey)
      error = res.error
    } else {
      const res = await supabase
        .from('game_info')
        .insert({ category, key: itemKey, data })
      error = res.error
    }
    return error
  }

  async function handleSave() {
    if (!editState) return
    setSaving(true)
    const existing = getRow(editState.category, editState.key)
    const data: Record<string, unknown> = {
      ...(existing?.data ?? {}),
      desc: editState.desc,
    }
    if (editState.hasColor && editState.color) data.color = editState.color
    const error = await saveRow(editState.category, editState.key, data)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('บันทึกสำเร็จ', 'success')
      await fetchRows()
      setEditState(null)
    }
    setSaving(false)
  }

  // ---- Reset / Delete ------------------------------------------------------

  async function handleReset(category: string, itemKey: string) {
    const id = `${category}:${itemKey}`
    setResetting(id)
    const { error } = await supabase
      .from('game_info')
      .delete()
      .eq('category', category)
      .eq('key', itemKey)
    if (error) toast(error.message, 'error')
    else await fetchRows()
    setResetting(null)
  }

  async function handleDelete(category: string, itemKey: string) {
    const id = `${category}:${itemKey}`
    setDeleting(id)
    const { error } = await supabase
      .from('game_info')
      .delete()
      .eq('category', category)
      .eq('key', itemKey)
    if (error) toast(error.message, 'error')
    else await fetchRows()
    setDeleting(null)
  }

  // ---- Add new -------------------------------------------------------------

  function openAdd() {
    setAddForm({ ...BLANK_ADD, group_label: ABILITY_TAG_GROUPS[0].label })
    setAddOpen(true)
  }

  async function handleAdd() {
    if (!addForm.key.trim()) return
    setAdding(true)

    const category = activeTab === 'tags' ? 'tag' : activeTab
    const itemKey  = addForm.key.trim()
    const data: Record<string, unknown> = { desc: addForm.desc, is_custom: true }

    if (activeTab === 'tags') {
      data.group_label = addForm.group_label
    } else if (activeTab === 'alignment') {
      data.label    = addForm.label.trim()
      data.icon_url = addForm.icon_url.trim()
    } else if (activeTab === 'tendency') {
      data.label    = addForm.label.trim()
      data.icon_url = addForm.icon_url.trim()
      data.color    = addForm.color.trim()
    }

    const error = await saveRow(category, itemKey, data)
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('เพิ่มสำเร็จ', 'success')
      await fetchRows()
      setAddOpen(false)
    }
    setAdding(false)
  }

  // ---- Inline render helpers (not components — avoid closure issues) ---------

  const modifiedBadge = <span className="text-xs text-ptn-cyan border border-ptn-cyan/30 px-1.5 py-0.5 rounded">แก้ไขแล้ว</span>
  const newBadge      = <span className="text-xs text-green-400 border border-green-400/30 px-1.5 py-0.5 rounded">ใหม่</span>

  function editBtn(cat: string, k: string, lbl: string, defDesc: string, defColor?: string) {
    return (
      <Button size="sm" variant="ghost" onClick={() => openEdit(cat, k, lbl, defDesc, defColor)}>
        <Edit2 size={13} />
      </Button>
    )
  }

  function resetBtn(cat: string, k: string) {
    return (
      <Button size="sm" variant="ghost" loading={resetting === `${cat}:${k}`} onClick={() => handleReset(cat, k)} title="คืนค่าเริ่มต้น">
        <RotateCcw size={13} />
      </Button>
    )
  }

  function deleteBtn(cat: string, k: string) {
    return (
      <Button size="sm" variant="danger" loading={deleting === `${cat}:${k}`} onClick={() => handleDelete(cat, k)} title="ลบ">
        <Trash2 size={13} />
      </Button>
    )
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการข้อมูลเกม</h1>
          <p className="text-ptn-muted text-sm mt-1">แก้ไขและเพิ่มข้อมูล Ability Tags, Alignment และ Tendency</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus size={15} className="mr-1.5" />
          เพิ่มใหม่
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-ptn-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-t transition-colors',
              activeTab === tab.id
                ? 'text-ptn-text border-b-2 border-ptn-red -mb-px bg-ptn-elevated'
                : 'text-ptn-muted hover:text-ptn-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-ptn-muted text-sm">กำลังโหลด...</div>
      ) : (
        <>
          {/* ---- TAGS ---- */}
          {activeTab === 'tags' && (
            <div className="space-y-5">
              {ABILITY_TAG_GROUPS.map(group => {
                const customs = rows.filter(
                  r => r.category === 'tag' && r.data?.is_custom && r.data?.group_label === group.label,
                )
                return (
                  <Card key={group.label} className="p-5">
                    <h2 className="font-heading font-bold text-sm mb-4" style={{ color: group.text }}>
                      {group.label}
                    </h2>
                    <div className="space-y-3">
                      {/* Default tags */}
                      {group.tags.map(tag => {
                        const modified = isModified('tag', tag)
                        const desc = getDesc('tag', tag, TAG_DESCRIPTIONS[tag] || '')
                        return (
                          <div key={tag} className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 rounded border font-mono font-semibold" style={{ background: group.bg, borderColor: group.border, color: group.text }}>
                                  {tag}
                                </span>
                                {modified && modifiedBadge}
                              </div>
                              <p className="text-sm text-ptn-muted leading-relaxed">{desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 mt-1">
                              {editBtn('tag', tag, tag, TAG_DESCRIPTIONS[tag] || '')}
                              {modified && resetBtn('tag', tag)}
                            </div>
                          </div>
                        )
                      })}

                      {/* Custom tags in this group */}
                      {customs.map(row => (
                        <div key={row.key} className="flex items-start gap-3 border-t border-ptn-border/50 pt-3 mt-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded border font-mono font-semibold" style={{ background: group.bg, borderColor: group.border, color: group.text }}>
                                {row.key}
                              </span>
                              {newBadge}
                            </div>
                            <p className="text-sm text-ptn-muted leading-relaxed">{row.data?.desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 mt-1">
                            {editBtn('tag', row.key, row.key, row.data?.desc || '')}
                            {deleteBtn('tag', row.key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}

              {/* Custom tags with unknown group */}
              {(() => {
                const unknownCustoms = rows.filter(
                  r => r.category === 'tag' && r.data?.is_custom &&
                    !ABILITY_TAG_GROUPS.some(g => g.label === r.data?.group_label),
                )
                if (unknownCustoms.length === 0) return null
                return (
                  <Card className="p-5">
                    <h2 className="font-heading font-bold text-sm mb-4 text-ptn-muted">กลุ่มอื่นๆ</h2>
                    <div className="space-y-3">
                      {unknownCustoms.map(row => (
                        <div key={row.key} className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-0.5 rounded border font-mono font-semibold border-ptn-border text-ptn-muted">
                                {row.key}
                              </span>
                              {newBadge}
                              {row.data?.group_label && <span className="text-xs text-ptn-disabled">({row.data.group_label})</span>}
                            </div>
                            <p className="text-sm text-ptn-muted leading-relaxed">{row.data?.desc || '—'}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 mt-1">
                            {editBtn('tag', row.key, row.key, row.data?.desc || '')}
                            {deleteBtn('tag', row.key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })()}
            </div>
          )}

          {/* ---- ALIGNMENT ---- */}
          {activeTab === 'alignment' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Default alignments */}
              {Object.entries(ALIGNMENT_LABEL).map(([key, label]) => {
                const icon = ALIGNMENT_ICON[key]
                const modified = isModified('alignment', key)
                const desc = getDesc('alignment', key, DEFAULT_ALIGNMENT_DESC[key] || '')
                return (
                  <Card key={key} className="p-4">
                    <div className="flex items-start gap-3">
                      {icon && <img src={icon} alt={label} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-ptn-border" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-bold text-ptn-text text-sm">{label}</p>
                          {modified && modifiedBadge}
                        </div>
                        <p className="text-xs text-ptn-muted leading-relaxed line-clamp-2">{desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editBtn('alignment', key, label, DEFAULT_ALIGNMENT_DESC[key] || '')}
                        {modified && resetBtn('alignment', key)}
                      </div>
                    </div>
                  </Card>
                )
              })}

              {/* Custom alignments */}
              {customRows('alignment').map(row => {
                const label = row.data?.label || row.key
                const icon = row.data?.icon_url
                return (
                  <Card key={row.key} className="p-4 border-green-500/20">
                    <div className="flex items-start gap-3">
                      {icon
                        ? <img src={icon} alt={label} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-ptn-border" />
                        : <div className="w-12 h-12 rounded-lg bg-ptn-elevated border border-ptn-border shrink-0 flex items-center justify-center text-ptn-disabled text-xs">?</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-bold text-ptn-text text-sm">{label}</p>
                          {newBadge}
                        </div>
                        <p className="text-xs text-ptn-muted leading-relaxed line-clamp-2">{row.data?.desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editBtn('alignment', row.key, label, row.data?.desc || '')}
                        {deleteBtn('alignment', row.key)}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* ---- TENDENCY ---- */}
          {activeTab === 'tendency' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Default tendencies */}
              {Object.entries(JOB_CLASS_LABEL).map(([key, label]) => {
                const icon = TENDENCY_ICON[key]
                const def = DEFAULT_TENDENCY[key] || { desc: '', color: '#ffffff' }
                const modified = isModified('tendency', key)
                const desc = getDesc('tendency', key, def.desc)
                const color = getColor('tendency', key, def.color)
                return (
                  <Card key={key} className="p-4">
                    <div className="flex items-start gap-3">
                      {icon && (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${color}18`, borderColor: `${color}40` }}>
                          <img src={icon} alt={label} className="w-9 h-9 object-contain" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-bold text-sm" style={{ color }}>{label}</p>
                          {modified && modifiedBadge}
                        </div>
                        <p className="text-xs text-ptn-muted leading-relaxed line-clamp-2">{desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editBtn('tendency', key, label, def.desc, def.color)}
                        {modified && resetBtn('tendency', key)}
                      </div>
                    </div>
                  </Card>
                )
              })}

              {/* Custom tendencies */}
              {customRows('tendency').map(row => {
                const label = row.data?.label || row.key
                const icon  = row.data?.icon_url
                const color = row.data?.color || '#ffffff'
                return (
                  <Card key={row.key} className="p-4 border-green-500/20">
                    <div className="flex items-start gap-3">
                      {icon
                        ? <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${color}18`, borderColor: `${color}40` }}>
                            <img src={icon} alt={label} className="w-9 h-9 object-contain" />
                          </div>
                        : <div className="w-12 h-12 rounded-xl bg-ptn-elevated border border-ptn-border shrink-0 flex items-center justify-center text-ptn-disabled text-xs">?</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-heading font-bold text-sm" style={{ color }}>{label}</p>
                          {newBadge}
                        </div>
                        <p className="text-xs text-ptn-muted leading-relaxed line-clamp-2">{row.data?.desc || <span className="italic text-ptn-disabled">ยังไม่มีคำอธิบาย</span>}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editBtn('tendency', row.key, label, row.data?.desc || '', color)}
                        {deleteBtn('tendency', row.key)}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ---- Edit Modal ---- */}
      <Modal open={!!editState} onClose={() => setEditState(null)} title={`แก้ไข: ${editState?.label ?? ''}`} size="md">
        {editState && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1.5">คำอธิบาย</label>
              <Textarea
                value={editState.desc}
                onChange={e => setEditState(s => s ? { ...s, desc: e.target.value } : s)}
                rows={4}
                placeholder="คำอธิบายภาษาไทย..."
              />
            </div>
            {editState.hasColor && (
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">สี (Hex)</label>
                <div className="flex items-center gap-3">
                  <Input value={editState.color} onChange={e => setEditState(s => s ? { ...s, color: e.target.value } : s)} placeholder="#a855f7" className="font-mono" />
                  <div className="w-8 h-8 rounded border border-ptn-border shrink-0" style={{ background: editState.color }} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditState(null)}>ยกเลิก</Button>
              <Button loading={saving} onClick={handleSave}>บันทึก</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Add New Modal ---- */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`เพิ่ม${activeTab === 'tags' ? ' Tag' : activeTab === 'alignment' ? ' Alignment' : ' Tendency'}ใหม่`}
        size="md"
      >
        <div className="space-y-4">
          {/* Tag fields */}
          {activeTab === 'tags' && (
            <>
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">ชื่อ Tag <span className="text-ptn-red">*</span></label>
                <Input value={addForm.key} onChange={e => setAddForm(f => ({ ...f, key: e.target.value }))} placeholder="เช่น New DMG Type" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">กลุ่ม</label>
                <Select value={addForm.group_label} onChange={e => setAddForm(f => ({ ...f, group_label: e.target.value }))}>
                  {ABILITY_TAG_GROUPS.map(g => (
                    <option key={g.label} value={g.label}>{g.label}</option>
                  ))}
                  <option value="Other">Other (กลุ่มอื่นๆ)</option>
                </Select>
              </div>
            </>
          )}

          {/* Alignment / Tendency fields */}
          {(activeTab === 'alignment' || activeTab === 'tendency') && (
            <>
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">Key (ภาษาอังกฤษ ไม่มีเว้นวรรค) <span className="text-ptn-red">*</span></label>
                <Input value={addForm.key} onChange={e => setAddForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="เช่น new_alignment" className="font-mono" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">ชื่อที่แสดง <span className="text-ptn-red">*</span></label>
                <Input value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))} placeholder="เช่น New Alignment" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">URL รูปไอคอน</label>
                <Input value={addForm.icon_url} onChange={e => setAddForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://..." />
                {addForm.icon_url && (
                  <img src={addForm.icon_url} alt="preview" className="mt-2 w-14 h-14 rounded-lg object-cover border border-ptn-border" onError={e => { e.currentTarget.style.display = 'none' }} />
                )}
              </div>
            </>
          )}

          {/* Tendency color */}
          {activeTab === 'tendency' && (
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1.5">สี (Hex)</label>
              <div className="flex items-center gap-3">
                <Input value={addForm.color} onChange={e => setAddForm(f => ({ ...f, color: e.target.value }))} placeholder="#ffffff" className="font-mono" />
                <div className="w-8 h-8 rounded border border-ptn-border shrink-0" style={{ background: addForm.color }} />
              </div>
            </div>
          )}

          {/* Description (all) */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">คำอธิบาย</label>
            <Textarea
              value={addForm.desc}
              onChange={e => setAddForm(f => ({ ...f, desc: e.target.value }))}
              rows={3}
              placeholder="คำอธิบายภาษาไทย..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>ยกเลิก</Button>
            <Button loading={adding} onClick={handleAdd} disabled={!addForm.key.trim()}>สร้าง</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
