import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { PageLoader } from '../../components/ui/Spinner'
import { JOB_CLASS_LABEL } from '../../lib/constants'
import { cn } from '../../lib/utils'

const G = (n: string) =>
  `https://raw.githubusercontent.com/NowhereArchive/NowhereImages/main/CroppedSplash/${n}.png`

type C = Character

const mk = (
  id: string, name: string, slug: string,
  rarity: 'S'|'A'|'B'|'C', faction: string, job_class: string,
  img: string|null, mbcc: string, overview = '', is_limited = false
): C => ({
  id, name, slug, rarity, faction, job_class,
  portrait_url: img, splash_url: null,
  overview, stats: null, skills: null, shackles: null,
  tags: [mbcc], is_limited,
  release_date: null, created_at: '', updated_at: '',
})

// ลำดับตาม s1n.gg/sinners (ใหม่ → เก่า)
const DEMO_CHARACTERS: C[] = [
  // === UNRELEASED / NEW ===
  mk('jichuan',        'Jichuan',          'jichuan',          'S','mbcc',     'arcane',    null,           'MBCC-S-124'),
  mk('xiaofeng',       'Xiaofeng',         'xiaofeng',         'S','mbcc',     'fury',      null,           'MBCC-S-108'),
  mk('ayiguo',         'Ayiguo',           'ayiguo',           'S','mbcc',     'breaker',   null,           'MBCC-S-808'),
  mk('lichen',         'Lichen',           'lichen',           'S','criminal', 'arcane',    G('lichen'),    'MBCC-S-396'),
  mk('k-hitomi',       'Kisugi Hitomi',    'kisugi-hitomi',    'S','criminal', 'fury',      null,           'Data Unknown'),
  mk('k-rui',          'Kisugi Rui',       'kisugi-rui',       'S','criminal', 'arcane',    null,           'Data Unknown'),
  mk('k-ai',           'Kisugi Ai',        'kisugi-ai',        'S','criminal', 'inclusion', null,           'Data Unknown'),
  mk('margaret',       'Margaret',         'margaret',         'S','mbcc',     'guard',     null,           'MBCC-S-029'),
  mk('rust',           'Rust',             'rust',             'S','criminal', 'fury',      null,           'MBCC-S-247'),
  mk('helga',          'Helga',            'helga',            'A','criminal', 'reticle',   null,           'MBCC-S-040'),
  mk('irrheia',        'Irrheia',          'irrheia',          'S','criminal', 'arcane',    null,           'MBCC-S-313'),
  mk('rumina',         'Rumina',           'rumina',           'A','criminal', 'inclusion', null,           'MBCC-S-639'),
  mk('hilda',          'Hilda',            'hilda',            'S','criminal', 'fury',      null,           'MBCC-S-035'),
  mk('ceto',           'Ceto',             'ceto',             'S','criminal', 'arcane',    null,           'MBCC-S-118'),
  mk('ark',            'Ark',              'ark',              'S','criminal', 'inclusion', null,           'MBCC-S-557'),
  mk('augustus',       'Augustus',         'augustus',         'S','criminal', 'arcane',    G('augustus'),  'MBCC-S-005'),
  mk('necresta-hella', 'Necresta Hella',   'necresta-hella',   'S','criminal', 'fury',      G('hella'),     'MBCC-S-098'),
  mk('siglinde',       'Siglinde',         'siglinde',         'S','criminal', 'guard',     G('siglinde'),  'MBCC-S-627'),
  mk('synex',          'Synex',            'synex',            'S','mbcc',     'reticle',   G('synex'),     'MBCC-S-136'),
  mk('thani',          'Thani',            'thani',            'A','criminal', 'breaker',   G('thani'),     'MBCC-S-978'),
  mk('milly',          'Milly',            'milly',            'B','mbcc',     'inclusion', G('milly'),     'MBCC-S-459'),
  mk('cassian',        'Cassian',          'cassian',          'S','mbcc',     'fury',      G('cassian'),   'MBCC-S-310'),
  mk('shin',           'Shin',             'shin',             'S','mbcc',     'fury',      G('shin'),      'MBCC-S-021'),
  mk('poffy',          'Poffy',            'poffy',            'B','mbcc',     'fury',      G('poffy'),     'MBCC-S-580'),
  mk('jasmine',        'Jasmine',          'jasmine',          'A','criminal', 'arcane',    G('jasmine'),   'MBCC-S-105'),
  mk('parfait',        'Parfait',          'parfait',          'A','criminal', 'inclusion', G('parfait'),   'MBCC-S-094'),
  mk('thalia',         'Thalia',           'thalia',           'S','criminal', 'arcane',    G('thalia'),    'MBCC-S-411'),
  mk('hypatia',        'Hypatia',          'hypatia',          'S','mbcc',     'inclusion', G('hypatia'),   'MBCC-S-197'),
  mk('lysandra',       'Lysandra',         'lysandra',         'S','criminal', 'fury',      G('lysandra'),  'MBCC-S-369'),
  mk('graves',         'Graves',           'graves',           'A','criminal', 'guard',     G('graves'),    'MBCC-S-214'),
  mk('luminita',       'Luminita',         'luminita',         'B','criminal', 'reticle',   G('luminita'),  'MBCC-S-413'),
  mk('yingying',       'Yingying',         'yingying',         'A','criminal', 'arcane',    G('yingying'),  'MBCC-S-030'),
  mk('yugu',           'Yugu',             'yugu',             'A','criminal', 'inclusion', G('yugu'),      'MBCC-S-042'),
  mk('wuhuanzi',       'Wuhuanzi',         'wuhuanzi',         'A','criminal', 'arcane',    G('wuhuanzi'),  'MBCC-S-370'),
  mk('jelena',         'Jelena',           'jelena',           'A','criminal', 'fury',      G('jelena'),    'MBCC-S-016'),
  mk('pine',           'Pine',             'pine',             'S','mbcc',     'reticle',   G('pine'),      'MBCC-S-617'),
  mk('pylgia',         'Pylgia',           'pylgia',           'A','criminal', 'breaker',   G('pylgia'),    'MBCC-S-022'),
  mk('zephyr',         'Zephyr',           'zephyr',           'S','mbcc',     'arcane',    G('zephyr'),    'MBCC-S-747'),
  mk('vautour',        'Vautour Bleu',     'vautour-bleu',     'A','criminal', 'guard',     G('vautour'),   'MBCC-S-145'),
  mk('dove',           'Dove',             'dove',             'B','mbcc',     'inclusion', G('dove'),      'MBCC-S-114'),
  mk('korryn',         'Korryn',           'korryn',           'B','criminal', 'guard',     G('korryn'),    'MBCC-S-046'),
  mk('mira',           'Mira',             'mira',             'S','criminal', 'fury',      G('mira'),      'MBCC-S-224'),
  mk('ooo',            'OOO',              'ooo',              'S','criminal', 'arcane',    G('000'),       'MBCC-S-000'),
  mk('moore',          'Moore',            'moore',            'A','criminal', 'guard',     G('moore'),     'MBCC-S-070'),
  mk('rise',           'Rise',             'rise',             'A','criminal', 'fury',      G('rise'),      'MBCC-S-475'),
  mk('ll',             'L.L.',             'll',               'S','criminal', 'arcane',    G('ll'),        'MBCC-S-112'),
  mk('shrooma',        'Shrooma',          'shrooma',          'B','criminal', 'inclusion', G('shrooma'),   'MBCC-S-231'),
  mk('hestia',         'Hestia',           'hestia',           'S','criminal', 'arcane',    G('hestia'),    'MBCC-S-024'),
  mk('jane',           'Jane',             'jane',             'A','criminal', 'guard',     G('jane'),      'MBCC-S-626'),
  mk('bianca',         'Bianca',           'bianca',           'S','mbcc',     'arcane',    G('bianca'),    'MBCC-S-301'),
  mk('shawn',          'Shawn',            'shawn',            'A','mbcc',     'guard',     G('shawn'),     'MBCC-S-885'),
  mk('angell',         'Angell',           'angell',           'A','criminal', 'inclusion', G('angell'),    'MBCC-S-047'),
  mk('golan',          'Golan',            'golan',            'A','criminal', 'breaker',   G('golan'),     'MBCC-S-893'),
  mk('yao',            'Yao',              'yao',              'S','criminal', 'arcane',    G('yao'),       'MBCC-S-192', '', true),
  mk('du_ruo',         'Du Ruo',           'du-ruo',           'A','criminal', 'guard',     G('du_ruo'),    'MBCC-S-143'),
  mk('yanyan',         'Yanyan',           'yanyan',           'A','criminal', 'arcane',    G('yanyan'),    'MBCC-S-307'),
  mk('vanilla',        'Vanilla',          'vanilla',          'A','criminal', 'arcane',    G('vanilla'),   'MBCC-S-025'),
  mk('thistle',        'Thistle',          'thistle',          'S','criminal', 'inclusion', G('thistle'),   'MBCC-S-629'),
  mk('lady_pearl',     'Lady Pearl',       'lady-pearl',       'A','criminal', 'reticle',   G('lady_pearl'),'MBCC-S-033'),
  mk('echo',           'Echo',             'echo',             'A','criminal', 'reticle',   G('echo'),      'MBCC-S-533'),
  mk('donald',         'Donald',           'donald',           'A','criminal', 'guard',     G('donald'),    'MBCC-S-012'),
  mk('matilda',        'Matilda',          'matilda',          'S','mbcc',     'fury',      G('matilda'),   'MBCC-S-745'),
  mk('eve',            'Eve',              'eve',              'A','criminal', 'arcane',    G('eve'),       'MBCC-S-314'),
  mk('eureka',         'Eureka',           'eureka',           'A','mbcc',     'arcane',    G('eureka'),    'MBCC-S-420'),
  mk('eleven',         'Eleven',           'eleven',           'A','mbcc',     'breaker',   G('eleven'),    'MBCC-S-300'),
  mk('nino',           'Nino',             'nino',             'S','criminal', 'inclusion', G('nino'),      'MBCC-S-729'),
  mk('mantis',         'Mantis',           'mantis',           'B','criminal', 'breaker',   G('mantis'),    'MBCC-S-026'),
  mk('cassia',         'Cassia',           'cassia',           'S','mbcc',     'arcane',    G('cassia'),    'MBCC-S-560'),
  mk('shalom',         'Shalom',           'shalom',           'S','criminal', 'inclusion', G('shalom'),    'MBCC-S-017'),
  mk('coquelic',       'Coquelic',         'coquelic',         'S','criminal', 'fury',      G('coquelic'),  'MBCC-S-053'),
  mk('christina',      'Christina',        'christina',        'A','criminal', 'inclusion', G('christina'), 'MBCC-S-189'),
  mk('rahu',           'Rahu',             'rahu',             'S','mbcc',     'breaker',   G('rahu'),      'MBCC-S-048'),
  mk('garofano',       'Garofano',         'garofano',         'A','mbcc',     'arcane',    G('garofano'),  'MBCC-S-514'),
  mk('cabernet',       'Cabernet',         'cabernet',         'S','criminal', 'arcane',    G('cabernet'),  'MBCC-S-079'),
  mk('lamia',          'Lamia',            'lamia',            'A','mbcc',     'inclusion', G('lamia'),     'MBCC-S-166'),
  mk('adela',          'Adela',            'adela',            'B','criminal', 'breaker',   G('adela'),     'MBCC-S-706'),
  mk('letta',          'Letta',            'letta',            'S','criminal', 'inclusion', G('letta'),     'MBCC-S-462'),
  mk('dreya',          'Dreya',            'dreya',            'A','criminal', 'inclusion', G('dreya'),     'MBCC-S-087'),
  mk('uni',            'Uni',              'uni',              'A','mbcc',     'reticle',   G('uni'),       'MBCC-S-221'),
  mk('raven',          'Raven',            'raven',            'A','criminal', 'fury',      G('raven'),     'MBCC-S-074'),
  mk('corso',          'Corso',            'corso',            'S','criminal', 'fury',      G('corso'),     'MBCC-S-343'),
  mk('etti',           'Etti',             'etti',             'A','criminal', 'reticle',   G('etti'),      'MBCC-S-020'),
  mk('levy',           'Levy',             'levy',             'A','criminal', 'reticle',   G('levy'),      'MBCC-S-395'),
  mk('deren',          'Deren',            'deren',            'A','criminal', 'arcane',    G('deren'),     'MBCC-S-014'),
  mk('owo',            'OwO',              'owo',              'A','mbcc',     'arcane',    G('owo'),       'MBCC-S-168'),
  mk('lynn',           'Lynn',             'lynn',             'A','criminal', 'arcane',    G('lynn'),      'MBCC-S-717'),
  mk('oak_casket',     'Oak Casket',       'oak-casket',       'A','criminal', 'arcane',    G('oak_casket'),'MBCC-S-075'),
  mk('dudu',           'Dudu',             'dudu',             'A','mbcc',     'inclusion', G('dudu'),      'MBCC-S-037'),
  mk('enfer',          'Enfer',            'enfer',            'S','criminal', 'fury',      G('enfer'),     'MBCC-S-641'),
  mk('mcqueen',        'McQueen',          'mcqueen',          'A','mbcc',     'fury',      G('mcqueen'),   'MBCC-S-419'),
  mk('serpent',        'Serpent',          'serpent',          'S','criminal', 'arcane',    G('serpent'),   'MBCC-S-948'),
  mk('mess',           'Mess',             'mess',             'B','criminal', 'inclusion', G('mess'),      'MBCC-S-367'),
  mk('stargazer',      'Stargazer',        'stargazer',        'S','criminal', 'arcane',    G('stargazer'), 'MBCC-S-023'),
  mk('kawa_kawa',      'Kawa-Kawa',        'kawa-kawa',        'A','criminal', 'arcane',    G('kawa-kawa'), 'MBCC-S-360'),
  mk('zoya',           'Zoya',             'zoya',             'A','mbcc',     'inclusion', G('zoya'),      'MBCC-S-028'),
  mk('bai_yi',         'Bai Yi',           'bai-yi',           'S','mbcc',     'arcane',    G('bai_yi'),    'MBCC-S-027'),
  mk('summer',         'Summer',           'summer',           'A','mbcc',     'fury',      G('summer'),    'MBCC-S-011'),
  mk('anne',           'Anne',             'anne',             'A','mbcc',     'arcane',    G('anne'),      'MBCC-S-404'),
  mk('ariel',          'Ariel',            'ariel',            'S','criminal', 'fury',      G('ariel'),     'MBCC-S-193'),
  mk('chameleon',      'Chameleon',        'chameleon',        'A','criminal', 'reticle',   G('chameleon'), 'MBCC-S-052'),
  mk('cinnabar',       'Cinnabar',         'cinnabar',         'A','criminal', 'inclusion', G('cinnabar'),  'MBCC-S-299'),
  mk('chelsea',        'Countess Chelsea', 'countess-chelsea', 'A','criminal', 'reticle',   G('chelsea'),   'MBCC-S-148'),
  mk('crache',         'Crache',           'crache',           'A','criminal', 'fury',      G('crache'),    'MBCC-S-073'),
  mk('demon',          'Demon',            'demon',            'S','criminal', 'fury',      G('demon'),     'MBCC-S-013'),
  mk('eirene',         'Eirene',           'eirene',           'A','mbcc',     'inclusion', G('eirene'),    'MBCC-S-009'),
  mk('hamel',          'Hamel',            'hamel',            'S','criminal', 'fury',      G('hamel'),     'MBCC-S-008'),
  mk('langley',        'Langley',          'langley',          'S','mbcc',     'guard',     G('langley'),   'MBCC-S-006'),
  mk('nox',            'NOX',              'nox',              'A','criminal', 'inclusion', G('nox'),       'MBCC-S-NOX'),
  mk('dolly',          'Dolly',            'dolly',            'B','mbcc',     'reticle',   G('dolly'),     'MBCC-S-311'),
  mk('hecate',         'Hecate',           'hecate',           'S','mbcc',     'arcane',    G('hecate'),    'MBCC-S-019'),
  mk('horo',           'Horo',             'horo',             'A','criminal', 'arcane',    G('horo'),      'MBCC-S-186'),
  mk('ignis',          'Ignis',            'ignis',            'A','criminal', 'breaker',   G('ignis'),     'MBCC-S-051'),
  mk('iron',           'Iron',             'iron',             'B','criminal', 'breaker',   G('iron'),      'MBCC-S-062'),
  mk('luvia_ray',      'Luvia Ray',        'luvia-ray',        'A','mbcc',     'reticle',   G('luvia_ray'), 'MBCC-S-341'),
  mk('mrfox',          'Mr. Fox',          'mr-fox',           'A','criminal', 'guard',     G('mrfox'),     'MBCC-S-077'),
  mk('ninety_nine',    'Ninety-Nine',      'ninety-nine',      'A','mbcc',     'reticle',   G('ninety-nine'),'MBCC-S-099'),
  mk('oliver',         'Oliver',           'oliver',           'A','criminal', 'guard',     G('oliver'),    'MBCC-S-188'),
  mk('pacassi',        'Pacassi',          'pacassi',          'A','mbcc',     'inclusion', G('pacassi'),   'MBCC-S-235'),
  mk('pricilla',       'Pricilla',         'pricilla',         'A','mbcc',     'guard',     G('pricilla'),  'MBCC-S-067'),
  mk('roulecca',       'Roulecca',         'roulecca',         'A','criminal', 'arcane',    G('roulecca'),  'MBCC-S-646'),
  mk('sumire',         'Sumire',           'sumire',           'A','criminal', 'arcane',    G('sumire'),    'MBCC-S-120'),
  mk('tetra',          'Tetra',            'tetra',            'A','mbcc',     'reticle',   G('tetra'),     'MBCC-S-071'),
  mk('victoria',       'Victoria',         'victoria',         'S','criminal', 'arcane',    G('victoria'),  'MBCC-S-103'),
  mk('wendy',          'Wendy',            'wendy',            'B','mbcc',     'reticle',   G('wendy'),     'MBCC-S-084'),
  mk('wolverine',      'Wolverine',        'wolverine',        'S','collab',   'fury',      G('wolverine'), 'MBCC-S-076', '', true),
  mk('che',            'Che',              'che',              'A','criminal', 'arcane',    G('che'),       'MBCC-S-270'),
  mk('demolia',        'Demolia',          'demolia',          'S','mbcc',     'fury',      G('demolia'),   'MBCC-S-117'),
  mk('emp',            'EMP',              'emp',              'A','mbcc',     'arcane',    G('emp'),       'MBCC-S-107'),
  mk('flora',          'Flora',            'flora',            'A','criminal', 'arcane',    G('flora'),     'MBCC-S-135'),
  mk('gekkabijin',     'Gekkabijin',       'gekkabijin',       'S','criminal', 'arcane',    G('gekkabijin'),'MBCC-S-445'),
  mk('hella',          'Hella',            'hella',            'A','criminal', 'fury',      G('hella'),     'MBCC-S-098'),
  mk('joan',           'Joan',             'joan',             'A','mbcc',     'guard',     G('joan'),      'MBCC-S-237'),
  mk('kelvin',         'Kelvin',           'kelvin',           'S','mbcc',     'arcane',    G('kelvin'),    'MBCC-S-592'),
  mk('kk',             'K.K.',             'kk',               'A','mbcc',     'arcane',    G('kk'),        'MBCC-S-217'),
  mk('labyrinth',      'Labyrinth',        'labyrinth',        'S','mbcc',     'breaker',   G('labyrinth'), 'MBCC-S-101'),
  mk('lisa',           'Lisa',             'lisa',             'S','criminal', 'fury',      G('lisa'),      'MBCC-S-355'),
  mk('macchiato',      'Macchiato',        'macchiato',        'A','criminal', 'inclusion', G('macchiato'), 'MBCC-S-555'),
  mk('peggy',          'Peggy',            'peggy',            'B','mbcc',     'inclusion', G('peggy'),     'MBCC-S-500'),
  mk('pepper',         'Pepper',           'pepper',           'B','criminal', 'reticle',   G('pepper'),    'MBCC-S-250'),
  // CN EXCLUSIVE
  mk('jolyne',         'Jolyne Cujoh',     'jolyne-cujoh',     'S','collab',   'fury',      G('jolyne_cujoh'),    'FE-40536', '', true),
  mk('jotaro',         'Jotaro Kujo',      'jotaro-kujo',      'A','collab',   'breaker',   G('kujo_jotaro'),     'UNKNOWN',  '', true),
  mk('ermes',          'Ermes Costello',   'ermes-costello',   'A','collab',   'fury',      G('ermes_costello'),  'FE-40513', '', true),
  mk('ff',             'F.F.',             'ff',               'S','collab',   'inclusion', G('ff'),              'FE-39424', '', true),
  mk('narciso',        'Narciso Anastasia','narciso-anastasia', 'S','collab',   'arcane',    G('narciso_anastasia'),'MA-28050', '', true),
  mk('weather',        'Weather Forecast', 'weather-forecast', 'S','collab',   'arcane',    G('weatherforecast'), 'MA-152403','', true),
]

const RARITY_COLOR: Record<string, string> = {
  S: '#FFD700', A: '#C8102E', B: '#00D4FF', C: '#888888',
}

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterFaction, setFilterFaction] = useState('')

  useEffect(() => {
    supabase.from('characters').select('*')
      .order('release_date', { ascending: false })
      .order('name')
      .then(({ data }) => {
        setCharacters(data && data.length > 0 ? data : DEMO_CHARACTERS)
        setLoading(false)
      })
  }, [])

  const filtered = characters.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRarity && c.rarity !== filterRarity) return false
    if (filterClass && c.job_class !== filterClass) return false
    if (filterFaction && c.faction !== filterFaction) return false
    return true
  })

  const classes = [...new Set(characters.map(c => c.job_class))].sort()
  const factions = [...new Set(characters.map(c => c.faction))].sort()

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-3xl font-bold text-ptn-text flex items-center gap-3">
          <Users size={28} className="text-ptn-cyan" />
          ฐานข้อมูลตัวละคร
        </h1>
        <p className="text-ptn-muted mt-1">ตัวละครทั้งหมด {characters.length} ตัว</p>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input placeholder="ค้นหาตัวละคร..." value={search}
          onChange={e => setSearch(e.target.value)} icon={<Search size={14} />} />
        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">ทุกอาชีพ</option>
          {classes.map(c => <option key={c} value={c}>{JOB_CLASS_LABEL[c] || c}</option>)}
        </Select>
        <Select value={filterFaction} onChange={e => setFilterFaction(e.target.value)}>
          <option value="">ทุกฝ่าย</option>
          {factions.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
        </Select>
      </div>

      {/* Rarity quick filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter size={14} className="text-ptn-muted" />
        {['', 'S', 'A', 'B'].map(r => (
          <button key={r} onClick={() => setFilterRarity(r)}
            className={cn(
              'px-3 py-1 rounded text-xs font-bold border transition-colors',
              filterRarity === r
                ? 'border-ptn-red bg-ptn-red/10 text-ptn-red'
                : 'border-ptn-border text-ptn-muted hover:border-ptn-red/40'
            )}>
            {r ? `${r}-Rank` : 'ทั้งหมด'}
          </button>
        ))}
        <span className="text-xs text-ptn-disabled ml-2">{filtered.length} ตัว</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ptn-muted">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p>ไม่พบตัวละครที่ตรงกับเงื่อนไข</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 gap-2 md:gap-3">
          {filtered.map(char => <CharacterCard key={char.id} character={char} />)}
        </div>
      )}
    </div>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const color = RARITY_COLOR[character.rarity] || '#888'
  const mbccId = (character.tags as string[])?.[0] || ''
  const isCN = character.is_limited && character.faction === 'collab'

  return (
    <Link to={`/characters/${character.slug}`} className="group block">
      <div className="relative rounded-lg overflow-hidden aspect-[2/3] bg-ptn-elevated border border-white/5
        transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-white/20">

        {/* Art */}
        {character.portrait_url ? (
          <img src={character.portrait_url} alt={character.name}
            className="absolute inset-0 w-full h-full object-cover object-top
              transition-transform duration-500 group-hover:scale-105"
            loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(180deg,${color}18 0%,#0A0A0F 100%)` }}>
            <span className="font-heading font-bold text-5xl opacity-20" style={{ color }}>
              {character.name[0]}
            </span>
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Rarity diamond — top right */}
        <div className="absolute top-2 right-2 drop-shadow">
          <svg width="16" height="16" viewBox="0 0 16 16">
            <polygon points="8,1 15,8 8,15 1,8" fill={color} />
          </svg>
        </div>

        {/* Badges — top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isCN && (
            <span className="text-[8px] font-bold bg-ptn-red text-white px-1 py-0.5 rounded tracking-wider leading-none">
              CN
            </span>
          )}
          {character.is_limited && !isCN && (
            <span className="text-[8px] font-bold bg-ptn-gold text-ptn-bg px-1 py-0.5 rounded tracking-wider leading-none">
              LTD
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2 pt-6">
          <p className="font-heading font-bold text-white text-sm leading-tight drop-shadow truncate">
            {character.name}
          </p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: `${color}aa` }}>
            {mbccId}
          </p>
          {/* Rarity color bar at bottom */}
          <div className="mt-1.5 h-[2px] rounded-full w-full" style={{ background: color, opacity: 0.6 }} />
        </div>
      </div>
    </Link>
  )
}
