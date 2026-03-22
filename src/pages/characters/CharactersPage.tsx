import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Star, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { PageLoader } from '../../components/ui/Spinner'
import { RARITY_COLORS, JOB_CLASS_LABEL } from '../../lib/constants'
import { cn } from '../../lib/utils'

const DEMO_CHARACTERS: Character[] = [
  { id:'1', name:'Rahu', slug:'rahu', rarity:'S', faction:'mbcc', job_class:'breaker', portrait_url:null, splash_url:null, overview:'หัวหน้าทีม MBCC ผู้มีพลังชนิดพิเศษ', stats:null, skills:null, shackles:null, tags:['ดาเมจ','บอส'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
  { id:'2', name:'Hecate', slug:'hecate', rarity:'S', faction:'mbcc', job_class:'arcane', portrait_url:null, splash_url:null, overview:'นักเวทย์ผู้ทรงพลัง เชี่ยวชาญการโจมตีระยะไกล', stats:null, skills:null, shackles:null, tags:['ผู้สนับสนุน','เวทมนตร์'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
  { id:'3', name:'Hamel', slug:'hamel', rarity:'S', faction:'criminal', job_class:'fury', portrait_url:null, splash_url:null, overview:'นักต่อสู้ที่รุนแรง มีความสามารถในการโจมตีระยะประชิด', stats:null, skills:null, shackles:null, tags:['ดาเมจ','แนวหน้า'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
  { id:'4', name:'Langley', slug:'langley', rarity:'A', faction:'mbcc', job_class:'guard', portrait_url:null, splash_url:null, overview:'นักป้องกันที่แข็งแกร่ง ช่วยป้องกันทีม', stats:null, skills:null, shackles:null, tags:['แทงก์','ป้องกัน'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
  { id:'5', name:'Nox', slug:'nox', rarity:'A', faction:'criminal', job_class:'inclusion', portrait_url:null, splash_url:null, overview:'ผู้รักษาที่มีทักษะการรักษาเยี่ยมยอด', stats:null, skills:null, shackles:null, tags:['ผู้รักษา','ผู้สนับสนุน'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
  { id:'6', name:'Vee', slug:'vee', rarity:'B', faction:'mbcc', job_class:'reticle', portrait_url:null, splash_url:null, overview:'มือปืนฝีมือดี ยิงได้ไกลและแม่นยำ', stats:null, skills:null, shackles:null, tags:['ระยะไกล','ดาเมจ'], is_limited:false, release_date:'2022-09-28', created_at:'', updated_at:'' },
]

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterFaction, setFilterFaction] = useState('')

  useEffect(() => {
    const fetchCharacters = async () => {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .order('rarity')
        .order('name')
      setCharacters(data && data.length > 0 ? data : DEMO_CHARACTERS)
      setLoading(false)
    }
    fetchCharacters()
  }, [])

  const filtered = characters.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchRarity = !filterRarity || c.rarity === filterRarity
    const matchClass = !filterClass || c.job_class === filterClass
    const matchFaction = !filterFaction || c.faction === filterFaction
    return matchSearch && matchRarity && matchClass && matchFaction
  })

  const rarities = [...new Set(characters.map(c => c.rarity))].sort()
  const classes = [...new Set(characters.map(c => c.job_class))]
  const factions = [...new Set(characters.map(c => c.faction))]

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-ptn-text flex items-center gap-3">
          <Users size={28} className="text-ptn-cyan" />
          ฐานข้อมูลตัวละคร
        </h1>
        <p className="text-ptn-muted mt-1">ตัวละครทั้งหมด {characters.length} ตัว</p>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          placeholder="ค้นหาตัวละคร..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={<Search size={14} />}
        />
        <Select value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
          <option value="">ทุก Rank</option>
          {rarities.map(r => (
            <option key={r} value={r}>{r}-Rank</option>
          ))}
        </Select>
        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">ทุกอาชีพ</option>
          {classes.map(c => (
            <option key={c} value={c}>{JOB_CLASS_LABEL[c] || c}</option>
          ))}
        </Select>
        <Select value={filterFaction} onChange={e => setFilterFaction(e.target.value)}>
          <option value="">ทุกฝ่าย</option>
          {factions.map(f => (
            <option key={f} value={f}>{f.toUpperCase()}</option>
          ))}
        </Select>
      </div>

      {/* Rarity quick filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter size={14} className="text-ptn-muted" />
        {['', 'S', 'A', 'B', 'C'].map(r => (
          <button
            key={r}
            onClick={() => setFilterRarity(r)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium border transition-colors',
              filterRarity === r
                ? 'border-ptn-red bg-ptn-red/10 text-ptn-red'
                : 'border-ptn-border text-ptn-muted hover:border-ptn-red/40',
            )}
          >
            {r || 'ทั้งหมด'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ptn-muted">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p>ไม่พบตัวละครที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map(char => (
            <CharacterCard key={char.id} character={char} />
          ))}
        </div>
      )}
    </div>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const rarityColor = RARITY_COLORS[character.rarity]

  return (
    <Link to={`/characters/${character.slug}`}>
      <div
        className={cn(
          'group relative rounded-lg border bg-ptn-surface overflow-hidden',
          'transition-all duration-200 hover:shadow-ptn-red hover:-translate-y-0.5',
        )}
        style={{ borderColor: `${rarityColor}40` }}
      >
        {/* Portrait */}
        <div
          className="relative aspect-[3/4] bg-ptn-elevated flex items-center justify-center overflow-hidden"
          style={{ background: `linear-gradient(180deg, ${rarityColor}15 0%, #12121A 100%)` }}
        >
          {character.portrait_url ? (
            <img
              src={character.portrait_url}
              alt={character.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 opacity-40">
              <div
                className="w-16 h-16 rounded-full border-2 flex items-center justify-center font-heading font-bold text-2xl"
                style={{ borderColor: rarityColor, color: rarityColor }}
              >
                {character.name[0]}
              </div>
            </div>
          )}

          {/* Rarity badge */}
          <div
            className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded text-xs font-bold font-heading"
            style={{ background: rarityColor, color: '#0A0A0F' }}
          >
            {character.rarity}
          </div>

          {/* Limited badge */}
          {character.is_limited && (
            <div className="absolute top-1.5 left-1.5">
              <Star size={12} className="text-ptn-gold fill-ptn-gold" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-2">
          <p className="font-heading font-semibold text-ptn-text text-sm truncate group-hover:text-ptn-red transition-colors">
            {character.name}
          </p>
          <p className="text-xs text-ptn-muted capitalize">
            {JOB_CLASS_LABEL[character.job_class] || character.job_class}
          </p>
        </div>
      </div>
    </Link>
  )
}
