// @ts-nocheck
import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { ImageUpload } from '../../components/ui/ImageUpload'
import { useToast } from '../../components/ui/Toast'

// ---- Types -----------------------------------------------------------------

type CbEffect = { piece: number; name: string; min: string; max: string }
type CbFlavor = { piece: number; text: string }

type Crimebrand = {
  id: string
  name: string
  slug: string
  rank: string
  slot: number | null
  icon_url: string | null
  artwork_url: string | null
  source: string | null
  unreleased: boolean
  release_order: number
  effects: CbEffect[]
  set_bonus: string | null
  note: string | null
  flavor_texts: CbFlavor[]
  recommended_char_ids: string[]
}

type CharOption = {
  id: string
  name: string
  portrait_url: string | null
}

type CbForm = {
  name: string
  rank: string
  icon_url: string
  artwork_url: string
  source: string
  unreleased: boolean
  release_order: string
  effects: CbEffect[]
  set_bonus: string
  note: string
  flavor_texts: CbFlavor[]
  recommended_char_ids: string[]
}

const BLANK_EFFECT: CbEffect = { piece: 1, name: '', min: '', max: '' }
const BLANK_FLAVOR: CbFlavor = { piece: 1, text: '' }

function blankForm(): CbForm {
  return {
    name: '', rank: 'B', icon_url: '', artwork_url: '',
    source: '', unreleased: false, release_order: '0',
    effects: [
      { piece: 1, name: '', min: '', max: '' },
      { piece: 2, name: '', min: '', max: '' },
      { piece: 3, name: '', min: '', max: '' },
    ],
    set_bonus: '',
    note: '',
    flavor_texts: [{ piece: 1, text: '' }, { piece: 2, text: '' }, { piece: 3, text: '' }],
    recommended_char_ids: [],
  }
}

const RANK_COLORS: Record<string, string> = { S: '#FFD700', A: '#C084FC', B: '#60A5FA' }
const PIECE_LABEL = ['I', 'II', 'III']

// ---- Page ------------------------------------------------------------------

export function AdminCrimebrandsPage() {
  const [items, setItems] = useState<Crimebrand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CbForm>(blankForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { toast } = useToast()
  const [charOptions, setCharOptions] = useState<CharOption[]>([])
  const [charSearch, setCharSearch] = useState('')
  const [charDropOpen, setCharDropOpen] = useState(false)

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    supabase.from('characters').select('id,name,portrait_url').order('name')
      .then(({ data }) => setCharOptions(data || []))
  }, [])

  async function fetchItems() {
    setLoading(true)
    const { data } = await supabase
      .from('crimebrands')
      .select('*')
      .order('release_order')
    setItems(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditId(null)
    setForm(blankForm())
    setCharSearch('')
    setModalOpen(true)
  }

  function openEdit(cb: Crimebrand) {
    setEditId(cb.id)
    const effs = [1, 2, 3].map(p => {
      const e = (cb.effects || []).find(x => x.piece === p)
      return { piece: p, name: e?.name || '', min: e?.min || '', max: e?.max || '' }
    })
    const flavs = [1, 2, 3].map(p => {
      const f = (cb.flavor_texts || []).find(x => x.piece === p)
      return { piece: p, text: f?.text || '' }
    })
    setForm({
      name: cb.name || '',
      rank: cb.rank || 'B',
      icon_url: cb.icon_url || '',
      artwork_url: cb.artwork_url || '',
      source: cb.source || '',
      unreleased: cb.unreleased || false,
      release_order: cb.release_order?.toString() || '0',
      effects: effs,
      set_bonus: cb.set_bonus || '',
      note: cb.note || '',
      flavor_texts: flavs,
      recommended_char_ids: cb.recommended_char_ids || [],
    })
    setCharSearch('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast('กรุณากรอกชื่อ', 'error')
      return
    }
    setSaving(true)

    // Filter out empty effects/flavors
    const effects = form.effects.filter(e => e.name.trim())
    const flavor_texts = form.flavor_texts.filter(f => f.text.trim())

    // Auto-generate slug from name
    const autoSlug = form.name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0E00-\u0E7F\s-]/g, '')
      .replace(/\s+/g, '-')

    const payload = {
      name: form.name.trim(),
      slug: editId ? undefined : autoSlug, // don't overwrite slug on edit
      rank: form.rank,
      icon_url: form.icon_url || null,
      artwork_url: form.artwork_url || null,
      source: form.source || null,
      unreleased: form.unreleased,
      release_order: parseInt(form.release_order) || 0,
      effects,
      set_bonus: form.set_bonus || null,
      note: form.note || null,
      flavor_texts,
      recommended_char_ids: form.recommended_char_ids,
    }
    if (editId) delete payload.slug

    let error
    if (editId) {
      const res = await supabase.from('crimebrands').update(payload).eq('id', editId)
      error = res.error
    } else {
      const res = await supabase.from('crimebrands').insert(payload)
      error = res.error
    }

    if (error) {
      toast(error.message, 'error')
    } else {
      toast(editId ? 'อัปเดตสำเร็จ' : 'เพิ่มสำเร็จ', 'success')
      await fetchItems()
      setModalOpen(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('ลบ Crimebrand นี้?')) return
    setDeleting(id)
    const { error } = await supabase.from('crimebrands').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else {
      toast('ลบสำเร็จ', 'success')
      await fetchItems()
    }
    setDeleting(null)
  }

  function updateEffect(piece: number, field: keyof CbEffect, value: string) {
    setForm(f => ({
      ...f,
      effects: f.effects.map(e => e.piece === piece ? { ...e, [field]: value } : e),
    }))
  }

  function updateFlavor(piece: number, value: string) {
    setForm(f => ({
      ...f,
      flavor_texts: f.flavor_texts.map(fl => fl.piece === piece ? { ...fl, text: value } : fl),
    }))
  }

  const filtered = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ptn-text">จัดการ Crimebrands</h1>
          <p className="text-ptn-muted text-sm mt-1">{items.length} รายการ</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={15} className="mr-1.5" />
          เพิ่ม Crimebrand
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ptn-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหา..."
          className="w-full pl-8 pr-3 py-2 text-sm rounded border border-ptn-border bg-ptn-elevated text-ptn-text placeholder-ptn-muted outline-none focus:border-ptn-red"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-ptn-muted text-sm">กำลังโหลด...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(cb => {
            const rankColor = RANK_COLORS[cb.rank] || '#fff'
            return (
              <Card key={cb.id} className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-ptn-border shrink-0 bg-ptn-elevated">
                    {cb.icon_url
                      ? <img src={cb.icon_url} alt={cb.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-ptn-disabled text-xs">?</div>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-heading font-bold px-1.5 py-0.5 rounded border"
                        style={{ color: rankColor, borderColor: `${rankColor}50`, background: `${rankColor}15` }}
                      >
                        {cb.rank}
                      </span>
                      {cb.unreleased && <span className="text-xs text-ptn-disabled border border-ptn-border/50 px-1.5 py-0.5 rounded">Unreleased</span>}
                    </div>
                    <p className="font-medium text-ptn-text text-sm">{cb.name}</p>
                    {cb.source && <p className="text-xs text-ptn-muted mt-0.5 truncate">{cb.source}</p>}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(cb)}><Edit2 size={13} /></Button>
                    <Button size="sm" variant="danger" loading={deleting === cb.id} onClick={() => handleDelete(cb.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-ptn-disabled">ไม่พบรายการ</div>
          )}
        </div>
      )}

      {/* ---- Modal ---- */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'แก้ไข Crimebrand' : 'เพิ่ม Crimebrand'}
        size="xl"
      >
        <div className="space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ptn-text mb-1">ชื่อ <span className="text-ptn-red">*</span></label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Final Path" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1">Source (แหล่งที่มา)</label>
              <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Echoes of Phantasm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1">Rank</label>
              <Select value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}>
                <option value="S">S</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-1">Release Order</label>
              <Input type="number" value={form.release_order} onChange={e => setForm(f => ({ ...f, release_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="unreleased" checked={form.unreleased} onChange={e => setForm(f => ({ ...f, unreleased: e.target.checked }))} className="rounded border-ptn-border" />
              <label htmlFor="unreleased" className="text-sm text-ptn-text cursor-pointer">Unreleased</label>
            </div>
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-2">ไอคอน (Icon)</label>
              <ImageUpload
                bucket="characters"
                currentUrl={form.icon_url}
                onUpload={url => setForm(f => ({ ...f, icon_url: url }))}
                aspectRatio="square"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ptn-text mb-2">ภาพใหญ่ (Artwork)</label>
              <ImageUpload
                bucket="characters"
                currentUrl={form.artwork_url}
                onUpload={url => setForm(f => ({ ...f, artwork_url: url }))}
                aspectRatio="portrait"
              />
            </div>
          </div>

          {/* Effects */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-3">Effects (I / II / III)</p>
            <div className="space-y-3">
              {[1, 2, 3].map(piece => {
                const eff = form.effects.find(e => e.piece === piece) || { piece, name: '', min: '', max: '' }
                return (
                  <div key={piece} className="flex items-center gap-2">
                    <span className="shrink-0 font-heading font-bold text-ptn-muted w-5 text-sm">{PIECE_LABEL[piece - 1]}</span>
                    <Input
                      value={eff.name}
                      onChange={e => updateEffect(piece, 'name', e.target.value)}
                      placeholder="ชื่อ effect (เช่น Damage Up)"
                      className="flex-1"
                    />
                    <Input
                      value={eff.min}
                      onChange={e => updateEffect(piece, 'min', e.target.value)}
                      placeholder="Min (5%)"
                      className="w-20 font-mono"
                    />
                    <span className="text-ptn-muted shrink-0">→</span>
                    <Input
                      value={eff.max}
                      onChange={e => updateEffect(piece, 'max', e.target.value)}
                      placeholder="Max (10%)"
                      className="w-20 font-mono"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Set Bonus */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">Set Bonus</label>
            <Textarea value={form.set_bonus} onChange={e => setForm(f => ({ ...f, set_bonus: e.target.value }))} rows={2} placeholder="Unique: The most recent Sinner who has moved gains a 12% Magic Damage boost." />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">Note (หมายเหตุ)</label>
            <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} placeholder="หมายเหตุเพิ่มเติม เช่น วิธีใช้ หรือข้อควรระวัง..." />
          </div>

          {/* Recommended Characters */}
          <div>
            <label className="block text-sm font-medium text-ptn-text mb-1.5">
              ตัวละครที่แนะนำ
              <span className="ml-2 text-xs font-normal text-ptn-muted">({form.recommended_char_ids.length} ตัว)</span>
            </label>
            {/* Selected tags */}
            {form.recommended_char_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.recommended_char_ids.map(id => {
                  const c = charOptions.find(x => x.id === id)
                  if (!c) return null
                  return (
                    <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-ptn-border bg-ptn-elevated text-xs">
                      {c.portrait_url && (
                        <img src={c.portrait_url} className="w-4 h-4 rounded-full object-cover object-top shrink-0" />
                      )}
                      <span className="text-ptn-text">{c.name}</span>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, recommended_char_ids: f.recommended_char_ids.filter(x => x !== id) }))}
                        className="text-ptn-muted hover:text-ptn-red transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Dropdown picker */}
            <div className="relative">
              <input
                value={charSearch}
                onChange={e => { setCharSearch(e.target.value); setCharDropOpen(true) }}
                onFocus={() => setCharDropOpen(true)}
                placeholder="ค้นหาตัวละคร..."
                className="w-full px-3 py-2 rounded border border-ptn-border bg-ptn-elevated text-ptn-text text-sm outline-none focus:border-ptn-red placeholder-ptn-muted"
              />
              {charDropOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCharDropOpen(false)} />
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-ptn-border bg-ptn-surface shadow-lg">
                    {charOptions
                      .filter(c =>
                        c.name.toLowerCase().includes(charSearch.toLowerCase()) &&
                        !form.recommended_char_ids.includes(c.id)
                      )
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setForm(f => ({ ...f, recommended_char_ids: [...f.recommended_char_ids, c.id] }))
                            setCharSearch('')
                            setCharDropOpen(false)
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-ptn-elevated transition-colors"
                        >
                          {c.portrait_url ? (
                            <img src={c.portrait_url} className="w-7 h-7 rounded object-cover object-top shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded bg-ptn-elevated shrink-0 flex items-center justify-center text-xs text-ptn-disabled">{c.name[0]}</div>
                          )}
                          <span className="text-ptn-text">{c.name}</span>
                        </button>
                      ))}
                    {charOptions.filter(c =>
                      c.name.toLowerCase().includes(charSearch.toLowerCase()) &&
                      !form.recommended_char_ids.includes(c.id)
                    ).length === 0 && (
                      <p className="px-3 py-3 text-sm text-ptn-muted text-center">ไม่พบตัวละคร</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Flavor Texts */}
          <div>
            <p className="text-sm font-medium text-ptn-text mb-3">Flavor Texts</p>
            <div className="space-y-3">
              {[1, 2, 3].map(piece => {
                const fl = form.flavor_texts.find(f => f.piece === piece) || { piece, text: '' }
                return (
                  <div key={piece} className="flex items-start gap-2">
                    <span className="shrink-0 font-heading font-bold text-ptn-muted w-5 text-sm mt-2">{PIECE_LABEL[piece - 1]}</span>
                    <Textarea
                      value={fl.text}
                      onChange={e => updateFlavor(piece, e.target.value)}
                      rows={2}
                      placeholder={`Flavor text สำหรับชิ้น ${piece}...`}
                      className="flex-1"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-ptn-border">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>ยกเลิก</Button>
            <Button loading={saving} onClick={handleSave}>บันทึก</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
