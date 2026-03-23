// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Star, Shield, Heart, Sword, Zap, Wind } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, CharacterStats, CharacterSkill, ShackleBreak } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { RARITY_COLORS, JOB_CLASS_LABEL, ALIGNMENT_LABEL, ALIGNMENT_ICON, TENDENCY_ICON } from '../../lib/constants'
import { formatDate } from '../../lib/utils'

// ---- Tabs ----------------------------------------------------------------

const TABS = [
  { id: 'info',     label: 'ข้อมูล' },
  { id: 'skills',   label: 'สกิล' },
  { id: 'shackles', label: 'Shackles' },
  { id: 'story',    label: 'เรื่องราว' },
]

// ---- Stat rows -----------------------------------------------------------

const STAT_ROWS = [
  { key: 'hp',  label: 'HP',          icon: Heart,  color: '#10B981' },
  { key: 'atk', label: 'Attack',      icon: Sword,  color: '#C8102E' },
  { key: 'def', label: 'Defense',     icon: Shield, color: '#60A5FA' },
  { key: 'res', label: 'Magic Res.',  icon: Shield, color: '#C084FC' },
  { key: 'spd', label: 'Atk. Speed', icon: Wind,   color: '#F59E0B' },
]

// ---- Shackle icon --------------------------------------------------------

function ShackleIcon({ stage, color }: { stage: number; color: string }) {
  return (
    <div
      className="shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-heading font-bold text-sm"
      style={{ borderColor: color, color }}
    >
      S{stage}
    </div>
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
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-black/40 border-b border-ptn-border">
      <span className="text-[10px] tracking-widest text-ptn-disabled font-mono shrink-0">RANGE</span>
      <div
        className="inline-grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${range.cols}, 1.75rem)` }}
      >
        {range.cells.map((cell, i) => (
          <div
            key={i}
            className={`w-7 h-7 border flex items-center justify-center ${
              cell === 2
                ? 'bg-red-800/80 border-red-600'
                : cell === 1
                  ? 'bg-zinc-600/60 border-zinc-500'
                  : 'bg-transparent border-zinc-700/40'
            }`}
          >
            {cell === 2 && <div className="w-2.5 h-2.5 rounded-full bg-red-400" />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- SkillCard -----------------------------------------------------------

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
        <p className="text-sm text-ptn-muted leading-relaxed">{skill.description}</p>

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

// ---- Main Page -----------------------------------------------------------

export function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

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
  const stats = character.stats as CharacterStats | null
  const skills = (character.skills as CharacterSkill[] | null) || []
  const shackles = (character.shackles as ShackleBreak[] | null) || []
  const tags = (character.tags as string[] | null) || []

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
          className="flex items-center gap-4 px-5 py-4"
          style={{ background: `linear-gradient(90deg, ${rarityColor}18 0%, #12121A 55%)` }}
        >
          {/* Portrait thumbnail */}
          <div
            className="shrink-0 w-14 h-14 rounded-lg border overflow-hidden bg-ptn-elevated"
            style={{ borderColor: `${rarityColor}50` }}
          >
            {character.portrait_url ? (
              <img src={character.portrait_url} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-heading font-bold text-xl"
                style={{ color: rarityColor }}
              >
                {character.name[0]}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold leading-tight" style={{ color: rarityColor }}>
              {character.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded border border-ptn-border text-ptn-muted bg-ptn-elevated"
                >
                  {tag}
                </span>
              ))}
              {character.is_limited && (
                <span className="flex items-center gap-1 text-xs text-ptn-gold">
                  <Star size={11} className="fill-ptn-gold" /> Limited
                </span>
              )}
            </div>
          </div>

          {/* Right — rank + class + faction */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm text-ptn-muted">
              {ALIGNMENT_ICON[character.faction] && (
                <img src={ALIGNMENT_ICON[character.faction]} alt={character.faction} className="w-5 h-5 object-contain opacity-80 rounded-sm" />
              )}
              {ALIGNMENT_LABEL[character.faction] || character.faction.toUpperCase()}
            </span>
            <span className="text-ptn-border">·</span>
            <span className="flex items-center gap-1.5 text-sm text-ptn-muted">
              {TENDENCY_ICON[character.job_class] && (
                <img src={TENDENCY_ICON[character.job_class]} alt={character.job_class} className="w-5 h-5 object-contain opacity-80" />
              )}
              {JOB_CLASS_LABEL[character.job_class] || character.job_class}
            </span>
            <span className="text-ptn-border">·</span>
            <Badge variant="rarity" value={character.rarity} />
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
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left — basic info */}
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-4">ข้อมูลพื้นฐาน</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ptn-border">
                  {[
                    {
                      label: 'Tendencies',
                      value: (
                        <span className="flex items-center gap-2">
                          {TENDENCY_ICON[character.job_class] && (
                            <img src={TENDENCY_ICON[character.job_class]} alt={character.job_class} className="w-9 h-9 object-contain" />
                          )}
                          {JOB_CLASS_LABEL[character.job_class] || character.job_class}
                        </span>
                      )
                    },
                    {
                      label: 'Alignments',
                      value: (
                        <span className="flex items-center gap-2">
                          {ALIGNMENT_ICON[character.faction] && (
                            <img src={ALIGNMENT_ICON[character.faction]} alt={character.faction} className="w-7 h-7 object-contain rounded-sm" />
                          )}
                          {ALIGNMENT_LABEL[character.faction] || character.faction.toUpperCase()}
                        </span>
                      )
                    },
                    { label: 'Rank',    value: `${character.rarity}-Rank` },
                    ...(character.release_date
                      ? [{ label: 'วันที่ออก', value: formatDate(character.release_date, { year: 'numeric', month: 'long', day: 'numeric' }) }]
                      : []),
                    ...(character.is_limited ? [{ label: 'ประเภท', value: 'Limited' }] : []),
                    ...(tags.length > 0 ? [{ label: 'แท็ก', value: tags.join(', ') }] : []),
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="py-2.5 pr-4 text-ptn-disabled w-28">{row.label}</td>
                      <td className="py-2.5 text-ptn-text font-medium">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Right — stats */}
            <Card className="p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ptn-disabled mb-4">สถิติ</h2>
              {stats ? (
                <div className="divide-y divide-ptn-border">
                  {STAT_ROWS.map(({ key, label, icon: Icon, color }) => {
                    const val = stats[key as keyof CharacterStats]
                    if (val == null) return null
                    return (
                      <div key={key} className="flex items-center gap-3 py-2.5">
                        <Icon size={14} style={{ color }} className="shrink-0" />
                        <span className="flex-1 text-sm text-ptn-muted">{label}</span>
                        <span className="font-heading font-bold text-ptn-text">{val}</span>
                      </div>
                    )
                  })}
                  {(stats.crit_rate != null || stats.crit_dmg != null) && (
                    <>
                      {stats.crit_rate != null && (
                        <div className="flex items-center gap-3 py-2.5">
                          <Zap size={14} style={{ color: '#FB923C' }} className="shrink-0" />
                          <span className="flex-1 text-sm text-ptn-muted">Crit Rate</span>
                          <span className="font-heading font-bold text-ptn-text">{stats.crit_rate}%</span>
                        </div>
                      )}
                      {stats.crit_dmg != null && (
                        <div className="flex items-center gap-3 py-2.5">
                          <Zap size={14} style={{ color: '#F43F5E' }} className="shrink-0" />
                          <span className="flex-1 text-sm text-ptn-muted">Crit DMG</span>
                          <span className="font-heading font-bold text-ptn-text">{stats.crit_dmg}%</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-ptn-disabled text-sm text-center py-6">ยังไม่มีข้อมูลสถิติ</p>
              )}
            </Card>
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
          </div>
        )}

        {/* SHACKLES TAB */}
        {activeTab === 'shackles' && (
          <div className="space-y-2">
            {shackles.length > 0 ? (
              shackles.map((s) => (
                <Card key={s.stage} className="p-4">
                  <div className="flex items-start gap-4">
                    <ShackleIcon stage={s.stage} color={rarityColor} />
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-medium text-ptn-text leading-snug">{s.bonus_th || s.bonus}</p>
                      {s.bonus_th && s.bonus !== s.bonus_th && (
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
          <Card className="p-6">
            {character.overview ? (
              <p className="text-ptn-muted leading-relaxed whitespace-pre-line text-sm">
                {character.overview}
              </p>
            ) : (
              <p className="text-ptn-disabled text-center py-6">ยังไม่มีข้อมูลเรื่องราว</p>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
