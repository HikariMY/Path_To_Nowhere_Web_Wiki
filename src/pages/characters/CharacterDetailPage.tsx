// @ts-nocheck
import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Star, Zap, Heart, Sword, Shield, ShieldCheck, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, CharacterSkill, ShackleBreak } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { RARITY_COLORS, JOB_CLASS_LABEL, ALIGNMENT_LABEL, ALIGNMENT_ICON, TENDENCY_ICON } from '../../lib/constants'
import { formatDate } from '../../lib/utils'
import { useAbilityTags } from '../../hooks/useAbilityTags'
import type { TagGroup } from '../../lib/abilityTags'
import { Modal } from '../../components/ui/Modal'

// ---- Tabs ----------------------------------------------------------------

const TABS = [
  { id: 'info',     label: 'ข้อมูล' },
  { id: 'skills',   label: 'สกิล' },
  { id: 'shackles', label: 'Shackles' },
  { id: 'story',    label: 'เรื่องราว' },
]

// ---- Shackle icon --------------------------------------------------------

const SHACKLE_COLORS = [
  '#64748b', // S1 slate
  '#22c55e', // S2 green
  '#3b82f6', // S3 blue
  '#a855f7', // S4 purple
  '#f59e0b', // S5 amber
  '#ef4444', // S6 red
]

function ShackleIcon({ stage, iconUrl }: { stage: number; iconUrl?: string }) {
  const color = SHACKLE_COLORS[(stage - 1) % SHACKLE_COLORS.length]
  if (iconUrl) {
    return (
      <img src={iconUrl} alt={`S${stage}`} className="shrink-0 w-10 h-10 rounded object-contain border border-ptn-border" />
    )
  }
  return (
    <div
      className="shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center font-heading font-bold text-sm"
      style={{ borderColor: color, color }}
    >
      S{stage}
    </div>
  )
}

// ---- Tags info modal -------------------------------------------------------

function TagsInfoModal({ open, onClose, tags, groups, descriptions }: { open: boolean; onClose: () => void; tags: string[]; groups: TagGroup[]; descriptions: Record<string, string> }) {
  function getDesc(tag: string) {
    return descriptions[tag] ?? '—'
  }

  const grouped = groups
    .map(group => ({
      group,
      items: tags.filter(t => group.tags.includes(t)),
    }))
    .filter(g => g.items.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Ability Tags" size="md">
      <div className="space-y-5">
        {grouped.map(({ group, items }) => (
          <div key={group.label}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2.5" style={{ color: group.text }}>
              {group.label}
            </p>
            <div className="space-y-3">
              {items.map(tag => (
                <div key={tag}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded border font-mono font-semibold"
                      style={{ background: group.bg, borderColor: group.border, color: group.text }}
                    >
                      {tag}
                    </span>
                  </div>
                  <p className="text-sm text-ptn-muted leading-relaxed pl-0.5">
                    {getDesc(tag)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ---- helpers -------------------------------------------------------------

const ORDINAL = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th']

function tagStyle(tag: string) {
  const t = tag.toLowerCase()
  if (t === 'ultimate')           return 'bg-amber-500/20 text-amber-400 border-amber-500/40'
  if (t.includes('energy'))       return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
  if (t.includes('core damage'))  return 'bg-red-500/20 text-red-400 border-red-500/40'
  if (t === 'passive')            return 'bg-zinc-600/30 text-zinc-400 border-zinc-600/40'
  return 'bg-zinc-700/40 text-zinc-300 border-zinc-600/40'
}

// ---- RangeGrid -----------------------------------------------------------

function RangeGrid({ range }: { range: { rows: number; cols: number; cells: number[] } }) {
  // cell size: smaller for 5×5, normal for ≤4 cols
  const cellSize = range.cols >= 5 ? '1.4rem' : '1.75rem'
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-black/40 border-b border-ptn-border">
      <span className="text-[10px] tracking-widest text-ptn-disabled font-mono shrink-0">RANGE</span>
      <div
        className="inline-grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${range.cols}, ${cellSize})` }}
      >
        {range.cells.map((cell, i) => (
          <div
            key={i}
            style={{ width: cellSize, height: cellSize }}
            className={`border flex items-center justify-center rounded-sm ${
              cell === 2
                ? 'bg-red-800/90 border-red-500'
                : cell === 1
                  ? 'bg-zinc-600/70 border-zinc-500'
                  : 'bg-zinc-900/50 border-zinc-700/50'
            }`}
          >
            {cell === 2 && (
              <div className="w-2 h-2 rounded-full bg-red-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- ExclusiveCrimebrandCard --------------------------------------------

function ExclusiveCrimebrandCard({ data }: { data: {
  name: string; image_url: string; description: string; flavor_text: string; hasRange: boolean; range: { rows: number; cols: number; cells: number[] }
} }) {
  const cellSize = data.range?.cols >= 5 ? '1.4rem' : '1.75rem'
  return (
    <div className="border border-amber-500/30 rounded-lg overflow-hidden bg-ptn-surface">
      {/* Heading */}
      <div className="px-4 py-2.5 bg-amber-900/20 border-b border-amber-500/20">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">EXCLUSIVE CRIMEBRAND</h3>
      </div>
      <div className="flex flex-col md:flex-row">
        {/* Left — artwork */}
        {data.image_url && (
          <div className="shrink-0 md:w-52 border-b md:border-b-0 md:border-r border-ptn-border overflow-hidden">
            <img src={data.image_url} alt={data.name} className="w-full h-full object-cover" />
          </div>
        )}
        {/* Right — details */}
        <div className="flex-1 p-4 space-y-3">
          <div>
            <p className="font-heading font-bold text-xl text-ptn-text leading-tight">{data.name}</p>
            <p className="text-xs text-amber-400/60 uppercase tracking-wider mt-0.5">Exclusive Crimebrand</p>
          </div>
          {data.hasRange && data.range?.cells?.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] tracking-widest text-ptn-disabled font-mono shrink-0">RANGE</span>
              <div
                className="inline-grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${data.range.cols}, ${cellSize})` }}
              >
                {data.range.cells.map((cell, i) => (
                  <div
                    key={i}
                    style={{ width: cellSize, height: cellSize }}
                    className={`border flex items-center justify-center rounded-sm ${
                      cell === 2
                        ? 'bg-red-800/90 border-red-500'
                        : cell === 1
                          ? 'bg-zinc-600/70 border-zinc-500'
                          : 'bg-zinc-900/50 border-zinc-700/50'
                    }`}
                  >
                    {cell === 2 && <div className="w-2 h-2 rounded-full bg-red-400" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.description && (
            <p className="text-sm text-ptn-muted leading-relaxed whitespace-pre-line">{data.description}</p>
          )}
          {data.flavor_text && (
            <p className="text-xs text-ptn-disabled/80 italic leading-relaxed border-t border-ptn-border pt-3">
              "{data.flavor_text}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- SkillCard -----------------------------------------------------------

const HL_CLASS = 'text-ptn-cyan font-medium'
const NUM_RE = /\d+(?:\.\d+)?%?/g

/**
 * ดึง "ตัวเลขสเกล" ออกจากค่าของหนึ่งเลเวล โดยคืนเป็นลำดับ (slot)
 * รองรับหลายรูปแบบ:
 *   "128%, 256%, 512%, 128%"               → ["128%","256%","512%","128%"]
 *   "ตัวคูณความเสียหายเพิ่มขึ้นเป็น 80%"      → ["80%"]
 *   "ตัวคูณ...เป็น 400%. | 25%"             → ["400%","25%"]
 * แต่ละ segment (คั่นด้วย , หรือ |) จะเอาเลข % ตัวสุดท้าย ถ้าไม่มี % ก็เอาเลขตัวสุดท้าย
 */
function levelSlotValues(levelStr: string): string[] {
  if (!levelStr) return []
  return levelStr.split(/[,|]/).map(seg => {
    const pct = seg.match(/\d+(?:\.\d+)?%/g)
    if (pct) return pct[pct.length - 1]
    const num = seg.match(/\d+(?:\.\d+)?/g)
    return num ? num[num.length - 1] : ''
  })
}

/**
 * โหมด manual: ผู้เขียนใส่ [[ ... ]] (ไฮไลต์) และ {1}/{2}/{} (ค่าตามเลเวล) เอง
 */
function renderManual(description: string, values: string[]): React.ReactNode {
  let seq = 0
  const fill = (text: string) =>
    text.replace(/\{(\d*)\}/g, (_m, num: string) => {
      const idx = num === '' ? seq++ : parseInt(num, 10) - 1
      const v = values[idx]
      return v !== undefined && v !== '' ? v : (num === '' ? '' : `{${num}}`)
    })
  const parts = description.split(/(\[\[[\s\S]*?\]\])/g)
  return parts.map((part, i) =>
    part.startsWith('[[') && part.endsWith(']]')
      ? <span key={i} className={HL_CLASS}>{fill(part.slice(2, -2))}</span>
      : <span key={i}>{fill(part)}</span>
  )
}

/**
 * โหมด auto: ตรวจหาเลขที่ตรงกับค่า LV10 ในคำอธิบาย แล้วสลับเป็นค่าของเลเวลที่กด
 *  - เลขที่อยู่ใน *( ... )  → ไฮไลต์ทั้งวงเล็บสีฟ้า
 *  - เลข inline           → ไฮไลต์เฉพาะตัวเลข
 *  - ถ้าหาเลขไม่เจอ/ไม่มีค่าเลเวล → คงข้อความเดิม (ปลอดภัย ไม่ทำให้เพี้ยน)
 */
function renderAuto(description: string, levels: string[], activeLevel: number): React.ReactNode {
  let lastIdx = -1
  for (let i = levels.length - 1; i >= 0; i--) { if (levels[i]?.trim()) { lastIdx = i; break } }
  if (lastIdx < 0) return description
  const targetNums = levelSlotValues(levels[lastIdx])         // เลขที่ปรากฏในคำอธิบาย (= ค่า LV สูงสุด)
  const activeNums = levelSlotValues(levels[activeLevel - 1] ?? '')
  if (targetNums.length === 0) return description

  // ระบุช่วงของกลุ่ม *( ... )
  const groups: { start: number; end: number }[] = []
  const gre = /\*\([^)]*\)/g
  let gm: RegExpExecArray | null
  while ((gm = gre.exec(description))) groups.push({ start: gm.index, end: gm.index + gm[0].length })

  // หาเลขแบบไม่ชนเลขซ้อน (ตัวหน้าต้องไม่ใช่หลัก/จุด)
  const findNum = (num: string, from: number) => {
    let i = description.indexOf(num, from)
    while (i !== -1) {
      const prev = i > 0 ? description[i - 1] : ''
      if (!/[\d.]/.test(prev)) return i
      i = description.indexOf(num, i + 1)
    }
    return -1
  }

  type Match = { start: number; end: number; active: string; grp?: { start: number; end: number } }
  const matches: Match[] = []
  let from = 0
  targetNums.forEach((num, k) => {
    if (!num) return
    const idx = findNum(num, from)
    if (idx === -1) return
    const end = idx + num.length
    matches.push({ start: idx, end, active: activeNums[k] || num, grp: groups.find(g => idx >= g.start && end <= g.end) })
    from = end
  })
  if (matches.length === 0) return description

  // สร้างช่วงที่ต้อง render พิเศษ (ไฮไลต์) — รวมเลขที่อยู่ในกลุ่มเดียวกัน
  type Special = { start: number; end: number; node: React.ReactNode }
  const specials: Special[] = []
  const groupMatches = new Map<{ start: number; end: number }, Match[]>()
  for (const m of matches) {
    if (m.grp) { (groupMatches.get(m.grp) ?? groupMatches.set(m.grp, []).get(m.grp)!).push(m) }
    else specials.push({ start: m.start, end: m.end, node: <span className={HL_CLASS}>{m.active}</span> })
  }
  for (const [grp, ms] of groupMatches) {
    // แทนตัวเลขในกลุ่มด้วยค่าเลเวล (เรียงจากท้ายมาหน้า เพื่อไม่ให้ offset เพี้ยน)
    let text = description.slice(grp.start, grp.end)
    for (const m of [...ms].sort((a, b) => b.start - a.start)) {
      const rs = m.start - grp.start, re = m.end - grp.start
      text = text.slice(0, rs) + m.active + text.slice(re)
    }
    specials.push({ start: grp.start, end: grp.end, node: <span className={HL_CLASS}>{text}</span> })
  }

  specials.sort((a, b) => a.start - b.start)
  const nodes: React.ReactNode[] = []
  let cursor = 0
  specials.forEach((s, i) => {
    if (s.start > cursor) nodes.push(description.slice(cursor, s.start))
    nodes.push(<span key={i}>{s.node}</span>)
    cursor = s.end
  })
  if (cursor < description.length) nodes.push(description.slice(cursor))
  return nodes
}

function renderSkillDescription(description: string, skill: CharacterSkill, activeLevel: number): React.ReactNode {
  if (!description) return null
  const levels = skill.levels ?? []
  if (description.includes('[[')) return renderManual(description, levelSlotValues(levels[activeLevel - 1] ?? ''))
  return renderAuto(description, levels, activeLevel)
}

function SkillCard({ skill }: { skill: CharacterSkill }) {
  const [activeLevel, setActiveLevel] = useState(1)
  const [showLevels, setShowLevels] = useState(false)

  const ordStr = skill.order ? (ORDINAL[skill.order - 1] ?? `${skill.order}th`) : null
  const levelDesc = skill.levels?.[activeLevel - 1]
  const hasAnyLevel = skill.levels?.some(Boolean)

  return (
    <div className="border border-ptn-border rounded-lg overflow-hidden bg-ptn-surface">

      {/* ── Header row ── */}
      <div className="flex items-stretch">
        {/* Icon */}
        <div className="shrink-0 w-16 h-16 bg-black/60 border-r border-ptn-border flex items-center justify-center">
          {skill.icon_url ? (
            <img src={skill.icon_url} alt={skill.name} className="w-full h-full object-cover" />
          ) : (
            <Zap size={18} className="text-ptn-disabled" />
          )}
        </div>

        {/* Name + meta + tags */}
        <div className="flex-1 px-4 py-2.5 border-b border-ptn-border">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-heading font-bold text-ptn-text">{skill.name}</span>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {ordStr && (
                <span className="text-[11px] px-1.5 py-0.5 rounded border border-ptn-border text-ptn-muted font-mono">
                  ↑ {ordStr}
                </span>
              )}
              <span className="text-[11px] px-1.5 py-0.5 rounded border border-ptn-border text-ptn-muted font-mono">
                lv. {activeLevel}
              </span>
            </div>
          </div>
          {skill.tags && skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {skill.tags.map(tag => (
                <span key={tag} className={`text-xs px-2 py-0.5 rounded border font-medium ${tagStyle(tag)}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── LVL tabs ── */}
      <div className="flex border-b border-ptn-border bg-ptn-bg">
        <span className="px-3 py-1.5 text-[11px] text-ptn-disabled border-r border-ptn-border font-mono shrink-0">LVL</span>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(lv => (
          <button
            key={lv}
            onClick={() => setActiveLevel(lv)}
            className={`flex-1 py-1.5 text-xs transition-colors font-mono ${
              activeLevel === lv
                ? 'text-ptn-text bg-ptn-elevated'
                : 'text-ptn-disabled hover:text-ptn-muted'
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      {/* ── Range ── */}
      {skill.range && skill.range.cells?.length > 0 && (
        <RangeGrid range={skill.range} />
      )}

      {/* ── Description ── */}
      <div className="px-4 py-3">
        <p className="text-sm text-ptn-muted leading-relaxed whitespace-pre-line">
          {renderSkillDescription(skill.description, skill, activeLevel)}
        </p>

        {levelDesc && (
          <p className="text-xs text-ptn-cyan mt-2 pt-2 border-t border-ptn-border">
            LVL {activeLevel}: {levelDesc}
          </p>
        )}

        {hasAnyLevel && (
          <>
            <button
              onClick={() => setShowLevels(v => !v)}
              className="flex items-center gap-1 text-xs text-ptn-disabled hover:text-ptn-muted mt-2 transition-colors"
            >
              <span className="font-mono">{showLevels ? '▽▽' : '▷▷'}</span>
              {showLevels ? 'Hide Levels' : 'Show Levels'}
            </button>
            {showLevels && (
              <div className="mt-2 pt-2 border-t border-ptn-border space-y-1">
                {skill.levels!.map((desc, i) => desc ? (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-ptn-disabled font-mono w-12 shrink-0">LVL {i + 1}</span>
                    <span className="text-ptn-muted">{desc}</span>
                  </div>
                ) : null)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---- StatsCard -----------------------------------------------------------

type StatPair = { min: string | number; max: string | number }
type CharStatsData = { health?: StatPair; attack?: StatPair; defense?: StatPair; magic_resistance?: StatPair; attack_speed?: StatPair; block?: StatPair }

const STAT_ROWS: { key: keyof CharStatsData; label: string; icon: React.ElementType }[] = [
  { key: 'health',           label: 'Health',           icon: Heart },
  { key: 'attack',           label: 'Attack',           icon: Sword },
  { key: 'defense',          label: 'Defense',          icon: Shield },
  { key: 'magic_resistance', label: 'Magic Resistance', icon: ShieldCheck },
  { key: 'attack_speed',     label: 'Attack Speed',     icon: Zap },
  { key: 'block',            label: 'Block',            icon: Layers },
]

function StatsCard({ stats }: { stats: CharStatsData }) {
  const hasAny = STAT_ROWS.some(r => stats[r.key]?.min !== '' && stats[r.key]?.min !== undefined)
  if (!hasAny) return null
  return (
    <Card className="p-5 shrink-0 min-w-[260px]">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-4">
        STATS <span className="text-ptn-border">(LV1 → 90)</span>
      </h2>
      <div className="space-y-0 divide-y divide-ptn-border/50">
        {STAT_ROWS.map(({ key, label, icon: Icon }) => {
          const pair = stats[key]
          if (!pair || (pair.min === '' && pair.max === '')) return null
          return (
            <div key={key} className="flex items-center gap-3 py-2">
              <Icon size={14} className="text-ptn-disabled shrink-0" />
              <span className="text-sm text-ptn-muted flex-1">{label}</span>
              <div className="flex items-center gap-1.5 font-mono text-sm shrink-0">
                <span className="font-bold text-ptn-text">{pair.min}</span>
                <span className="text-ptn-disabled text-xs">→</span>
                <span className="font-bold text-ptn-text">{pair.max}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ---- Materials types -----------------------------------------------------

type MatEntry = { name: string; image_url: string; amount: string }
type MatSection = { label: string; items: MatEntry[] }
type MaterialsData = { rank_up: MatSection[]; skills: MatSection[] }

// ---- Main Page -----------------------------------------------------------

type CrimebrandBuild = {
  id: string
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

type CrimebrandSimple = {
  id: string
  name: string
  slug: string
  icon_url: string | null
  artwork_url: string | null
  rank: string
  effects: Array<{ piece: number; name: string; min: string; max: string }>
}

const CB_RANK_COLORS: Record<string, string> = { S: '#FFD700', A: '#C084FC', B: '#60A5FA' }
const CB_PIECE_LABEL = ['I', 'II', 'III']

export function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { groups: abilityTagGroups, descriptions: tagDescriptions } = useAbilityTags()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [tagsModalOpen, setTagsModalOpen] = useState(false)
  const [builds, setBuilds] = useState<CrimebrandBuild[]>([])
  const [buildCbs, setBuildCbs] = useState<CrimebrandSimple[]>([])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('slug', slug)
        .single()
      setCharacter(data || null)
      setLoading(false)
    }
    fetch()
  }, [slug])

  useEffect(() => {
    if (!character?.id) return
    supabase.from('character_crimebrand_builds')
      .select('*')
      .eq('character_id', character.id)
      .order('sort_order')
      .then(async ({ data: buildsData }) => {
        if (!buildsData?.length) return
        setBuilds(buildsData)
        const cbIds = [...new Set(
          buildsData.flatMap(b => [b.slot1_cb_id, b.slot2_cb_id, b.slot3_cb_id]).filter(Boolean)
        )]
        if (cbIds.length) {
          const { data: cbData } = await supabase
            .from('crimebrands')
            .select('id,name,slug,icon_url,artwork_url,rank,effects')
            .in('id', cbIds)
          setBuildCbs(cbData || [])
        }
      })
  }, [character?.id])

  if (loading) return <PageLoader />

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ptn-muted">ไม่พบตัวละครนี้</p>
        <Link to="/characters" className="text-ptn-cyan text-sm mt-2 hover:underline">
          กลับไปหน้าตัวละคร
        </Link>
      </div>
    )
  }

  const rarityColor = RARITY_COLORS[character.rarity]
  const skills = (character.skills as CharacterSkill[] | null) || []
  const shackles = (character.shackles as ShackleBreak[] | null) || []
  const tags = (character.tags as string[] | null) || []
  const abilityTags = (character.ability_tags as string[] | null) || []
  const trivia = (character.trivia as string[] | null) || []
  const crimebrandSets = (character.crimebrand_sets as Array<{ name: string; images: string[]; description: string }> | null) || []
  const charDetails = character.char_details as { birthday?: string; height?: string; birthplace?: string; ability?: string; case_name?: string } | null
  const overviewCards = (character.overview_cards as Array<{ title: string; content: string }> | null) || []
  const materials = character.materials as MaterialsData | null
  const charStatsData = (character.stats as CharStatsData | null) || {}
  const exclusiveCrimebrand = character.exclusive_crimebrand as {
    name: string; image_url: string; description: string; flavor_text: string; hasRange: boolean; range: { rows: number; cols: number; cells: number[] }
  } | null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back */}
      <Link
        to="/characters"
        className="flex items-center gap-1.5 text-xs text-ptn-muted hover:text-ptn-text mb-5 w-fit transition-colors"
      >
        <ChevronLeft size={14} /> ตัวละคร
      </Link>

      {/* ── Hero bar ── */}
      <div
        className="rounded-xl border overflow-hidden mb-1"
        style={{ borderColor: `${rarityColor}30` }}
      >
        <div
          className="flex min-h-[160px]"
          style={{ background: `linear-gradient(135deg, ${rarityColor}18 0%, #0e0e16 65%)` }}
        >
          {/* ── Portrait panel ── */}
          <div
            className="shrink-0 w-36 sm:w-48 md:w-56 relative overflow-hidden border-r"
            style={{ borderColor: `${rarityColor}20` }}
          >
            {(character.splash_url || character.portrait_url) ? (
              <img
                src={character.portrait_url || character.splash_url}
                alt={character.name}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: character.portrait_pos || '50% 20%',
                  transform: `scale(${character.portrait_zoom ?? 1})`,
                  transformOrigin: character.portrait_pos || '50% 20%',
                }}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-heading font-bold text-4xl"
                style={{ color: rarityColor }}
              >
                {character.name[0]}
              </div>
            )}
            {/* rarity tint overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 pointer-events-none" />
          </div>

          {/* ── Info panel ── */}
          <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between">

            {/* Top: name row + icons */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Name + Limited badge */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1
                    className="font-heading text-2xl sm:text-3xl font-bold leading-tight"
                    style={{ color: rarityColor }}
                  >
                    {character.name}
                  </h1>
                  {character.is_limited && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-ptn-gold/50 text-ptn-gold bg-ptn-gold/10 shrink-0">
                      <Star size={10} className="fill-ptn-gold" /> Limited
                    </span>
                  )}
                </div>
                {/* Tags (character codes) */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <span key={tag} className="text-[11px] px-1.5 py-0.5 rounded font-mono text-ptn-disabled border border-ptn-border/50 bg-black/30">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Icons: faction + tendency + rank */}
              <div className="flex items-center gap-1.5 shrink-0">
                {ALIGNMENT_ICON[character.faction] && (
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-ptn-border/40 bg-black/30 flex items-center justify-center">
                    <img src={ALIGNMENT_ICON[character.faction]} alt={character.faction} className="w-7 h-7 object-contain" />
                  </div>
                )}
                {TENDENCY_ICON[character.job_class] && (
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-ptn-border/40 bg-black/30 flex items-center justify-center">
                    <img src={TENDENCY_ICON[character.job_class]} alt={character.job_class} className="w-7 h-7 object-contain" />
                  </div>
                )}
                <Badge variant="rarity" value={character.rarity} />
              </div>
            </div>

            {/* Ability tags */}
            {abilityTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {abilityTagGroups.flatMap(group =>
                  abilityTags
                    .filter(t => group.tags.includes(t))
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => setTagsModalOpen(true)}
                        className="text-xs px-2.5 py-1 rounded border font-medium transition-opacity hover:opacity-75 cursor-pointer"
                        style={{ background: group.bg, borderColor: group.border, color: group.text }}
                      >
                        {tag}
                      </button>
                    ))
                )}
                <button
                  onClick={() => setTagsModalOpen(true)}
                  className="text-xs px-2.5 py-1 rounded border font-medium text-ptn-muted border-ptn-border hover:text-ptn-text hover:border-ptn-text transition-colors"
                >
                  ···
                </button>
              </div>
            )}

            {/* Bottom: alignment + tendency text */}
            <div
              className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-ptn-disabled"
              style={{ borderColor: `${rarityColor}15` }}
            >
              <span>{ALIGNMENT_LABEL[character.faction] || character.faction.toUpperCase()}</span>
              <span className="text-ptn-border">·</span>
              <span>{JOB_CLASS_LABEL[character.job_class] || character.job_class}</span>
              {character.release_date && (
                <>
                  <span className="text-ptn-border">·</span>
                  <span>{formatDate(character.release_date, { year: 'numeric', month: 'short' })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-t border-ptn-border bg-ptn-bg">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-ptn-red text-ptn-text'
                  : 'border-transparent text-ptn-muted hover:text-ptn-text hover:border-ptn-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-4 space-y-4">

        {/* INFO TAB */}
        {activeTab === 'info' && (
          <div className="space-y-4">

            {/* INFO + MATERIALS row */}
            <div className="grid md:grid-cols-[1fr_auto] gap-4">

            {/* Left — INFO table */}
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-4">INFO</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ptn-border">
                  {[
                    ...(charDetails?.birthday   ? [{ label: 'Birthday',   value: charDetails.birthday }] : []),
                    ...(charDetails?.height     ? [{ label: 'Height',     value: charDetails.height }] : []),
                    {
                      label: 'Alignment',
                      value: (
                        <span className="flex items-center gap-2">
                          {ALIGNMENT_ICON[character.faction] && (
                            <img src={ALIGNMENT_ICON[character.faction]} alt={character.faction} className="w-6 h-6 object-contain rounded-sm" />
                          )}
                          {ALIGNMENT_LABEL[character.faction] || character.faction.toUpperCase()}
                        </span>
                      )
                    },
                    {
                      label: 'Tendency',
                      value: (
                        <span className="flex items-center gap-2">
                          {TENDENCY_ICON[character.job_class] && (
                            <img src={TENDENCY_ICON[character.job_class]} alt={character.job_class} className="w-6 h-6 object-contain" />
                          )}
                          {JOB_CLASS_LABEL[character.job_class] || character.job_class}
                        </span>
                      )
                    },
                    ...(charDetails?.birthplace ? [{ label: 'Birthplace', value: charDetails.birthplace }] : []),
                    ...(charDetails?.ability    ? [{ label: 'Ability',    value: charDetails.ability }] : []),
                    ...(charDetails?.case_name  ? [{ label: 'Case',       value: charDetails.case_name }] : []),
                    { label: 'Rank', value: `${character.rarity}-Rank` },
                    ...(character.release_date ? [{ label: 'วันที่ออก', value: formatDate(character.release_date, { year: 'numeric', month: 'long', day: 'numeric' }) }] : []),
                    ...(character.is_limited ? [{ label: 'ประเภท', value: 'Limited' }] : []),
                    ...(tags.length > 0 ? [{ label: 'ID', value: tags.join(' · ') }] : []),
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="py-2.5 pr-4 text-ptn-disabled w-28 align-top">{row.label}</td>
                      <td className="py-2.5 text-ptn-text font-medium">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Right — STATS */}
            <StatsCard stats={charStatsData} />

            </div>{/* end INFO+MATERIALS grid */}

            {/* Detailed Materials breakdown */}
            {materials && (
              materials.rank_up?.some(s => s.items?.some(m => m.image_url)) ||
              materials.skills?.some(s => s.items?.some(m => m.image_url))
            ) && (
              <div className="grid md:grid-cols-2 gap-4">
                {materials.rank_up?.some(s => s.items?.some(m => m.image_url)) && (
                  <Card className="overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-ptn-border bg-ptn-elevated">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ptn-disabled">RANK-UP MATERIALS</h3>
                    </div>
                    <div className="divide-y divide-ptn-border">
                      {materials.rank_up.filter(s => s.items?.some(m => m.image_url)).map((section, si) => (
                        <div key={si} className="px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ptn-disabled mb-2">{section.label}</p>
                          <div className="flex flex-wrap gap-3">
                            {section.items.filter(m => m.image_url).map((mat, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-9 h-9 rounded border border-ptn-border overflow-hidden bg-ptn-elevated shrink-0">
                                  <img src={mat.image_url} alt={mat.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  {mat.amount && <p className="text-sm font-bold text-ptn-text leading-tight">{mat.amount}</p>}
                                  {mat.name && <p className="text-[10px] text-ptn-disabled leading-tight">{mat.name}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {materials.skills?.some(s => s.items?.some(m => m.image_url)) && (
                  <Card className="overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-ptn-border bg-ptn-elevated">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ptn-disabled">SKILL MATERIALS (LV 1 → 10)</h3>
                    </div>
                    <div className="divide-y divide-ptn-border">
                      {materials.skills.filter(s => s.items?.some(m => m.image_url)).map((section, si) => (
                        <div key={si} className="px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-ptn-disabled mb-2">{section.label}</p>
                          <div className="flex flex-wrap gap-3">
                            {section.items.filter(m => m.image_url).map((mat, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-9 h-9 rounded border border-ptn-border overflow-hidden bg-ptn-elevated shrink-0">
                                  <img src={mat.image_url} alt={mat.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  {mat.amount && <p className="text-sm font-bold text-ptn-text leading-tight">{mat.amount}</p>}
                                  {mat.name && <p className="text-[10px] text-ptn-disabled leading-tight">{mat.name}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Overview Cards (Initial Attribute / Mania Intensify) */}
            {overviewCards.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3">
                {overviewCards.map((card, i) => (
                  <div key={i} className="border border-ptn-border rounded-lg bg-ptn-elevated p-4">
                    <p className="font-heading font-bold text-ptn-text mb-2 text-sm">{card.title}</p>
                    <p className="text-sm text-ptn-muted leading-relaxed whitespace-pre-line">{card.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Crimebrand Builds */}
            {builds.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-3">Crimebrand Builds</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {builds.map(build => {
                    const slots = [
                      { cbId: build.slot1_cb_id, piece: build.slot1_piece },
                      { cbId: build.slot2_cb_id, piece: build.slot2_piece },
                      { cbId: build.slot3_cb_id, piece: build.slot3_piece },
                    ]
                    return (
                      <div key={build.id} className="border border-ptn-border rounded-lg overflow-hidden bg-ptn-elevated">
                        {/* Title */}
                        <div className="px-4 py-2.5 border-b border-ptn-border">
                          <p className="font-heading font-bold text-ptn-text text-center text-sm leading-tight">{build.build_name}</p>
                        </div>
                        {/* Artwork row */}
                        <div className="flex border-b border-ptn-border">
                          {slots.map((s, i) => {
                            const cb = buildCbs.find(c => c.id === s.cbId)
                            const img = cb?.artwork_url || cb?.icon_url
                            return (
                              <div key={i} className="flex-1 border-r border-ptn-border last:border-r-0 overflow-hidden">
                                {img && cb ? (
                                  <Link to={`/crimebrands/${cb.slug}`} className="block aspect-square hover:opacity-90 transition-opacity">
                                    <img src={img} alt={cb.name} className="w-full h-full object-cover" />
                                  </Link>
                                ) : (
                                  <div className="aspect-square flex items-center justify-center bg-ptn-surface">
                                    <span className="text-ptn-disabled text-xs font-heading">{CB_PIECE_LABEL[i]}</span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Description + slot details */}
                        <div className="p-3 space-y-2">
                          {build.description && (
                            <p className="text-xs text-ptn-muted leading-relaxed whitespace-pre-line">{build.description}</p>
                          )}
                          <div className="flex gap-2">
                            {slots.map((s, i) => {
                              const cb = buildCbs.find(c => c.id === s.cbId)
                              const effects = cb ? (Array.isArray(cb.effects) ? cb.effects : []) : []
                              const eff = effects.find(e => e.piece === s.piece)
                              const rankColor = CB_RANK_COLORS[cb?.rank ?? ''] || '#ffffff'
                              if (!cb) return null
                              return (
                                <div key={i} className="flex-1 text-center">
                                  <p className="text-xs text-ptn-muted font-mono font-bold">{CB_PIECE_LABEL[i]}</p>
                                  {eff && (
                                    <p className="text-sm font-mono font-bold" style={{ color: rankColor }}>{eff.max}</p>
                                  )}
                                  {eff?.name && (
                                    <p className="text-xs text-ptn-text leading-tight">{eff.name}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Legacy Crimebrand Sets */}
            {crimebrandSets.length > 0 && builds.length === 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-3">Crimebrand Sets</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {crimebrandSets.map((set, i) => {
                    const imgs = (set.images || []).filter(Boolean)
                    return (
                      <div key={i} className="border border-ptn-border rounded-lg overflow-hidden bg-ptn-elevated">
                        <div className="px-4 py-2.5 border-b border-ptn-border">
                          <p className="font-heading font-bold text-ptn-text text-center text-sm leading-tight">{set.name}</p>
                        </div>
                        {imgs.length > 0 && (
                          <div className="flex border-b border-ptn-border">
                            {imgs.map((img, j) => (
                              <div key={j} className="flex-1 aspect-square border-r border-ptn-border last:border-r-0 overflow-hidden">
                                <img src={img} alt={`${set.name} ${j + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs text-ptn-muted leading-relaxed whitespace-pre-line">{set.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === 'skills' && (
          <div className="space-y-3">
            {skills.length > 0 ? (
              skills.map((skill, i) => <SkillCard key={i} skill={skill} />)
            ) : (
              <Card className="p-8 text-center text-ptn-disabled">ยังไม่มีข้อมูลสกิล</Card>
            )}
            {exclusiveCrimebrand?.name && (
              <ExclusiveCrimebrandCard data={exclusiveCrimebrand} />
            )}
          </div>
        )}

        {/* SHACKLES TAB */}
        {activeTab === 'shackles' && (
          <div className="space-y-2">
            {shackles.length > 0 ? (
              shackles.map((s) => (
                <Card key={s.stage} className="p-4">
                  <div className="flex items-start gap-4">
                    <ShackleIcon stage={s.stage} iconUrl={s.icon_url} />
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-heading font-bold text-sm leading-snug" style={{ color: SHACKLE_COLORS[(s.stage - 1) % SHACKLE_COLORS.length] }}>
                        S{s.stage}{s.name && <span className="ml-1.5 text-ptn-text font-medium">{s.name}</span>}
                      </p>
                      <p className="text-sm text-ptn-text leading-snug mt-0.5">{s.bonus_th || s.bonus}</p>
                      {s.bonus_th && s.bonus && s.bonus !== s.bonus_th && (
                        <p className="text-xs text-ptn-disabled mt-0.5">{s.bonus}</p>
                      )}
                    </div>
                    {s.cost > 0 && (
                      <span className="shrink-0 text-xs text-ptn-disabled mt-1">{s.cost} หิน</span>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center text-ptn-disabled">ยังไม่มีข้อมูล Shackle Break</Card>
            )}
          </div>
        )}

        {/* STORY TAB */}
        {activeTab === 'story' && (
          trivia.length > 0 ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-4">Trivia</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {trivia.map((entry, i) => (
                    <div
                      key={i}
                      className="relative flex border border-ptn-border bg-ptn-elevated rounded overflow-hidden min-h-[120px]"
                    >
                      {/* Side label */}
                      <div className="shrink-0 w-6 border-r border-ptn-border flex items-center justify-center bg-ptn-surface">
                        <span
                          className="text-[7px] text-ptn-disabled font-mono tracking-widest uppercase select-none"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          DATA EXTRACT
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-3 pb-7 prose-ptn text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            img: ({ src, alt }) => (
                              <img src={src} alt={alt || ''} className="rounded-lg max-w-full mt-2 border border-ptn-border" />
                            ),
                          }}
                        >
                          {entry}
                        </ReactMarkdown>
                      </div>

                      {/* Number badge */}
                      <span
                        className="absolute bottom-2 left-8 font-heading font-bold text-2xl leading-none select-none"
                        style={{ color: `${rarityColor}25` }}
                      >
                        {i + 1}
                      </span>
                    </div>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center text-ptn-disabled">ยังไม่มีข้อมูล Trivia / Lore</Card>
          )
        )}
      </div>

      {/* Tags info modal */}
      <TagsInfoModal
        open={tagsModalOpen}
        onClose={() => setTagsModalOpen(false)}
        tags={abilityTags}
        groups={abilityTagGroups}
        descriptions={tagDescriptions}
      />
    </div>
  )
}
