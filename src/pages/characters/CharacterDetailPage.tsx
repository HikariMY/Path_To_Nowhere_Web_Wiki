// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Star, Sword, Shield, Zap, Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character, CharacterStats, CharacterSkill } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { RARITY_COLORS, JOB_CLASS_LABEL, FACTION_LABEL } from '../../lib/constants'
import { formatDate } from '../../lib/utils'

const DEMO_CHAR: Character = {
  id: '1', name: 'Rahu', slug: 'rahu', rarity: 'S', faction: 'mbcc', job_class: 'breaker',
  portrait_url: null, splash_url: null,
  overview: 'Rahu เป็นหัวหน้าทีม MBCC ผู้มีพลังชนิดพิเศษที่สามารถทำลายแนวป้องกันของศัตรูได้อย่างมีประสิทธิภาพ เธอเป็นตัวละครหลักในเนื้อเรื่องที่มีบทบาทสำคัญในการนำทีม MBCC เข้าต่อสู้กับ Sinners และภัยคุกคามต่างๆ\n\nด้วยทักษะการต่อสู้ระยะประชิดที่เชี่ยวชาญ Rahu สามารถสร้างความเสียหายได้อย่างมหาศาล และยังมีความสามารถในการควบคุมศัตรูอีกด้วย',
  stats: {
    hp: 4850, atk: 782, def: 412, res: 280, spd: 115
  },
  skills: [
    {
      name: 'Breaker Strike',
      name_th: 'การโจมตีของเบรคเกอร์',
      type: 'active',
      cost: 3,
      description_th: 'โจมตีศัตรูเดี่ยว สร้างความเสียหายทางกายภาพ 200% และลดเกราะของเป้าหมาย 20% เป็นเวลา 2 รอบ',
    },
    {
      name: 'Armor Shatter',
      name_th: 'ทุบเกราะ',
      type: 'active',
      cost: 5,
      description_th: 'โจมตีศัตรูทั้งหมดในพื้นที่ สร้างความเสียหาย 150% และลดทอนความต้านทานของศัตรูที่โดนโจมตี',
    },
    {
      name: 'Unbreakable Will',
      name_th: 'เจตจำนงที่ไม่หักพัง',
      type: 'passive',
      description_th: 'เมื่อ HP ต่ำกว่า 30% จะได้รับการเพิ่มพลังโจมตี 30% และดาเมจที่ได้รับลดลง 15%',
    },
  ],
  shackles: [
    { stage: 1, cost: 5, bonus: 'ATK +10%', bonus_th: 'พลังโจมตีเพิ่มขึ้น 10%' },
    { stage: 2, cost: 8, bonus: 'HP +15%', bonus_th: 'HP เพิ่มขึ้น 15%' },
    { stage: 3, cost: 12, bonus: 'Breaker Strike DMG +25%', bonus_th: 'ดาเมจสกิล Breaker Strike เพิ่มขึ้น 25%' },
    { stage: 4, cost: 15, bonus: 'DEF +20%, SPD +5', bonus_th: 'ป้องกันเพิ่ม 20% และความเร็วเพิ่ม 5' },
    { stage: 5, cost: 20, bonus: 'Ultimate Upgrade', bonus_th: 'อัปเกรดสกิล Ultimate ให้มีพื้นที่โจมตีขยายขึ้น' },
  ],
  tags: ['ดาเมจ', 'แนวหน้า', 'ลดเกราะ'],
  is_limited: false,
  release_date: '2022-09-28',
  created_at: '', updated_at: '',
}

export function CharacterDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [character, setCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('slug', slug)
        .single()
      setCharacter(data || (slug === 'rahu' ? DEMO_CHAR : null))
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
  const skills = character.skills as CharacterSkill[] | null
  const shackles = character.shackles as Array<{ stage: number; cost: number; bonus: string; bonus_th: string }> | null

  const maxStat = stats ? Math.max(stats.hp / 30, stats.atk, stats.def, stats.res, stats.spd * 5) : 1000

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Back */}
      <Link to="/characters" className="flex items-center gap-1.5 text-sm text-ptn-muted hover:text-ptn-text mb-6 w-fit">
        <ChevronLeft size={16} /> กลับไปหน้าตัวละคร
      </Link>

      {/* Hero Section */}
      <div className="rounded-xl border bg-ptn-surface overflow-hidden mb-6" style={{ borderColor: `${rarityColor}40` }}>
        <div
          className="relative p-6 md:p-8"
          style={{ background: `linear-gradient(135deg, ${rarityColor}15 0%, #12121A 60%)` }}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Portrait */}
            <div
              className="shrink-0 w-32 h-40 md:w-40 md:h-52 rounded-lg border overflow-hidden flex items-center justify-center bg-ptn-elevated"
              style={{ borderColor: `${rarityColor}60` }}
            >
              {character.portrait_url ? (
                <img src={character.portrait_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2"
                  style={{ color: rarityColor }}
                >
                  <div
                    className="w-20 h-20 rounded-full border-2 flex items-center justify-center font-heading font-bold text-4xl"
                    style={{ borderColor: rarityColor }}
                  >
                    {character.name[0]}
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="rarity" value={character.rarity} />
                {character.is_limited && (
                  <span className="flex items-center gap-1 text-xs text-ptn-gold">
                    <Star size={12} className="fill-ptn-gold" /> Limited
                  </span>
                )}
                {character.tags && (character.tags as string[]).map(tag => (
                  <span key={tag} className="text-xs bg-ptn-elevated border border-ptn-border text-ptn-muted px-2 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2" style={{ color: rarityColor }}>
                {character.name}
              </h1>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <InfoItem label="อาชีพ" value={JOB_CLASS_LABEL[character.job_class] || character.job_class} />
                <InfoItem label="ฝ่าย" value={FACTION_LABEL[character.faction] || character.faction.toUpperCase()} />
                {character.release_date && (
                  <InfoItem label="วันที่ออก" value={formatDate(character.release_date, { year: 'numeric', month: 'short', day: 'numeric' })} />
                )}
              </div>

              {character.overview && (
                <p className="text-ptn-muted text-sm leading-relaxed line-clamp-3 md:line-clamp-none">
                  {character.overview.split('\n')[0]}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'ภาพรวม' },
          { id: 'skills', label: 'สกิล' },
          { id: 'stats', label: 'สถิติ' },
          { id: 'shackles', label: 'Shackle Break' },
        ]}
        defaultTab="overview"
      >
        {(activeTab) => (
          <>
            {activeTab === 'overview' && (
              <Card className="p-6">
                <h2 className="font-heading text-lg font-semibold text-ptn-text mb-3">เรื่องราว</h2>
                {character.overview ? (
                  <div className="text-ptn-muted leading-relaxed whitespace-pre-line">
                    {character.overview}
                  </div>
                ) : (
                  <p className="text-ptn-disabled">ยังไม่มีข้อมูล</p>
                )}
              </Card>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-4">
                {skills && skills.length > 0 ? skills.map((skill, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-ptn-elevated border border-ptn-border flex items-center justify-center">
                        {skill.type === 'active' ? (
                          <Zap size={18} className="text-ptn-cyan" />
                        ) : (
                          <Shield size={18} className="text-ptn-purple" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-semibold text-ptn-text">{skill.name_th}</h3>
                          <span className="text-xs text-ptn-muted">({skill.name})</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${skill.type === 'active' ? 'text-ptn-cyan border-ptn-cyan/30 bg-ptn-cyan/10' : 'text-ptn-purple border-ptn-purple/30 bg-ptn-purple/10'}`}>
                            {skill.type === 'active' ? 'แอคทีฟ' : 'พาสซีฟ'}
                          </span>
                          {skill.cost && (
                            <span className="text-xs text-ptn-gold">Cost: {skill.cost}</span>
                          )}
                        </div>
                        <p className="text-sm text-ptn-muted leading-relaxed">{skill.description_th}</p>
                      </div>
                    </div>
                  </Card>
                )) : (
                  <Card className="p-6 text-center text-ptn-disabled">ยังไม่มีข้อมูลสกิล</Card>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <Card className="p-6">
                <h2 className="font-heading text-lg font-semibold text-ptn-text mb-4">สถิติพื้นฐาน</h2>
                {stats ? (
                  <div className="space-y-4">
                    {[
                      { key: 'hp', label: 'HP', icon: Heart, value: stats.hp, max: maxStat * 30, color: '#10B981' },
                      { key: 'atk', label: 'พลังโจมตี', icon: Sword, value: stats.atk, max: maxStat, color: '#C8102E' },
                      { key: 'def', label: 'ป้องกัน', icon: Shield, value: stats.def, max: maxStat, color: '#60A5FA' },
                      { key: 'res', label: 'ต้านทาน', icon: Shield, value: stats.res, max: maxStat, color: '#6B5CE7' },
                      { key: 'spd', label: 'ความเร็ว', icon: Zap, value: stats.spd, max: maxStat / 5, color: '#F59E0B' },
                    ].map(({ key, label, icon: Icon, value, max, color }) => (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="flex items-center gap-2 text-sm text-ptn-muted">
                            <Icon size={14} style={{ color }} />{label}
                          </span>
                          <span className="text-sm font-medium text-ptn-text">{value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ptn-elevated overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ptn-disabled text-center">ยังไม่มีข้อมูลสถิติ</p>
                )}
              </Card>
            )}

            {activeTab === 'shackles' && (
              <div className="space-y-3">
                {shackles && shackles.length > 0 ? shackles.map((s) => (
                  <Card key={s.stage} className="p-4 flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-full border-2 border-ptn-red/50 bg-ptn-red/10 flex items-center justify-center">
                      <span className="font-heading font-bold text-ptn-red text-sm">{s.stage}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-ptn-text">{s.bonus_th}</p>
                      <p className="text-xs text-ptn-muted mt-0.5">{s.bonus} · ต้องการ {s.cost} Shackle Stones</p>
                    </div>
                  </Card>
                )) : (
                  <Card className="p-6 text-center text-ptn-disabled">ยังไม่มีข้อมูล Shackle Break</Card>
                )}
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ptn-elevated rounded-lg border border-ptn-border p-2.5">
      <p className="text-xs text-ptn-disabled mb-0.5">{label}</p>
      <p className="text-sm font-medium text-ptn-text">{value}</p>
    </div>
  )
}
