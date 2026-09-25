import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Palette, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, TierRow } from '../../types'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { TIER_COLORS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { PageLoader } from '../../components/ui/Spinner'
import {
  MAX_TIERS, MIN_TIERS, TIER_LABEL_MAX, TIER_PALETTE,
  addTier, moveTier, normalizeTiersForSave, placeCharacter, recolorTier, removeTier, renameTier, unassignedIds,
} from '../../lib/tierList'
import { TierCharCard } from '../../components/tier-lists/TierParts'
import { CharacterPool } from '../../components/tier-lists/CharacterPool'

export function TierListCreatePage() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [patchVersion, setPatchVersion] = useState('')
  const [isOfficial, setIsOfficial] = useState(false)
  const [tiers, setTiers] = useState<TierRow[]>(
    TIER_COLORS.map(t => ({ label: t.label, color: t.color, character_ids: [] }))
  )
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  // ลาก (จอกว้าง) กับแตะเลือก (มือถือ) ใช้ตัวละครคนละตัวแปร — แตะแล้วค่อยแตะแถวที่จะวาง
  const [dragging, setDragging] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [paletteFor, setPaletteFor] = useState<number | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: chars } = await supabase.from('characters').select('*').order('rarity').order('name')
      setCharacters(chars || [])

      if (isEdit) {
        const { data: existing } = await supabase.from('tier_lists').select('*').eq('id', id).single()
        if (existing) {
          setTitle(existing.title)
          setDescription(existing.description || '')
          setPatchVersion(existing.patch_version || '')
          setIsOfficial(existing.is_official)
          setTiers(existing.tiers as TierRow[])
        }
      }
      setInitLoading(false)
    }
    init()
  }, [id, isEdit])

  const charMap = Object.fromEntries(characters.map(c => [c.id, c]))
  const unassigned = unassignedIds(characters.map(c => c.id), tiers)
    .map(cid => charMap[cid])
    .filter((c): c is Character => !!c)

  const place = (charId: string, tierIndex: number) => {
    setTiers(prev => placeCharacter(prev, charId, tierIndex))
    setSelected(null)
  }

  const toggleSelect = (charId: string) => setSelected(prev => (prev === charId ? null : charId))

  const dropOnTier = (tierIndex: number) => {
    const charId = dragging ?? selected
    if (charId) place(charId, tierIndex)
  }

  const handleSave = async () => {
    if (!title.trim()) { toast('กรุณากรอกชื่อเทียร์ลิสต์', 'error'); return }
    setLoading(true)

    const payload = {
      author_id: user!.id,
      title: title.trim(),
      description: description.trim() || null,
      patch_version: patchVersion.trim() || null,
      is_official: isAdmin && isOfficial,
      tiers: normalizeTiersForSave(tiers),
      updated_at: new Date().toISOString(),
    }

    let error
    if (isEdit) {
      const res = await supabase.from('tier_lists').update(payload).eq('id', id)
      error = res.error
    } else {
      const res = await supabase.from('tier_lists').insert(payload as never).select('id').single()
      error = res.error
      if (!error && res.data) navigate(`/tier-lists/${(res.data as { id: string }).id}`)
    }

    setLoading(false)
    if (error) {
      toast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      toast('บันทึกสำเร็จ!', 'success')
      if (isEdit) navigate(`/tier-lists/${id}`)
    }
  }

  if (initLoading) return <PageLoader />

  const selectedChar = selected ? charMap[selected] : null

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      {/* ปุ่มบันทึกอยู่บนสุด — แผงตัวละครที่ติดขอบล่างจอจะได้ไม่บังปุ่ม */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">
          {isEdit ? 'แก้ไขเทียร์ลิสต์' : 'สร้างเทียร์ลิสต์ใหม่'}
        </h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate('/tier-lists')}>ยกเลิก</Button>
          <Button onClick={handleSave} loading={loading}>
            <Save size={16} /> บันทึก
          </Button>
        </div>
      </div>

      {/* Meta */}
      <Card className="p-4 mb-6 grid sm:grid-cols-3 gap-4">
        <Input label="ชื่อเทียร์ลิสต์" value={title} onChange={e => setTitle(e.target.value)} placeholder="ชื่อเทียร์ลิสต์..." />
        <Input label="เวอร์ชัน Patch" value={patchVersion} onChange={e => setPatchVersion(e.target.value)} placeholder="เช่น 3.0" />
        {isAdmin && (
          <div className="flex flex-col gap-1 justify-end">
            <label className="text-sm font-medium text-ptn-muted">ประเภท</label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isOfficial}
                onChange={e => setIsOfficial(e.target.checked)}
                className="accent-ptn-red"
              />
              <span className="text-sm text-ptn-text">เทียร์ลิสต์ทางการ</span>
            </label>
          </div>
        )}
        <div className="sm:col-span-3">
          <Textarea label="คำอธิบาย (ไม่บังคับ)" value={description} onChange={e => setDescription(e.target.value)} placeholder="อธิบายเทียร์ลิสต์ของคุณ..." rows={2} />
        </div>
      </Card>

      <p className="mb-2 text-xs text-ptn-disabled">
        ลากตัวละครไปวางในแถว หรือแตะตัวละครแล้วแตะแถวที่ต้องการ · แก้ชื่อระดับได้ที่ช่องซ้ายสุด (ไม่เกิน {TIER_LABEL_MAX} ตัวอักษร)
      </p>

      {/* Tier Editor */}
      <div className="space-y-2">
        {tiers.map((tier, tierIndex) => (
          <div key={tierIndex} className="flex items-stretch rounded-lg border border-ptn-border overflow-hidden">
            {/* ชื่อระดับ + ปุ่มจัดการแถว */}
            <div
              className="relative flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 px-1.5 py-2 sm:w-28"
              style={{ background: `${tier.color}20`, borderRight: `2px solid ${tier.color}40` }}
            >
              <input
                value={tier.label}
                onChange={e => setTiers(prev => renameTier(prev, tierIndex, e.target.value))}
                aria-label={`ชื่อระดับแถวที่ ${tierIndex + 1}`}
                className="w-full rounded bg-black/20 px-1 py-1 text-center font-heading text-base font-bold outline-none focus:bg-black/40 focus:ring-1 focus:ring-white/30"
                style={{ color: tier.color }}
              />
              <div className="flex items-center gap-0.5 text-ptn-muted">
                <button type="button" onClick={() => setPaletteFor(p => (p === tierIndex ? null : tierIndex))} aria-label="เปลี่ยนสี" className="rounded p-1 hover:bg-black/30 hover:text-ptn-text">
                  <Palette size={13} />
                </button>
                <button type="button" onClick={() => { setTiers(prev => moveTier(prev, tierIndex, -1)); setPaletteFor(null) }} disabled={tierIndex === 0} aria-label="เลื่อนขึ้น" className="rounded p-1 hover:bg-black/30 hover:text-ptn-text disabled:opacity-30">
                  <ArrowUp size={13} />
                </button>
                <button type="button" onClick={() => { setTiers(prev => moveTier(prev, tierIndex, 1)); setPaletteFor(null) }} disabled={tierIndex === tiers.length - 1} aria-label="เลื่อนลง" className="rounded p-1 hover:bg-black/30 hover:text-ptn-text disabled:opacity-30">
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const count = tier.character_ids.filter(cid => charMap[cid]).length
                    if (count > 0 && !confirm(`ลบแถว "${tier.label}"? ตัวละคร ${count} ตัวในแถวนี้จะกลับไปรายการที่ยังไม่จัดอันดับ`)) return
                    setTiers(prev => removeTier(prev, tierIndex))
                    setPaletteFor(null)
                  }}
                  disabled={tiers.length <= MIN_TIERS}
                  aria-label="ลบแถว"
                  className="rounded p-1 hover:bg-black/30 hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {paletteFor === tierIndex && (
                <>
                <button type="button" aria-label="ปิดจานสี" className="fixed inset-0 z-20 cursor-default" onClick={() => setPaletteFor(null)} />
                <div
                  className="absolute left-full top-1 z-30 ml-1 grid w-[9.75rem] grid-cols-5 gap-1 rounded border border-ptn-border bg-ptn-surface p-1.5 shadow-ptn-card"
                  onKeyDown={e => { if (e.key === 'Escape') setPaletteFor(null) }}
                >
                  {TIER_PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setTiers(prev => recolorTier(prev, tierIndex, c)); setPaletteFor(null) }}
                      aria-label={`สี ${c}`}
                      className={cn('h-6 w-6 shrink-0 rounded-full border-2', tier.color === c ? 'border-white' : 'border-transparent')}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                </>
              )}
            </div>

            {/* ตัวละครในแถว — แตะพื้นที่ว่างเพื่อวางตัวที่เลือกอยู่ */}
            <div
              className={cn(
                'flex min-h-[104px] flex-1 flex-wrap content-start gap-2 bg-ptn-surface p-3',
                (selected || dragging) && 'cursor-copy hover:bg-ptn-elevated/60',
              )}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); dropOnTier(tierIndex) }}
              onClick={e => { if (e.target === e.currentTarget && selected) dropOnTier(tierIndex) }}
            >
              {tier.character_ids.map(cid => {
                const char = charMap[cid]
                if (!char) return null
                return (
                  <div key={cid} className="group relative">
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragging(cid)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => toggleSelect(cid)}
                      aria-pressed={selected === cid}
                      className="cursor-grab rounded active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ptn-cyan"
                    >
                      <TierCharCard char={char} selected={selected === cid} />
                    </button>
                    <button
                      type="button"
                      onClick={() => place(cid, -1)}
                      aria-label={`เอา ${char.name} ออกจากแถว`}
                      className={cn(
                        'absolute -right-2 -top-2 rounded-full bg-red-600 p-1.5 text-white transition-opacity',
                        selected === cid ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
                      )}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
              {selectedChar && !tier.character_ids.includes(selectedChar.id) && (
                <button
                  type="button"
                  onClick={() => dropOnTier(tierIndex)}
                  className="flex h-[68px] min-w-[3.5rem] items-center justify-center gap-1 self-start rounded border border-dashed border-ptn-cyan/50 px-2 text-xs text-ptn-cyan hover:bg-ptn-cyan/10 sm:h-20"
                >
                  <Plus size={12} /> วางที่นี่
                </button>
              )}
              {tier.character_ids.length === 0 && !selectedChar && (
                <p className="pointer-events-none self-center text-xs text-ptn-disabled">ลากหรือแตะตัวละครมาวางที่นี่</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {tiers.length < MAX_TIERS && (
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTiers(prev => addTier(prev))}>
          <Plus size={14} /> เพิ่มแถวระดับ
        </Button>
      )}

      {/* แถบบอกตัวที่เลือกอยู่ (แตะเพื่อวาง) — ลอยใต้แถบเมนูด้านบน */}
      {selectedChar && (
        <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-ptn-cyan/40 bg-ptn-surface px-3 py-1.5 text-xs text-ptn-text shadow-ptn-card">
          เลือก <span className="font-bold text-ptn-cyan">{selectedChar.name}</span> อยู่ — แตะแถวที่จะวาง
          <button type="button" onClick={() => setSelected(null)} className="text-ptn-muted hover:text-ptn-text" aria-label="ยกเลิกการเลือก">
            <X size={12} />
          </button>
        </div>
      )}

      <CharacterPool
        characters={unassigned}
        total={characters.length}
        selected={selected}
        onSelect={toggleSelect}
        onDragStart={setDragging}
        onDragEnd={() => setDragging(null)}
        onDropHere={() => { const cid = dragging ?? selected; if (cid) place(cid, -1) }}
        selectedInTier={!!selected && !unassigned.some(c => c.id === selected)}
      />
    </div>
  )
}
