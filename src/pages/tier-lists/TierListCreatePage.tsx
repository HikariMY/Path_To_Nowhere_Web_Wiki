import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Palette, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, TierListMeta, TierRow } from '../../types'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { TIER_COLORS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { PageLoader } from '../../components/ui/Spinner'
import {
  CHAR_NOTE_MAX, MAX_TIERS, MIN_TIERS, TIER_LABEL_MAX, TIER_NOTE_MAX, TIER_PALETTE,
  addTier, buildMetaPayload, charsInColumn, clampColumns, findPlacement, moveTier, normalizeTiersForSave,
  parseRoleColumns, placeCharacter, readTierListMeta, recolorTier, removeTier, renameTier, setTierNote,
  toggleCharMark, unassignedIds, updateCharDetail,
} from '../../lib/tierList'
import { TIER_MARKS } from '../../lib/tierMarks'
import { TierCharCard, TierMarkBadge } from '../../components/tier-lists/TierParts'
import { CharacterPool } from '../../components/tier-lists/CharacterPool'
import { describeWriteError } from '../../lib/moderation'

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
  // รายละเอียดแบบเทียร์ลิสต์จีน — originalMeta ไว้รู้ว่าช่องไหนเคยตั้งค่า (ตอนแก้ต้องส่งไปล้าง)
  const [meta, setMeta] = useState<TierListMeta>(() => readTierListMeta({}))
  const [originalMeta, setOriginalMeta] = useState<TierListMeta>(() => readTierListMeta({}))
  const [columnsText, setColumnsText] = useState('')

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
          const loaded = readTierListMeta(existing as Record<string, unknown>)
          setMeta(loaded)
          setOriginalMeta(loaded)
          setColumnsText(loaded.roleColumns.join(', '))
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

  const cols = meta.roleColumns

  // แตะวางแล้วยังเลือกตัวนั้นค้างไว้ จะได้ใส่เครื่องหมาย/หมายเหตุต่อได้ทันที (ลากวางไม่ค้าง เหมือนเดิม)
  const place = (charId: string, tierIndex: number, col?: number, keepSelected = false) => {
    setTiers(prev => placeCharacter(prev, charId, tierIndex, cols.length > 1 ? col : undefined))
    setSelected(keepSelected && tierIndex >= 0 ? charId : null)
  }

  const toggleSelect = (charId: string) => setSelected(prev => (prev === charId ? null : charId))

  const dropOnTier = (tierIndex: number, col?: number) => {
    const charId = dragging ?? selected
    if (charId) place(charId, tierIndex, col, !dragging)
  }

  const applyColumns = (text: string) => {
    const next = parseRoleColumns(text)
    setMeta(m => ({ ...m, roleColumns: next }))
    setTiers(prev => clampColumns(prev, next.length))
  }

  const toggleLegend = (key: TierListMeta['legend'][number]) =>
    setMeta(m => ({ ...m, legend: m.legend.includes(key) ? m.legend.filter(k => k !== key) : [...m.legend, key] }))

  const setSource = (patch: Partial<NonNullable<TierListMeta['source']>>) =>
    setMeta(m => {
      const next = { title: '', author: '', url: '', ...m.source, ...patch }
      return { ...m, source: next.title || next.author || next.url || next.original_url ? next : null }
    })

  const handleSave = async () => {
    if (!title.trim()) { toast('กรุณากรอกชื่อเทียร์ลิสต์', 'error'); return }
    // เครดิตต้นฉบับต้องครบ (ชื่อ ผู้เขียน ลิงก์ https) ไม่งั้นไม่บันทึกเครดิต
    const src = meta.source
    if (src && (!src.title.trim() || !src.author.trim() || !/^https?:\/\//i.test(src.url.trim()))) {
      toast('เครดิตต้นฉบับต้องมีชื่อ ผู้เขียน และลิงก์ที่ขึ้นต้นด้วย https://', 'error')
      return
    }
    setLoading(true)

    const cleanMeta: TierListMeta = {
      ...meta,
      // ช่องที่แอดมินเท่านั้นตั้งได้ — ผู้ใช้ทั่วไปคงค่าเดิมไว้
      server: isAdmin ? meta.server : originalMeta.server,
      isArchived: isAdmin ? meta.isArchived : originalMeta.isArchived,
      source: isAdmin && src
        ? { ...src, title: src.title.trim(), author: src.author.trim(), url: src.url.trim(), original_url: src.original_url?.trim() || undefined }
        : isAdmin ? null : originalMeta.source,
    }
    const payload = {
      author_id: user!.id,
      title: title.trim(),
      description: description.trim() || null,
      patch_version: patchVersion.trim() || null,
      is_official: isAdmin && isOfficial,
      tiers: normalizeTiersForSave(tiers),
      updated_at: new Date().toISOString(),
      ...buildMetaPayload(cleanMeta, originalMeta),
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
      toast(describeWriteError(error, 'บันทึกไม่สำเร็จ'), 'error')
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

      {/* รายละเอียดแบบเทียร์ลิสต์จีน: คอลัมน์ตามบทบาท + เครื่องหมาย (+ ตัวเลือกแอดมิน) */}
      <Card className="p-4 mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Input
            label="คอลัมน์ตามบทบาท (ไม่บังคับ)"
            value={columnsText}
            onChange={e => setColumnsText(e.target.value)}
            onBlur={e => applyColumns(e.target.value)}
            placeholder="เช่น Damage, Support"
          />
          <p className="mt-1 text-xs text-ptn-disabled">คั่นด้วยจุลภาค 2–4 คอลัมน์ · เว้นว่าง = ไม่แบ่ง</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-ptn-muted">เครื่องหมายที่ใช้ (แสดงในคำอธิบาย)</p>
          <div className="flex flex-wrap gap-1.5">
            {TIER_MARKS.map(m => (
              <button
                key={m.key}
                type="button"
                title={m.th}
                aria-pressed={meta.legend.includes(m.key)}
                onClick={() => toggleLegend(m.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors',
                  meta.legend.includes(m.key) ? 'border-ptn-red/60 bg-ptn-red/10 text-ptn-text' : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
                )}
              >
                <TierMarkBadge mark={m.key} /> {m.label}
              </button>
            ))}
          </div>
        </div>
        {isAdmin && (
          <div className="sm:col-span-2 grid gap-4 border-t border-ptn-border pt-4 sm:grid-cols-3">
            <p className="sm:col-span-3 text-xs font-bold uppercase tracking-wider text-ptn-muted">ตัวเลือกแอดมิน</p>
            <Select label="เซิร์ฟ" value={meta.server} onChange={e => setMeta(m => ({ ...m, server: e.target.value === 'cn' ? 'cn' : 'global' }))}>
              <option value="global">Global</option>
              <option value="cn">ข้อมูลเซิร์ฟจีน</option>
            </Select>
            <div className="flex flex-col justify-end gap-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={meta.isArchived} onChange={e => setMeta(m => ({ ...m, isArchived: e.target.checked }))} className="accent-ptn-red" />
                <span className="text-sm text-ptn-text">แพทช์ก่อนหน้า (เก็บไว้ดูย้อนหลัง)</span>
              </label>
            </div>
            <div />
            <Input label="ชื่อต้นฉบับ (ถ้าสรุปจากที่อื่น)" value={meta.source?.title ?? ''} onChange={e => setSource({ title: e.target.value })} placeholder="เช่น 角色强度榜 (BWIKI)" />
            <Input label="ผู้เขียนต้นฉบับ" value={meta.source?.author ?? ''} onChange={e => setSource({ author: e.target.value })} />
            <Input label="วันที่ต้นฉบับ" type="date" value={meta.source?.date ?? ''} onChange={e => setSource({ date: e.target.value })} />
            <div className="sm:col-span-2">
              <Input label="ลิงก์ต้นฉบับ" value={meta.source?.url ?? ''} onChange={e => setSource({ url: e.target.value })} placeholder="https://wiki.biligame.com/wqmt/..." />
            </div>
            <Input label="ลิงก์โพสต์ต้นฉบับ (ไม่บังคับ)" value={meta.source?.original_url ?? ''} onChange={e => setSource({ original_url: e.target.value })} placeholder="https://..." />
            <p className="sm:col-span-3 text-xs text-ptn-disabled">สรุปจากเซิร์ฟจีน: ใส่เครดิตทุกครั้ง จัดตำแหน่งและเขียนหมายเหตุเอง ห้ามนำภาพต้นฉบับมาแสดงซ้ำ</p>
          </div>
        )}
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

            {/* ตัวละครในแถว — หมายเหตุแถว + ช่องตามคอลัมน์ (แตะพื้นที่ว่างเพื่อวางตัวที่เลือกอยู่) */}
            <div className="flex min-w-0 flex-1 flex-col bg-ptn-surface">
              <input
                value={tier.note ?? ''}
                onChange={e => setTiers(prev => setTierNote(prev, tierIndex, e.target.value))}
                maxLength={TIER_NOTE_MAX}
                placeholder="หมายเหตุแถว (ไม่บังคับ) เช่น ใช้ได้ทุกโหมด"
                aria-label={`หมายเหตุแถว ${tier.label}`}
                className="mx-3 mt-2 rounded bg-black/20 px-2 py-1 text-xs text-ptn-text outline-none placeholder:text-ptn-disabled focus:bg-black/40 focus:ring-1 focus:ring-white/20"
              />
              <div className={cn('flex-1', cols.length > 1 && 'grid sm:grid-flow-col sm:auto-cols-fr')}>
                {(cols.length > 1 ? cols : ['']).map((col, ci) => {
                  const ids = charsInColumn(tier, ci, cols.length)
                  const canDropHere = !!selectedChar && !ids.includes(selectedChar.id)
                  return (
                    <div
                      key={ci}
                      className={cn(
                        'flex min-h-[96px] flex-wrap content-start gap-2 p-3',
                        ci > 0 && 'border-t border-dashed border-ptn-border/60 sm:border-l sm:border-t-0',
                        (selected || dragging) && 'cursor-copy hover:bg-ptn-elevated/60',
                      )}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); dropOnTier(tierIndex, ci) }}
                      onClick={e => { if (e.target === e.currentTarget && selected) dropOnTier(tierIndex, ci) }}
                    >
                      {col && <p className="pointer-events-none w-full font-mono text-[10px] font-bold uppercase tracking-wider text-ptn-disabled">{col}</p>}
                      {ids.map(cid => {
                        const char = charMap[cid]
                        if (!char) return null
                        const detail = tier.details?.[cid]
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
                              <TierCharCard char={char} selected={selected === cid} marks={detail?.marks} hasNote={!!detail?.note} />
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
                      {canDropHere && (
                        <button
                          type="button"
                          onClick={() => dropOnTier(tierIndex, ci)}
                          className="flex h-[68px] min-w-[3.5rem] items-center justify-center gap-1 self-start rounded border border-dashed border-ptn-cyan/50 px-2 text-xs text-ptn-cyan hover:bg-ptn-cyan/10 sm:h-20"
                        >
                          <Plus size={12} /> {tier.character_ids.includes(selectedChar.id) ? 'ย้ายมาที่นี่' : 'วางที่นี่'}
                        </button>
                      )}
                      {ids.length === 0 && !selectedChar && (
                        <p className="pointer-events-none self-center text-xs text-ptn-disabled">ลากหรือแตะตัวละครมาวางที่นี่</p>
                      )}
                    </div>
                  )
                })}
              </div>
              {selectedChar && tier.character_ids.includes(selectedChar.id) && (
                <CharDetailEditor
                  name={selectedChar.name}
                  tiers={tiers}
                  charId={selectedChar.id}
                  onToggleMark={mark => {
                    setTiers(prev => toggleCharMark(prev, selectedChar.id, mark))
                    // ใช้เครื่องหมายไหนก็ให้ขึ้นในคำอธิบายด้วย (เอาออกเองได้ที่การ์ดด้านบน)
                    setMeta(m => (m.legend.includes(mark) ? m : { ...m, legend: [...m.legend, mark] }))
                  }}
                  onNote={note => setTiers(prev => updateCharDetail(prev, selectedChar.id, { note }))}
                  onDone={() => setSelected(null)}
                />
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
          เลือก <span className="font-bold text-ptn-cyan">{selectedChar.name}</span> อยู่ —{' '}
          {unassigned.some(c => c.id === selectedChar.id) ? 'แตะแถวที่จะวาง' : 'ใส่เครื่องหมาย/หมายเหตุใต้แถว หรือแตะช่องอื่นเพื่อย้าย'}
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

/** แก้เครื่องหมายและหมายเหตุของตัวที่เลือก — แสดงใต้แถวที่ตัวนั้นอยู่ */
function CharDetailEditor({ name, tiers, charId, onToggleMark, onNote, onDone }: {
  name: string
  tiers: TierRow[]
  charId: string
  onToggleMark: (mark: TierListMeta['legend'][number]) => void
  onNote: (note: string) => void
  onDone: () => void
}) {
  const detail = findPlacement(tiers, charId)?.detail ?? {}
  const marks = detail.marks ?? []
  return (
    <div className="border-t border-ptn-border bg-ptn-elevated/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ptn-muted">รายละเอียดของ <b className="text-ptn-text">{name}</b> · แตะช่องอื่นเพื่อย้าย</p>
        <Button variant="ghost" size="sm" onClick={onDone}>เสร็จ</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIER_MARKS.map(m => (
          <button
            key={m.key}
            type="button"
            title={m.th}
            aria-pressed={marks.includes(m.key)}
            onClick={() => onToggleMark(m.key)}
            className={cn(
              'flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors',
              marks.includes(m.key) ? 'border-ptn-red/60 bg-ptn-red/10 text-ptn-text' : 'border-ptn-border text-ptn-muted hover:text-ptn-text',
            )}
          >
            <TierMarkBadge mark={m.key} /> {m.label}
          </button>
        ))}
      </div>
      <textarea
        value={detail.note ?? ''}
        onChange={e => onNote(e.target.value)}
        maxLength={CHAR_NOTE_MAX}
        rows={2}
        placeholder="เหตุผลหรือเงื่อนไข เช่น ต้องมี Shackle 4 / แรงเฉพาะทีม Umbra (แสดงเมื่อคนดูกดที่รูป)"
        aria-label={`หมายเหตุของ ${name}`}
        className="w-full rounded border border-ptn-border bg-ptn-elevated px-3 py-2 text-sm text-ptn-text outline-none placeholder:text-ptn-disabled focus:border-ptn-red focus:ring-1 focus:ring-ptn-red/30"
      />
    </div>
  )
}
