import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { PageLoader } from '../../components/ui/Spinner'
import { TierCharCard } from '../../components/tier-lists/TierParts'
import { CrimebrandBadge, TeamSummaryPanel } from '../../components/teams/TeamParts'
import { useTeamCatalog, type TeamCatalog, type TeamCrimebrand } from '../../hooks/useTeamCatalog'
import { filterCharacters } from '../../lib/tierList'
import { describeWriteError } from '../../lib/moderation'
import { cn } from '../../lib/utils'
import {
  CB_PIECES, CB_PIECE_LABEL, MAX_TEAM_SIZE, TEAM_DESCRIPTION_MAX, TEAM_TITLE_MAX, addMember, hasCustomCbs, memberCrimebrands,
  moveMember, parseMembers, removeMember, setMemberBuild, setMemberCustomCb, validateTeam,
  type CustomCbSlots, type TeamMember,
} from '../../lib/team'

const RARITIES = ['S', 'A', 'B', 'C'] as const
const SLOT_INDEXES = [0, 1, 2] as const

interface Draft {
  title: string
  description: string
  isPublic: boolean
  members: TeamMember[]
}

const EMPTY_DRAFT: Draft = { title: '', description: '', isPublic: true, members: [] }

/** สร้าง / แก้ทีม — /teams/new และ /teams/:id/edit */
export function TeamEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { catalog, failed, retry } = useTeamCatalog()
  const [draft, setDraft] = useState<Draft | null>(id ? null : EMPTY_DRAFT)
  const [forbidden, setForbidden] = useState(false)
  const [saving, setSaving] = useState(false)

  // ผูกกับ id ไม่ใช่ object user — ต่ออายุ token ได้ user object ใหม่ ถ้าโหลดซ้ำตอนนั้นจะทับสิ่งที่กำลังแก้อยู่
  const userId = user?.id

  useEffect(() => {
    if (!id || !userId) return
    let active = true
    supabase.from('teams').select('author_id, title, description, is_public, members').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data || data.author_id !== userId) { setForbidden(true); return }
        setDraft({
          title: data.title,
          description: data.description ?? '',
          isPublic: data.is_public,
          members: parseMembers(data.members),
        })
      })
    return () => { active = false }
  }, [id, userId])

  if (forbidden) {
    return <div className="py-20 text-center text-ptn-muted">ไม่พบทีมนี้ หรือคุณไม่ใช่เจ้าของทีม</div>
  }
  if (failed) {
    return (
      <div className="py-20 text-center text-sm text-ptn-muted">
        โหลดข้อมูลตัวละครไม่สำเร็จ
        <div className="mt-3"><Button size="sm" variant="outline" onClick={retry}>ลองใหม่</Button></div>
      </div>
    )
  }
  if (!catalog || !draft || !user) return <PageLoader />

  const update = (patch: Partial<Draft>) => setDraft(prev => (prev ? { ...prev, ...patch } : prev))
  const setMembers = (fn: (members: TeamMember[]) => TeamMember[]) =>
    setDraft(prev => (prev ? { ...prev, members: fn(prev.members) } : prev))

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const problem = validateTeam({ title: draft.title, description: draft.description, members: draft.members })
    if (problem) { toast(problem, 'error'); return }

    setSaving(true)
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      is_public: draft.isPublic,
      members: draft.members,
      updated_at: new Date().toISOString(),
    }
    const res = id
      ? await supabase.from('teams').update(payload).eq('id', id).select('id').single()
      : await supabase.from('teams').insert({ ...payload, author_id: user.id }).select('id').single()
    setSaving(false)

    if (res.error || !res.data) { toast(describeWriteError(res.error, 'บันทึกทีมไม่สำเร็จ'), 'error'); return }
    toast(id ? 'อัปเดตทีมแล้ว' : 'บันทึกทีมแล้ว', 'success')
    navigate(`/teams/${res.data.id}`)
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-ptn-text">{id ? 'แก้ไขทีม' : 'จัดทีมใหม่'}</h1>
        <div className="flex gap-2">
          <Link to={id ? `/teams/${id}` : '/teams'}><Button type="button" variant="ghost">ยกเลิก</Button></Link>
          <Button type="submit" loading={saving}><Save size={14} /> บันทึกทีม</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <Card className="space-y-3 p-4">
            <Input
              label="ชื่อทีม"
              value={draft.title}
              onChange={e => update({ title: e.target.value })}
              maxLength={TEAM_TITLE_MAX}
              placeholder="เช่น ทีม PvE สายฟรี"
            />
            <Textarea
              label="คำอธิบาย (ไม่บังคับ)"
              value={draft.description}
              onChange={e => update({ description: e.target.value })}
              maxLength={TEAM_DESCRIPTION_MAX}
              rows={3}
              placeholder="ใช้กับด่านไหน เล่นยังไง"
            />
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ptn-text">
              <input
                type="checkbox"
                checked={draft.isPublic}
                onChange={e => update({ isPublic: e.target.checked })}
                className="accent-ptn-red"
              />
              ให้คนอื่นเห็นทีมนี้ (ถ้าปิด จะเห็นแค่คุณ และแชร์ลิงก์ให้คนอื่นไม่ได้)
            </label>
          </Card>

          <TeamSlots
            members={draft.members}
            catalog={catalog}
            onRemove={cid => setMembers(ms => removeMember(ms, cid))}
            onMove={(index, dir) => setMembers(ms => moveMember(ms, index, dir))}
            onBuild={(cid, buildId) => setMembers(ms => setMemberBuild(ms, cid, buildId))}
            onCustomCbs={(cid, slots) => setMembers(ms =>
              SLOT_INDEXES.reduce((acc, i) => setMemberCustomCb(acc, cid, i, slots[i]), ms))}
          />

          <CharacterPicker
            catalog={catalog}
            members={draft.members}
            onPick={cid => setMembers(ms => addMember(ms, cid))}
          />
        </div>

        <div className="md:sticky md:top-20 md:self-start">
          <TeamSummaryPanel members={draft.members} catalog={catalog} />
        </div>
      </div>
    </form>
  )
}

function TeamSlots({ members, catalog, onRemove, onMove, onBuild, onCustomCbs }: {
  members: readonly TeamMember[]
  catalog: TeamCatalog
  onRemove: (characterId: string) => void
  onMove: (index: number, dir: -1 | 1) => void
  onBuild: (characterId: string, buildId: string | null) => void
  onCustomCbs: (characterId: string, slots: CustomCbSlots) => void
}) {
  // ตัวที่อยู่โหมดเลือกเอง — จำไว้แยก เพราะเพิ่งสลับมาช่องยังว่างหมดก็ต้องยังอยู่โหมดนี้
  const [customIds, setCustomIds] = useState(() => new Set(members.filter(hasCustomCbs).map(m => m.character_id)))
  const empty = MAX_TEAM_SIZE - members.length

  const switchToCustom = (member: TeamMember) => {
    setCustomIds(prev => new Set(prev).add(member.character_id))
    // เริ่มจาก build แนะนำที่เลือกไว้ (ถ้ามี) แล้วค่อยปรับเอง
    const { slots } = memberCrimebrands(member, catalog.buildById)
    const start = SLOT_INDEXES.map(i => {
      const s = slots.find(x => x.position === i)
      return s ? { cb_id: s.cb_id, piece: s.piece ?? 1 } : null
    })
    onCustomCbs(member.character_id, [start[0], start[1], start[2]])
  }

  const leaveCustom = (characterId: string) => setCustomIds(prev => {
    const next = new Set(prev)
    next.delete(characterId)
    return next
  })

  const switchToBuild = (member: TeamMember) => {
    leaveCustom(member.character_id)
    onBuild(member.character_id, null)
  }

  // เอาออกแล้วเพิ่มกลับ ต้องเริ่มที่โหมด build แนะนำใหม่
  const remove = (characterId: string) => {
    leaveCustom(characterId)
    onRemove(characterId)
  }

  return (
    <section aria-label="ตัวละครในทีม" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {members.map((member, index) => {
        const char = catalog.charById.get(member.character_id)
        const builds = catalog.buildsByChar.get(member.character_id) ?? []
        const custom = customIds.has(member.character_id) || hasCustomCbs(member)
        const { buildName, slots } = memberCrimebrands(member, catalog.buildById)
        const charName = char?.name ?? 'ตัวละคร'
        return (
          <Card key={member.character_id} className="flex flex-col gap-2 p-2">
            <div className="flex items-start gap-2">
              {char ? <TierCharCard char={char} /> : <span className="text-xs text-ptn-muted">ตัวละครถูกลบ</span>}
              <div className="ml-auto flex flex-col gap-1">
                <button type="button" onClick={() => remove(member.character_id)} aria-label="เอาออกจากทีม"
                  className="rounded p-1 text-ptn-muted hover:text-ptn-red"><X size={14} /></button>
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label="เลื่อนไปทางซ้าย"
                  className="rounded p-1 text-ptn-muted hover:text-ptn-text disabled:opacity-30"><ChevronLeft size={14} /></button>
                <button type="button" onClick={() => onMove(index, 1)} disabled={index === members.length - 1}
                  aria-label="เลื่อนไปทางขวา"
                  className="rounded p-1 text-ptn-muted hover:text-ptn-text disabled:opacity-30"><ChevronRight size={14} /></button>
              </div>
            </div>
            <div role="group" aria-label={`วิธีเลือก Crimebrand ของ ${charName}`} className="grid grid-cols-2 gap-1">
              {([['build แนะนำ', false], ['เลือกเอง', true]] as const).map(([label, isCustom]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={custom === isCustom}
                  onClick={() => { if (custom !== isCustom) (isCustom ? switchToCustom : switchToBuild)(member) }}
                  className={cn('rounded border px-1.5 py-0.5 text-[11px]',
                    custom === isCustom ? 'border-ptn-red bg-ptn-red/15 text-ptn-text' : 'border-ptn-border text-ptn-muted')}
                >
                  {label}
                </button>
              ))}
            </div>
            {custom ? (
              <CustomCbPicker
                slots={member.custom_cbs}
                crimebrands={catalog.crimebrands}
                charName={charName}
                onChange={next => onCustomCbs(member.character_id, next)}
              />
            ) : (
              <select
                value={member.build_id ?? ''}
                onChange={e => onBuild(member.character_id, e.target.value || null)}
                aria-label={`Crimebrand build ของ ${charName}`}
                className="w-full rounded border border-ptn-border bg-ptn-elevated px-2 py-1 text-xs text-ptn-text"
              >
                <option value="">{builds.length ? 'ไม่ระบุ Crimebrand' : 'ยังไม่มี build ในวิกิ'}</option>
                {builds.map(b => <option key={b.id} value={b.id}>{b.build_name}</option>)}
              </select>
            )}
            {slots.length > 0 && <CrimebrandBadge buildName={buildName} slots={slots} cbById={catalog.cbById} />}
          </Card>
        )
      })}
      {Array.from({ length: empty }, (_, i) => (
        <div key={`empty-${i}`}
          className="flex min-h-[7rem] items-center justify-center rounded-lg border border-dashed border-ptn-border text-xs text-ptn-disabled">
          ว่าง
        </div>
      ))}
    </section>
  )
}

/** เลือก Crimebrand เอง 3 ช่อง จาก Crimebrand ทั้งหมดในเว็บ ไม่ผูกกับตัวละคร */
function CustomCbPicker({ slots, crimebrands, charName, onChange }: {
  slots: CustomCbSlots
  crimebrands: readonly TeamCrimebrand[]
  charName: string
  onChange: (next: CustomCbSlots) => void
}) {
  const ranks = [...new Set(crimebrands.map(cb => cb.rank))]
  const setSlot = (index: 0 | 1 | 2, cbId: string, piece: number) => {
    const next = [...slots] as [CustomCbSlots[0], CustomCbSlots[1], CustomCbSlots[2]]
    next[index] = cbId ? { cb_id: cbId, piece } : null
    onChange(next)
  }

  return (
    <div className="space-y-1">
      {SLOT_INDEXES.map(i => {
        const slot = slots[i]
        const label = CB_PIECE_LABEL[i]
        return (
          <div key={i} className="flex items-center gap-1">
            <span className="w-4 shrink-0 font-mono text-[10px] text-ptn-disabled">{label}</span>
            <select
              value={slot?.cb_id ?? ''}
              onChange={e => setSlot(i, e.target.value, slot?.piece ?? 1)}
              aria-label={`Crimebrand ช่อง ${label} ของ ${charName}`}
              className="min-w-0 flex-1 rounded border border-ptn-border bg-ptn-elevated px-1 py-0.5 text-[11px] text-ptn-text"
            >
              <option value="">— ว่าง —</option>
              {ranks.map(rank => (
                <optgroup key={rank} label={`แรงก์ ${rank}`}>
                  {crimebrands.filter(cb => cb.rank === rank).map(cb => (
                    <option key={cb.id} value={cb.id}>{cb.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={slot?.piece ?? 1}
              onChange={e => slot && setSlot(i, slot.cb_id, Number(e.target.value))}
              disabled={!slot}
              aria-label={`ชิ้นของ Crimebrand ช่อง ${label} ของ ${charName}`}
              className="w-12 shrink-0 rounded border border-ptn-border bg-ptn-elevated px-1 py-0.5 text-[11px] text-ptn-text disabled:opacity-40"
            >
              {CB_PIECES.map(p => <option key={p} value={p}>{CB_PIECE_LABEL[p - 1]}</option>)}
            </select>
          </div>
        )
      })}
    </div>
  )
}

function CharacterPicker({ catalog, members, onPick }: {
  catalog: TeamCatalog
  members: readonly TeamMember[]
  onPick: (characterId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState('')
  const inTeam = new Set(members.map(m => m.character_id))
  const full = members.length >= MAX_TEAM_SIZE
  const shown = filterCharacters(catalog.characters.filter(c => !c.is_unreleased), { query, rarity })

  return (
    <Card className="p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ptn-text">เลือกตัวละคร</h2>
        {full && <span className="text-xs text-ptn-gold">ทีมเต็มแล้ว ({MAX_TEAM_SIZE} ตัว)</span>}
        <label className="relative ml-auto min-w-[10rem] flex-1 sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ptn-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            // อยู่ในฟอร์มบันทึกทีม — Enter ตรงนี้ต้องไม่บันทึกทีมที่ยังจัดไม่เสร็จ
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            placeholder="ค้นหาชื่อตัวละคร..."
            aria-label="ค้นหาชื่อตัวละคร"
            className="w-full rounded border border-ptn-border bg-ptn-elevated py-1.5 pl-8 pr-2 text-sm text-ptn-text"
          />
        </label>
        <div className="flex gap-1">
          {RARITIES.map(r => (
            <button key={r} type="button" onClick={() => setRarity(v => (v === r ? '' : r))} aria-pressed={rarity === r}
              className={cn('rounded border px-2 py-1 text-xs',
                rarity === r ? 'border-ptn-red bg-ptn-red/15 text-ptn-text' : 'border-ptn-border text-ptn-muted')}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex max-h-[22rem] flex-wrap gap-2 overflow-y-auto">
        {shown.map(char => {
          const picked = inTeam.has(char.id)
          return (
            <button
              key={char.id}
              type="button"
              onClick={() => onPick(char.id)}
              disabled={picked || full}
              aria-label={picked ? `${char.name} (อยู่ในทีมแล้ว)` : `เพิ่ม ${char.name} เข้าทีม`}
              className="rounded transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
            >
              <TierCharCard char={char} selected={picked} />
            </button>
          )
        })}
        {shown.length === 0 && <p className="text-xs text-ptn-muted">ไม่พบตัวละคร</p>}
      </div>
    </Card>
  )
}
