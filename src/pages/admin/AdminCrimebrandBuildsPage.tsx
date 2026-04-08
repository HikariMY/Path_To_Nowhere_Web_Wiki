// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Card } from '../../components/ui/Card'
import { useToast } from '../../components/ui/Toast'

type CbEffect = { piece: number; name: string; min: string; max: string }

type Crimebrand = {
  id: string
  name: string
  icon_url: string | null
  rank: string
  effects: CbEffect[]
}

type Character = {
  id: string
  name: string
  portrait_url: string | null
}

type BuildRow = {
  id: string
  character_id: string
  build_name: string
  description: string | null
  slot1_cb_id: string | null
  slot1_piece: number | null
  slot2_cb_id: string | null
  slot2_piece: number | null
  slot3_cb_id: string | null
  slot3_piece: number | null
  sort_order: number
}

type BuildForm = {
  build_name: string
  description: string
  slot1_cb_id: string
  slot1_piece: string
  slot2_cb_id: string
  slot2_piece: string
  slot3_cb_id: string
  slot3_piece: string
  sort_order: string
}

const PIECE_LABEL = ['I', 'II', 'III']
const RANK_COLORS: Record<string, string> = { S: '#FFD700', A: '#C084FC', B: '#60A5FA' }

const SLOT_KEYS: Array<{
  cbKey: 'slot1_cb_id' | 'slot2_cb_id' | 'slot3_cb_id'
  pieceKey: 'slot1_piece' | 'slot2_piece' | 'slot3_piece'
}> = [
  { cbKey: 'slot1_cb_id', pieceKey: 'slot1_piece' },
  { cbKey: 'slot2_cb_id', pieceKey: 'slot2_piece' },
  { cbKey: 'slot3_cb_id', pieceKey: 'slot3_piece' },
]

function blankForm(): BuildForm {
  return {
    build_name: '',
    description: '',
    slot1_cb_id: '',
    slot1_piece: '1',
    slot2_cb_id: '',
    slot2_piece: '1',
    slot3_cb_id: '',
    slot3_piece: '1',
    sort_order: '0',
  }
}

export function AdminCrimebrandBuildsPage() {
  const { toast } = useToast()
  const [characters, setCharacters] = useState<Character[]>([])
  const [crimebrands, setCrimebrands] = useState<Crimebrand[]>([])
  const [selectedCharId, setSelectedCharId] = useState('')
  const [builds, setBuilds] = useState<BuildRow[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BuildForm>(blankForm())
  const [saving, setSaving] = useState(false)

  // Dropdown open states
  const [charDropOpen, setCharDropOpen] = useState(false)
  const [charSearch, setCharSearch] = useState('')
  const charSearchRef = useRef<HTMLInputElement>(null)
  const [slotDropOpen, setSlotDropOpen] = useState([false, false, false])

  useEffect(() => {
    supabase.from('characters').select('id,name,portrait_url').order('name')
      .then(({ data }) => setCharacters(data || []))
    supabase.from('crimebrands').select('id,name,icon_url,rank,effects').order('release_order')
      .then(({ data }) => setCrimebrands(data || []))
  }, [])

  useEffect(() => {
    if (!selectedCharId) { setBuilds([]); return }
    supabase.from('character_crimebrand_builds')
      .select('*')
      .eq('character_id', selectedCharId)
      .order('sort_order')
      .then(({ data }) => setBuilds(data || []))
  }, [selectedCharId])

  function refreshBuilds() {
    if (!selectedCharId) return
    supabase.from('character_crimebrand_builds')
      .select('*')
      .eq('character_id', selectedCharId)
      .order('sort_order')
      .then(({ data }) => setBuilds(data || []))
  }

  function openAdd() {
    setEditingId(null)
    setForm(blankForm())
    setSlotDropOpen([false, false, false])
    setShowModal(true)
  }

  function openEdit(b: BuildRow) {
    setEditingId(b.id)
    setForm({
      build_name: b.build_name,
      description: b.description || '',
      slot1_cb_id: b.slot1_cb_id || '',
      slot1_piece: String(b.slot1_piece ?? 1),
      slot2_cb_id: b.slot2_cb_id || '',
      slot2_piece: String(b.slot2_piece ?? 1),
      slot3_cb_id: b.slot3_cb_id || '',
      slot3_piece: String(b.slot3_piece ?? 1),
      sort_order: String(b.sort_order),
    })
    setSlotDropOpen([false, false, false])
    setShowModal(true)
  }

  async function saveBuild() {
    if (!selectedCharId || !form.build_name.trim()) return
    setSaving(true)
    const payload = {
      character_id: selectedCharId,
      build_name: form.build_name.trim(),
      description: form.description.trim() || null,
      slot1_cb_id: form.slot1_cb_id || null,
      slot1_piece: form.slot1_cb_id ? Number(form.slot1_piece) : null,
      slot2_cb_id: form.slot2_cb_id || null,
      slot2_piece: form.slot2_cb_id ? Number(form.slot2_piece) : null,
      slot3_cb_id: form.slot3_cb_id || null,
      slot3_piece: form.slot3_cb_id ? Number(form.slot3_piece) : null,
      sort_order: Number(form.sort_order) || 0,
    }
    if (editingId) {
      const { error } = await supabase.from('character_crimebrand_builds').update(payload).eq('id', editingId)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
      toast('อัปเดตแล้ว', 'success')
    } else {
      const { error } = await supabase.from('character_crimebrand_builds').insert(payload)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
      toast('เพิ่มแล้ว', 'success')
    }
    setSaving(false)
    setShowModal(false)
    refreshBuilds()
  }

  async function deleteBuild(id: string) {
    if (!confirm('ลบ Build นี้?')) return
    const { error } = await supabase.from('character_crimebrand_builds').delete().eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast('ลบแล้ว', 'success')
    setBuilds(prev => prev.filter(b => b.id !== id))
  }

  function cbById(id: string | null) {
    if (!id) return undefined
    return crimebrands.find(c => c.id === id)
  }

  function closeAllSlotDrops() {
    setSlotDropOpen([false, false, false])
  }

  function toggleSlotDrop(i: number) {
    setSlotDropOpen(prev => prev.map((v, j) => j === i ? !v : false))
  }

  const selectedChar = characters.find(c => c.id === selectedCharId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการ Crimebrand Builds</h1>
        <p className="text-sm text-ptn-muted mt-1">กำหนด Crimebrand Set แนะนำสำหรับแต่ละตัวละคร</p>
      </div>

      {/* Character selector — custom dropdown with portrait */}
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-ptn-text mb-1.5">เลือกตัวละคร</label>
        <div className="relative">
          <button
            onClick={() => setCharDropOpen(v => !v)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-sm text-left hover:border-ptn-red/50 transition-colors"
          >
            {selectedChar ? (
              <>
                {selectedChar.portrait_url ? (
                  <img src={selectedChar.portrait_url} className="w-7 h-7 rounded object-cover object-top shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded bg-ptn-surface flex items-center justify-center shrink-0 text-xs text-ptn-disabled">
                    {selectedChar.name[0]}
                  </div>
                )}
                <span className="flex-1 text-ptn-text truncate">{selectedChar.name}</span>
              </>
            ) : (
              <span className="flex-1 text-ptn-muted">-- เลือกตัวละคร --</span>
            )}
            <ChevronDown size={14} className="text-ptn-muted shrink-0" />
          </button>
          {charDropOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => { setCharDropOpen(false); setCharSearch('') }} />
              <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-ptn-border bg-ptn-surface shadow-lg">
                {/* Search input */}
                <div className="p-2 border-b border-ptn-border">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-ptn-elevated border border-ptn-border">
                    <Search size={12} className="text-ptn-disabled shrink-0" />
                    <input
                      ref={charSearchRef}
                      autoFocus
                      value={charSearch}
                      onChange={e => setCharSearch(e.target.value)}
                      placeholder="ค้นหาตัวละคร..."
                      className="flex-1 bg-transparent text-sm text-ptn-text placeholder-ptn-disabled outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {characters
                    .filter(c => !charSearch || c.name.toLowerCase().includes(charSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCharId(c.id); setCharDropOpen(false); setCharSearch('') }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-ptn-elevated transition-colors ${selectedCharId === c.id ? 'bg-ptn-elevated' : ''}`}
                      >
                        {c.portrait_url ? (
                          <img src={c.portrait_url} className="w-7 h-7 rounded object-cover object-top shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-ptn-elevated flex items-center justify-center shrink-0 text-xs text-ptn-disabled">
                            {c.name[0]}
                          </div>
                        )}
                        <span className="text-ptn-text">{c.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedChar && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-ptn-text">{selectedChar.name}</h2>
            <Button size="sm" onClick={openAdd}>
              <Plus size={14} className="mr-1.5" /> เพิ่ม Build
            </Button>
          </div>

          {builds.length === 0 ? (
            <div className="border border-dashed border-ptn-border rounded-lg p-10 text-center text-ptn-muted text-sm">
              ยังไม่มี Crimebrand Build สำหรับ {selectedChar.name}
            </div>
          ) : (
            <div className="space-y-2">
              {builds.map(b => {
                const slots = [
                  { cb: cbById(b.slot1_cb_id), piece: b.slot1_piece },
                  { cb: cbById(b.slot2_cb_id), piece: b.slot2_piece },
                  { cb: cbById(b.slot3_cb_id), piece: b.slot3_piece },
                ]
                return (
                  <Card key={b.id} className="flex items-center gap-4 p-4">
                    <div className="flex gap-2">
                      {slots.map((s, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded border border-ptn-border bg-ptn-elevated overflow-hidden flex items-center justify-center">
                            {s.cb?.icon_url ? (
                              <img src={s.cb.icon_url} alt={s.cb.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-ptn-disabled">{PIECE_LABEL[i]}</span>
                            )}
                          </div>
                          {s.cb && s.piece && (
                            <span className="text-[10px] text-ptn-disabled font-mono">{PIECE_LABEL[(s.piece - 1) % 3]}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-bold text-ptn-text text-sm">{b.build_name}</p>
                      {b.description && <p className="text-xs text-ptn-muted mt-0.5 truncate">{b.description}</p>}
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {slots.map((s, i) => s.cb && (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border text-ptn-disabled border-ptn-border">
                            {s.cb.name} {s.piece ? PIECE_LABEL[s.piece - 1] : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteBuild(b.id)} className="text-ptn-red hover:bg-ptn-red/10">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? 'แก้ไข Build' : 'เพิ่ม Build'} size="md">
        <div className="space-y-4">
          {/* Build name */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">ชื่อ Build *</label>
            <input
              value={form.build_name}
              onChange={e => setForm(f => ({ ...f, build_name: e.target.value }))}
              placeholder="เช่น Best DPS, Budget Build..."
              className="w-full px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-ptn-text text-sm outline-none focus:border-ptn-red"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">คำอธิบาย</label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="คำอธิบาย Build..."
              className="w-full px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-ptn-text text-sm outline-none focus:border-ptn-red"
            />
          </div>

          {/* Slots */}
          {SLOT_KEYS.map((keys, i) => {
            const selCb = crimebrands.find(c => c.id === form[keys.cbKey])
            const effects = selCb ? (Array.isArray(selCb.effects) ? selCb.effects : []) : []
            const eff = effects.find(e => e.piece === Number(form[keys.pieceKey]))
            return (
              <div key={i}>
                <label className="block text-sm font-medium text-ptn-text mb-1.5">Slot {PIECE_LABEL[i]}</label>
                <div className="flex gap-2">
                  {/* Custom crimebrand dropdown */}
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSlotDrop(i)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-sm text-left hover:border-ptn-red/50 transition-colors"
                    >
                      {selCb ? (
                        <>
                          {selCb.icon_url ? (
                            <img src={selCb.icon_url} className="w-6 h-6 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-ptn-surface shrink-0" />
                          )}
                          <span
                            className="text-[10px] px-1 rounded font-bold shrink-0"
                            style={{ color: RANK_COLORS[selCb.rank] || '#fff', background: `${RANK_COLORS[selCb.rank]}20` }}
                          >
                            {selCb.rank}
                          </span>
                          <span className="flex-1 text-ptn-text truncate">{selCb.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-ptn-muted">-- ไม่เลือก --</span>
                      )}
                      <ChevronDown size={13} className="text-ptn-muted shrink-0" />
                    </button>

                    {slotDropOpen[i] && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={closeAllSlotDrops} />
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-ptn-border bg-ptn-surface shadow-lg">
                          <button
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, [keys.cbKey]: '' })); closeAllSlotDrops() }}
                            className="w-full px-3 py-2 text-sm text-ptn-muted text-left hover:bg-ptn-elevated transition-colors"
                          >
                            -- ไม่เลือก --
                          </button>
                          {crimebrands.map(cb => (
                            <button
                              key={cb.id}
                              type="button"
                              onClick={() => { setForm(f => ({ ...f, [keys.cbKey]: cb.id })); closeAllSlotDrops() }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-ptn-elevated transition-colors ${form[keys.cbKey] === cb.id ? 'bg-ptn-elevated' : ''}`}
                            >
                              {cb.icon_url ? (
                                <img src={cb.icon_url} className="w-7 h-7 rounded object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded bg-ptn-elevated shrink-0" />
                              )}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                                style={{ color: RANK_COLORS[cb.rank] || '#fff', background: `${RANK_COLORS[cb.rank]}20` }}
                              >
                                {cb.rank}
                              </span>
                              <span className="flex-1 text-ptn-text truncate">{cb.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Piece selector */}
                  <select
                    value={form[keys.pieceKey]}
                    onChange={e => setForm(f => ({ ...f, [keys.pieceKey]: e.target.value }))}
                    disabled={!form[keys.cbKey]}
                    className="w-28 px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-ptn-text text-sm outline-none focus:border-ptn-red disabled:opacity-40"
                  >
                    {[1, 2, 3].map(p => (
                      <option key={p} value={p}>Piece {PIECE_LABEL[p - 1]}</option>
                    ))}
                  </select>
                </div>

                {/* Effect preview */}
                {selCb && eff && (
                  <p className="text-xs text-ptn-muted mt-1 pl-1">
                    {eff.name}{' '}
                    <span className="font-mono text-ptn-disabled">
                      {eff.min} →{' '}
                      <span style={{ color: RANK_COLORS[selCb.rank] || '#fff' }}>{eff.max}</span>
                    </span>
                  </p>
                )}
              </div>
            )
          })}

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">ลำดับแสดง</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
              className="w-24 px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-ptn-text text-sm outline-none focus:border-ptn-red"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-ptn-border">
            <Button variant="ghost" onClick={() => setShowModal(false)}>ยกเลิก</Button>
            <Button onClick={saveBuild} disabled={saving || !form.build_name.trim()}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
