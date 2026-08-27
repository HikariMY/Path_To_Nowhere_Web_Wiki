import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ALIGNMENT_LABEL, ALIGNMENT_ICON, TENDENCY_ICON, JOB_CLASS_LABEL, RARITY_COLORS } from '../lib/constants'
import { ABILITY_TAG_GROUPS, TAG_DESCRIPTIONS } from '../lib/abilityTags'
import { Card } from '../components/ui/Card'

// ---- Default data ----------------------------------------------------------

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

// ---- Character type (minimal) ----------------------------------------------

type CharSnap = {
  id: string
  name: string
  slug: string
  rarity: string
  portrait_url: string | null
  faction: string
  job_class: string
}

// ---- Alignment detail modal ------------------------------------------------

function AlignmentModal({
  alignKey,
  label,
  icon,
  onClose,
  desc,
  chars,
}: {
  alignKey: string
  label: string
  icon?: string
  onClose: () => void
  desc: string
  chars: CharSnap[]
}) {

  // close on backdrop
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-ptn-border bg-ptn-surface shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-5 p-6 pb-4">
          {icon && (
            <img
              src={icon}
              alt={label}
              className="w-28 h-28 rounded-xl object-cover shrink-0 border border-ptn-border/50"
            />
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="font-heading text-2xl font-bold text-ptn-text tracking-wide uppercase">
              {label}
            </h2>
            <p className="text-sm text-ptn-muted mt-2 leading-relaxed">{desc}</p>
            <p className="text-xs text-ptn-disabled mt-1">
              {chars.length} ตัวละคร
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-ptn-border" />

        {/* Character grid */}
        <div className="p-6 pt-4">
          {chars.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {chars.map(c => (
                <Link
                  key={c.id}
                  to={`/characters/${c.slug}`}
                  onClick={onClose}
                  className="group flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full aspect-square rounded-lg overflow-hidden border-2 transition-all group-hover:scale-105"
                    style={{ borderColor: RARITY_COLORS[c.rarity] || '#444' }}
                  >
                    {c.portrait_url ? (
                      <img
                        src={c.portrait_url}
                        alt={c.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full bg-ptn-elevated flex items-center justify-center text-ptn-disabled text-xs">
                        ?
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-ptn-muted text-center leading-tight group-hover:text-ptn-text transition-colors truncate w-full text-center">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-ptn-disabled text-sm py-6">ยังไม่มีตัวละครใน Alignment นี้</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Tendency detail modal -------------------------------------------------

function TendencyModal({
  label,
  icon,
  color,
  onClose,
  desc,
  chars,
}: {
  label: string
  icon?: string
  color: string
  onClose: () => void
  desc: string
  chars: CharSnap[]
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-ptn-border bg-ptn-surface shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-ptn-muted hover:text-ptn-text hover:bg-ptn-elevated transition-colors">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-5 p-6 pb-4">
          {icon && (
            <div
              className="w-28 h-28 rounded-xl flex items-center justify-center shrink-0 border"
              style={{ background: `${color}20`, borderColor: `${color}50` }}
            >
              <img src={icon} alt={label} className="w-20 h-20 object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="font-heading text-2xl font-bold tracking-wide uppercase" style={{ color }}>
              {label}
            </h2>
            <p className="text-sm text-ptn-muted mt-2 leading-relaxed">{desc}</p>
            <p className="text-xs text-ptn-disabled mt-1">{chars.length} ตัวละคร</p>
          </div>
        </div>

        <div className="mx-6 border-t border-ptn-border" />

        {/* Character grid */}
        <div className="p-6 pt-4">
          {chars.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {chars.map(c => (
                <Link key={c.id} to={`/characters/${c.slug}`} onClick={onClose} className="group flex flex-col items-center gap-1">
                  <div
                    className="w-full aspect-square rounded-lg overflow-hidden border-2 transition-all group-hover:scale-105"
                    style={{ borderColor: RARITY_COLORS[c.rarity] || '#444' }}
                  >
                    {c.portrait_url ? (
                      <img src={c.portrait_url} alt={c.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full bg-ptn-elevated flex items-center justify-center text-ptn-disabled text-xs">?</div>
                    )}
                  </div>
                  <span className="text-xs text-ptn-muted text-center leading-tight group-hover:text-ptn-text transition-colors truncate w-full text-center">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-ptn-disabled text-sm py-6">ยังไม่มีตัวละครใน Tendency นี้</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Page ------------------------------------------------------------------

export function GameInfoPage() {
  const [activeTab, setActiveTab] = useState('tags')
  const [rows, setRows] = useState([])
  const [characters, setCharacters] = useState<CharSnap[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAlignment, setSelectedAlignment] = useState<string | null>(null)
  const [selectedTendency, setSelectedTendency] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('game_info').select('*'),
      supabase.from('characters').select('id,name,slug,rarity,portrait_url,faction,job_class').order('rarity').order('name'),
    ]).then(([infoRes, charsRes]) => {
      setRows(infoRes.data || [])
      setCharacters(charsRes.data || [])
      setLoading(false)
    })
  }, [])

  function getDesc(category, key, fallback) {
    const row = rows.find(r => r.category === category && r.key === key)
    return row?.data?.desc ?? fallback
  }

  function getColor(category, key, fallback) {
    const row = rows.find(r => r.category === category && r.key === key)
    return row?.data?.color ?? fallback
  }

  const charsByFaction  = (key: string) => characters.filter(c => c.faction   === key)
  const charsByJobClass = (key: string) => characters.filter(c => c.job_class === key)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-ptn-text">ข้อมูลเกม</h1>
        <p className="text-ptn-muted mt-1 text-sm">รายละเอียด Ability Tags, Alignment และ Tendency ของ Path to Nowhere</p>
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
          {/* ABILITY TAGS */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              <p className="text-sm text-ptn-muted">
                Ability Tags แสดงถึงประเภทของสกิลและความสามารถ ช่วยให้เข้าใจว่าตัวละครนั้นถนัดด้านใดและทำงานร่วมกันอย่างไรในทีม
              </p>
              {ABILITY_TAG_GROUPS.map(group => {
                const customTagsInGroup = rows.filter(
                  r => r.category === 'tag' && r.data?.is_custom && r.data?.group_label === group.label,
                )
                return (
                  <Card key={group.label} className="p-5">
                    <h2 className="font-heading font-bold text-base mb-4" style={{ color: group.text }}>
                      {group.label}
                    </h2>
                    <div className="space-y-3">
                      {group.tags.map(tag => {
                        const desc = getDesc('tag', tag, TAG_DESCRIPTIONS[tag] || '')
                        return (
                          <div key={tag} className="flex items-start gap-3">
                            <span className="shrink-0 mt-0.5 text-xs px-2.5 py-1 rounded border font-mono font-semibold whitespace-nowrap" style={{ background: group.bg, borderColor: group.border, color: group.text }}>
                              {tag}
                            </span>
                            <p className="text-sm text-ptn-muted leading-relaxed">{desc || '—'}</p>
                          </div>
                        )
                      })}
                      {customTagsInGroup.map(row => (
                        <div key={row.key} className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5 text-xs px-2.5 py-1 rounded border font-mono font-semibold whitespace-nowrap" style={{ background: group.bg, borderColor: group.border, color: group.text }}>
                            {row.key}
                          </span>
                          <p className="text-sm text-ptn-muted leading-relaxed">{row.data?.desc || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })}
              {/* Custom tags in unknown group */}
              {(() => {
                const knownGroupLabels = ABILITY_TAG_GROUPS.map(g => g.label)
                const others = rows.filter(
                  r => r.category === 'tag' && r.data?.is_custom && !knownGroupLabels.includes(r.data?.group_label),
                )
                if (others.length === 0) return null
                return (
                  <Card className="p-5">
                    <h2 className="font-heading font-bold text-base mb-4 text-ptn-muted">อื่นๆ</h2>
                    <div className="space-y-3">
                      {others.map(row => (
                        <div key={row.key} className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5 text-xs px-2.5 py-1 rounded border font-mono font-semibold whitespace-nowrap border-ptn-border text-ptn-muted">
                            {row.key}
                          </span>
                          <p className="text-sm text-ptn-muted leading-relaxed">{row.data?.desc || '—'}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })()}
            </div>
          )}

          {/* ALIGNMENT */}
          {activeTab === 'alignment' && (
            <div className="space-y-4">
              <p className="text-sm text-ptn-muted">
                Alignment คือแนวโน้มของตัวละครที่สะท้อนถึงบุคลิกภาพและแรงจูงใจ คลิกเพื่อดูตัวละครในแต่ละ Alignment
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default alignments */}
                {Object.entries(ALIGNMENT_LABEL).map(([key, label]) => {
                  const icon  = ALIGNMENT_ICON[key]
                  const desc  = getDesc('alignment', key, DEFAULT_ALIGNMENT_DESC[key] || '')
                  const count = charsByFaction(key).length
                  return (
                    <button key={key} onClick={() => setSelectedAlignment(key)} className="text-left w-full">
                      <Card className="p-4 hover:border-ptn-red/40 hover:bg-ptn-elevated transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          {icon && <img src={icon} alt={label} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-ptn-border" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-heading font-bold text-ptn-text">{label}</p>
                              {count > 0 && <span className="shrink-0 text-xs text-ptn-muted border border-ptn-border px-2 py-0.5 rounded-full">{count} ตัวละคร</span>}
                            </div>
                            <p className="text-xs text-ptn-muted capitalize mb-1">{key}</p>
                            <p className="text-sm text-ptn-muted leading-relaxed line-clamp-2">{desc}</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
                {/* Custom alignments */}
                {rows.filter(r => r.category === 'alignment' && r.data?.is_custom).map(row => {
                  const label = row.data?.label || row.key
                  const icon  = row.data?.icon_url
                  const desc  = row.data?.desc || ''
                  const count = charsByFaction(row.key).length
                  return (
                    <button key={row.key} onClick={() => setSelectedAlignment(row.key)} className="text-left w-full">
                      <Card className="p-4 hover:border-ptn-red/40 hover:bg-ptn-elevated transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          {icon
                            ? <img src={icon} alt={label} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-ptn-border" />
                            : <div className="w-14 h-14 rounded-lg bg-ptn-elevated border border-ptn-border shrink-0 flex items-center justify-center text-ptn-disabled">?</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-heading font-bold text-ptn-text">{label}</p>
                              {count > 0 && <span className="shrink-0 text-xs text-ptn-muted border border-ptn-border px-2 py-0.5 rounded-full">{count} ตัวละคร</span>}
                            </div>
                            <p className="text-xs text-ptn-muted capitalize mb-1">{row.key}</p>
                            <p className="text-sm text-ptn-muted leading-relaxed line-clamp-2">{desc}</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TENDENCY */}
          {activeTab === 'tendency' && (
            <div className="space-y-4">
              <p className="text-sm text-ptn-muted">
                Tendency หรือ Job Class คือบทบาทหลักของตัวละครในการต่อสู้ กำหนดรูปแบบการเล่นและทีมที่เหมาะสม
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default tendencies */}
                {Object.entries(JOB_CLASS_LABEL).map(([key, label]) => {
                  const icon  = TENDENCY_ICON[key]
                  const def   = DEFAULT_TENDENCY[key] || { desc: '', color: '#ffffff' }
                  const desc  = getDesc('tendency', key, def.desc)
                  const color = getColor('tendency', key, def.color)
                  const count = charsByJobClass(key).length
                  return (
                    <button key={key} onClick={() => setSelectedTendency(key)} className="text-left w-full">
                      <Card className="p-5 hover:border-ptn-red/40 hover:bg-ptn-elevated transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          {icon && (
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${color}18`, borderColor: `${color}40` }}>
                              <img src={icon} alt={label} className="w-10 h-10 object-contain" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-heading font-bold text-base" style={{ color }}>{label}</p>
                              {count > 0 && <span className="shrink-0 text-xs text-ptn-muted border border-ptn-border px-2 py-0.5 rounded-full">{count} ตัวละคร</span>}
                            </div>
                            <p className="text-xs text-ptn-muted capitalize mb-1.5">{key}</p>
                            <p className="text-sm text-ptn-muted leading-relaxed line-clamp-2">{desc}</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
                {/* Custom tendencies */}
                {rows.filter(r => r.category === 'tendency' && r.data?.is_custom).map(row => {
                  const label = row.data?.label || row.key
                  const icon  = row.data?.icon_url
                  const color = row.data?.color || '#ffffff'
                  const desc  = row.data?.desc || ''
                  const count = charsByJobClass(row.key).length
                  return (
                    <button key={row.key} onClick={() => setSelectedTendency(row.key)} className="text-left w-full">
                      <Card className="p-5 hover:border-ptn-red/40 hover:bg-ptn-elevated transition-all cursor-pointer">
                        <div className="flex items-start gap-4">
                          {icon
                            ? <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${color}18`, borderColor: `${color}40` }}>
                                <img src={icon} alt={label} className="w-10 h-10 object-contain" />
                              </div>
                            : <div className="w-14 h-14 rounded-xl bg-ptn-elevated border border-ptn-border shrink-0 flex items-center justify-center text-ptn-disabled">?</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-heading font-bold text-base" style={{ color }}>{label}</p>
                              {count > 0 && <span className="shrink-0 text-xs text-ptn-muted border border-ptn-border px-2 py-0.5 rounded-full">{count} ตัวละคร</span>}
                            </div>
                            <p className="text-xs text-ptn-muted capitalize mb-1.5">{row.key}</p>
                            <p className="text-sm text-ptn-muted leading-relaxed line-clamp-2">{desc}</p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tendency detail modal */}
      {selectedTendency && (() => {
        const customRow = rows.find(r => r.category === 'tendency' && r.key === selectedTendency && r.data?.is_custom)
        const def   = DEFAULT_TENDENCY[selectedTendency] || { desc: '', color: '#ffffff' }
        const label = JOB_CLASS_LABEL[selectedTendency] || customRow?.data?.label || selectedTendency
        const icon  = TENDENCY_ICON[selectedTendency]   || customRow?.data?.icon_url
        const color = getColor('tendency', selectedTendency, def.color)
        const desc  = getDesc('tendency', selectedTendency, def.desc)
        return (
          <TendencyModal
            label={label}
            icon={icon}
            color={color}
            onClose={() => setSelectedTendency(null)}
            desc={desc}
            chars={charsByJobClass(selectedTendency)}
          />
        )
      })()}

      {/* Alignment detail modal */}
      {selectedAlignment && (
        <AlignmentModal
          alignKey={selectedAlignment}
          label={
            ALIGNMENT_LABEL[selectedAlignment] ||
            rows.find(r => r.category === 'alignment' && r.key === selectedAlignment)?.data?.label ||
            selectedAlignment
          }
          icon={
            ALIGNMENT_ICON[selectedAlignment] ||
            rows.find(r => r.category === 'alignment' && r.key === selectedAlignment)?.data?.icon_url
          }
          onClose={() => setSelectedAlignment(null)}
          desc={getDesc('alignment', selectedAlignment, DEFAULT_ALIGNMENT_DESC[selectedAlignment] || '')}
          chars={charsByFaction(selectedAlignment)}
        />
      )}
    </div>
  )
}
