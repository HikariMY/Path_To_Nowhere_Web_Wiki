import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Users, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Character } from '../../types'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { PageLoader } from '../../components/ui/Spinner'
import { JOB_CLASS_LABEL, ALIGNMENT_LABEL, ALIGNMENT_ICON } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { ABILITY_TAG_GROUPS } from '../../lib/abilityTags'

// ── Tendency icons from /TenIcon/ ────────────────────────────────────────
const TENDENCY_ICON_PATH: Record<string, string> = {
  fury:      '/TenIcon/fury.png',
  arcane:    '/TenIcon/arcane.png',
  breaker:   '/TenIcon/umbra.png',
  guard:     '/TenIcon/endura.png',
  inclusion: '/TenIcon/catalyst.png',
  reticle:   '/TenIcon/reticle.png',
}

const G = (n: string) =>
  `https://raw.githubusercontent.com/NowhereArchive/NowhereImages/main/CroppedSplash/${n}.png`

// ── Alignment per slug ────────────────────────────────────────────────────
const SLUG_ALIGNMENT: Record<string, string> = {
  'jichuan': 'fraud',      'xiaofeng': 'greed',      'ayiguo': 'heresy',
  'lichen': 'immortal',    'kisugi-hitomi': 'infinite','kisugi-rui': 'infinite',
  'kisugi-ai': 'infinite', 'margaret': 'death',       'rust': 'treachery',
  'helga': 'famine',       'irrheia': 'fraud',        'rumina': 'love',
  'hilda': 'sequester',    'ceto': 'war',             'ark': 'love',
  'augustus': 'war',       'necresta-hella': 'famine','siglinde': 'war',
  'synex': 'famine',       'thani': 'famine',         'milly': 'death',
  'cassian': 'sloth',      'shin': 'immortal',        'poffy': 'sloth',
  'jasmine': 'war',        'parfait': 'death',        'thalia': 'greed',
  'hypatia': 'famine',     'lysandra': 'violence',    'graves': 'death',
  'luminita': 'sloth',     'yingying': 'love',        'yugu': 'fraud',
  'wuhuanzi': 'sloth',     'jelena': 'love',          'pine': 'pestilence',
  'pylgia': 'immortal',    'zephyr': 'love',          'vautour-bleu': 'famine',
  'dove': 'famine',        'korryn': 'famine',        'mira': 'famine',
  'ooo': 'pestilence',     'moore': 'pestilence',     'rise': 'pestilence',
  'll': 'pestilence',      'shrooma': 'pestilence',   'hestia': 'immortal',
  'jane': 'violence',      'bianca': 'pestilence',    'shawn': 'fraud',
  'angell': 'pestilence',  'golan': 'pestilence',     'yao': 'limbo',
  'du-ruo': 'fraud',       'yanyan': 'heresy',        'vanilla': 'immortal',
  'thistle': 'love',       'lady-pearl': 'sloth',     'echo': 'fraud',
  'donald': 'treachery',   'matilda': 'sloth',        'eve': 'love',
  'eureka': 'limbo',       'eleven': 'sloth',         'nino': 'limbo',
  'mantis': 'immortal',    'cassia': 'love',          'shalom': 'sloth',
  'coquelic': 'limbo',     'christina': 'anger',      'rahu': 'anger',
  'garofano': 'sloth',     'cabernet': 'sloth',       'lamia': 'heresy',
  'adela': 'sloth',        'letta': 'fraud',          'dreya': 'immortal',
  'uni': 'love',           'raven': 'fraud',          'corso': 'violence',
  'etti': 'fraud',         'levy': 'greed',           'deren': 'fraud',
  'owo': 'sloth',          'lynn': 'sloth',           'oak-casket': 'sloth',
  'dudu': 'sloth',         'enfer': 'limbo',          'mcqueen': 'treachery',
  'serpent': 'love',       'mess': 'heresy',          'stargazer': 'heresy',
  'kawa-kawa': 'heresy',   'zoya': 'violence',        'bai-yi': 'treachery',
  'crache': 'limbo',       'demon': 'anger',          'eirene': 'greed',
  'hamel': 'love',         'langley': 'treachery',    'nox': 'limbo',
  'summer': 'heresy',      'anne': 'love',            'ariel': 'love',
  'chameleon': 'heresy',   'cinnabar': 'treachery',   'countess-chelsea': 'greed',
  'dolly': 'violence',     'hecate': 'limbo',         'horo': 'anger',
  'ignis': 'heresy',       'iron': 'anger',           'luvia-ray': 'limbo',
  'mr-fox': 'greed',       'ninety-nine': 'violence', 'oliver': 'treachery',
  'pacassi': 'love',       'pricilla': 'greed',       'roulecca': 'anger',
  'sumire': 'love',        'tetra': 'greed',          'victoria': 'limbo',
  'wendy': 'violence',     'wolverine': 'violence',   'che': 'limbo',
  'demolia': 'limbo',      'emp': 'treachery',        'flora': 'treachery',
  'gekkabijin': 'love',    'hella': 'violence',       'joan': 'anger',
  'kelvin': 'treachery',   'kk': 'violence',          'labyrinth': 'anger',
  'lisa': 'heresy',        'macchiato': 'heresy',     'peggy': 'greed',
  'pepper': 'greed',       'jolyne-cujoh': 'infinite','jotaro-kujo': 'infinite',
  'ermes-costello': 'infinite', 'ff': 'infinite',     'narciso-anastasia': 'infinite',
  'weather-forecast': 'infinite',
}

// collab (CN Exclusive) characters
const COLLAB_SLUGS = new Set([
  'wolverine', 'jolyne-cujoh', 'jotaro-kujo', 'ermes-costello',
  'ff', 'narciso-anastasia', 'weather-forecast',
])

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
  mk('jichuan',        'Jichuan',          'jichuan',          'S','mbcc',     'inclusion', null,           'MBCC-S-124'),
  mk('xiaofeng',       'Xiaofeng',         'xiaofeng',         'S','mbcc',     'fury',      null,           'MBCC-S-108'),
  mk('ayiguo',         'Ayiguo',           'ayiguo',           'S','mbcc',     'guard',     null,           'MBCC-S-808'),
  mk('lichen',         'Lichen',           'lichen',           'S','criminal', 'guard',     G('lichen'),    'MBCC-S-396'),
  mk('k-hitomi',       'Kisugi Hitomi',    'kisugi-hitomi',    'S','criminal', 'breaker',   null,           'Data Unknown'),
  mk('k-rui',          'Kisugi Rui',       'kisugi-rui',       'S','criminal', 'arcane',    null,           'Data Unknown'),
  mk('k-ai',           'Kisugi Ai',        'kisugi-ai',        'S','criminal', 'inclusion', null,           'Data Unknown'),
  mk('margaret',       'Margaret',         'margaret',         'S','mbcc',     'inclusion', null,           'MBCC-S-029'),
  mk('rust',           'Rust',             'rust',             'S','criminal', 'guard',     null,           'MBCC-S-247'),
  mk('helga',          'Helga',            'helga',            'A','criminal', 'reticle',   null,           'MBCC-S-040'),
  mk('irrheia',        'Irrheia',          'irrheia',          'S','criminal', 'inclusion', null,           'MBCC-S-313'),
  mk('rumina',         'Rumina',           'rumina',           'A','criminal', 'guard',     null,           'MBCC-S-639'),
  mk('hilda',          'Hilda',            'hilda',            'S','criminal', 'arcane',    null,           'MBCC-S-035'),
  mk('ceto',           'Ceto',             'ceto',             'S','criminal', 'breaker',   null,           'MBCC-S-118'),
  mk('ark',            'Ark',              'ark',              'S','criminal', 'fury',      null,           'MBCC-S-557'),
  mk('augustus',       'Augustus',         'augustus',         'S','criminal', 'reticle',   G('augustus'),  'MBCC-S-005'),
  mk('necresta-hella', 'Necresta Hella',   'necresta-hella',   'S','criminal', 'breaker',   G('hella'),     'MBCC-S-098'),
  mk('siglinde',       'Siglinde',         'siglinde',         'S','criminal', 'guard',     G('siglinde'),  'MBCC-S-627'),
  mk('synex',          'Synex',            'synex',            'S','mbcc',     'fury',      G('synex'),     'MBCC-S-136'),
  mk('thani',          'Thani',            'thani',            'A','criminal', 'arcane',    G('thani'),     'MBCC-S-978'),
  mk('milly',          'Milly',            'milly',            'B','mbcc',     'arcane',    G('milly'),     'MBCC-S-459'),
  mk('cassian',        'Cassian',          'cassian',          'S','mbcc',     'inclusion', G('cassian'),   'MBCC-S-310'),
  mk('shin',           'Shin',             'shin',             'S','mbcc',     'inclusion', G('shin'),      'MBCC-S-021'),
  mk('poffy',          'Poffy',            'poffy',            'B','mbcc',     'breaker',   G('poffy'),     'MBCC-S-580'),
  mk('jasmine',        'Jasmine',          'jasmine',          'A','criminal', 'fury',      G('jasmine'),   'MBCC-S-105'),
  mk('parfait',        'Parfait',          'parfait',          'A','criminal', 'inclusion', G('parfait'),   'MBCC-S-094'),
  mk('thalia',         'Thalia',           'thalia',           'S','criminal', 'reticle',   G('thalia'),    'MBCC-S-411'),
  mk('hypatia',        'Hypatia',          'hypatia',          'S','mbcc',     'reticle',   G('hypatia'),   'MBCC-S-197'),
  mk('lysandra',       'Lysandra',         'lysandra',         'S','criminal', 'fury',      G('lysandra'),  'MBCC-S-369'),
  mk('graves',         'Graves',           'graves',           'A','criminal', 'breaker',   G('graves'),    'MBCC-S-214'),
  mk('luminita',       'Luminita',         'luminita',         'B','criminal', 'guard',     G('luminita'),  'MBCC-S-413'),
  mk('yingying',       'Yingying',         'yingying',         'A','criminal', 'arcane',    G('yingying'),  'MBCC-S-030'),
  mk('yugu',           'Yugu',             'yugu',             'A','criminal', 'guard',     G('yugu'),      'MBCC-S-042'),
  mk('wuhuanzi',       'Wuhuanzi',         'wuhuanzi',         'A','criminal', 'arcane',    G('wuhuanzi'),  'MBCC-S-370'),
  mk('jelena',         'Jelena',           'jelena',           'A','criminal', 'inclusion', G('jelena'),    'MBCC-S-016'),
  mk('pine',           'Pine',             'pine',             'S','mbcc',     'reticle',   G('pine'),      'MBCC-S-617'),
  mk('pylgia',         'Pylgia',           'pylgia',           'A','criminal', 'fury',      G('pylgia'),    'MBCC-S-022'),
  mk('zephyr',         'Zephyr',           'zephyr',           'S','mbcc',     'inclusion', G('zephyr'),    'MBCC-S-747'),
  mk('vautour',        'Vautour Bleu',     'vautour-bleu',     'A','criminal', 'arcane',    G('vautour'),   'MBCC-S-145'),
  mk('dove',           'Dove',             'dove',             'B','mbcc',     'guard',     G('dove'),      'MBCC-S-114'),
  mk('korryn',         'Korryn',           'korryn',           'B','criminal', 'reticle',   G('korryn'),    'MBCC-S-046'),
  mk('mira',           'Mira',             'mira',             'S','criminal', 'fury',      G('mira'),      'MBCC-S-224'),
  mk('ooo',            'OOO',              'ooo',              'S','criminal', 'breaker',   G('000'),       'MBCC-S-000'),
  mk('moore',          'Moore',            'moore',            'A','criminal', 'guard',     G('moore'),     'MBCC-S-070'),
  mk('rise',           'Rise',             'rise',             'A','criminal', 'fury',      G('rise'),      'MBCC-S-475'),
  mk('ll',             'L.L.',             'll',               'S','criminal', 'inclusion', G('ll'),        'MBCC-S-112'),
  mk('shrooma',        'Shrooma',          'shrooma',          'B','criminal', 'breaker',   G('shrooma'),   'MBCC-S-231'),
  mk('hestia',         'Hestia',           'hestia',           'S','criminal', 'arcane',    G('hestia'),    'MBCC-S-024'),
  mk('jane',           'Jane',             'jane',             'A','criminal', 'reticle',   G('jane'),      'MBCC-S-626'),
  mk('bianca',         'Bianca',           'bianca',           'S','mbcc',     'reticle',   G('bianca'),    'MBCC-S-301'),
  mk('shawn',          'Shawn',            'shawn',            'A','mbcc',     'inclusion', G('shawn'),     'MBCC-S-885'),
  mk('angell',         'Angell',           'angell',           'A','criminal', 'breaker',   G('angell'),    'MBCC-S-047'),
  mk('golan',          'Golan',            'golan',            'A','criminal', 'guard',     G('golan'),     'MBCC-S-893'),
  mk('yao',            'Yao',              'yao',              'S','criminal', 'fury',      G('yao'),       'MBCC-S-192', '', true),
  mk('du_ruo',         'Du Ruo',           'du-ruo',           'A','criminal', 'inclusion', G('du_ruo'),    'MBCC-S-143'),
  mk('yanyan',         'Yanyan',           'yanyan',           'A','criminal', 'reticle',   G('yanyan'),    'MBCC-S-307'),
  mk('vanilla',        'Vanilla',          'vanilla',          'A','criminal', 'guard',     G('vanilla'),   'MBCC-S-025'),
  mk('thistle',        'Thistle',          'thistle',          'S','criminal', 'breaker',   G('thistle'),   'MBCC-S-629'),
  mk('lady_pearl',     'Lady Pearl',       'lady-pearl',       'A','criminal', 'reticle',   G('lady_pearl'),'MBCC-S-033'),
  mk('echo',           'Echo',             'echo',             'A','criminal', 'arcane',    G('echo'),      'MBCC-S-533'),
  mk('donald',         'Donald',           'donald',           'A','criminal', 'fury',      G('donald'),    'MBCC-S-012'),
  mk('matilda',        'Matilda',          'matilda',          'S','mbcc',     'reticle',   G('matilda'),   'MBCC-S-745'),
  mk('eve',            'Eve',              'eve',              'A','criminal', 'inclusion', G('eve'),       'MBCC-S-314'),
  mk('eureka',         'Eureka',           'eureka',           'A','mbcc',     'breaker',   G('eureka'),    'MBCC-S-420'),
  mk('eleven',         'Eleven',           'eleven',           'A','mbcc',     'arcane',    G('eleven'),    'MBCC-S-300'),
  mk('nino',           'Nino',             'nino',             'S','criminal', 'guard',     G('nino'),      'MBCC-S-729'),
  mk('mantis',         'Mantis',           'mantis',           'B','criminal', 'breaker',   G('mantis'),    'MBCC-S-026'),
  mk('cassia',         'Cassia',           'cassia',           'S','mbcc',     'inclusion', G('cassia'),    'MBCC-S-560'),
  mk('shalom',         'Shalom',           'shalom',           'S','criminal', 'reticle',   G('shalom'),    'MBCC-S-017'),
  mk('coquelic',       'Coquelic',         'coquelic',         'S','criminal', 'inclusion', G('coquelic'),  'MBCC-S-053'),
  mk('christina',      'Christina',        'christina',        'A','criminal', 'fury',      G('christina'), 'MBCC-S-189'),
  mk('rahu',           'Rahu',             'rahu',             'S','mbcc',     'guard',     G('rahu'),      'MBCC-S-048'),
  mk('garofano',       'Garofano',         'garofano',         'A','mbcc',     'breaker',   G('garofano'),  'MBCC-S-514'),
  mk('cabernet',       'Cabernet',         'cabernet',         'S','criminal', 'inclusion', G('cabernet'),  'MBCC-S-079'),
  mk('lamia',          'Lamia',            'lamia',            'A','mbcc',     'arcane',    G('lamia'),     'MBCC-S-166'),
  mk('adela',          'Adela',            'adela',            'B','criminal', 'breaker',   G('adela'),     'MBCC-S-706'),
  mk('letta',          'Letta',            'letta',            'S','criminal', 'inclusion', G('letta'),     'MBCC-S-462'),
  mk('dreya',          'Dreya',            'dreya',            'A','criminal', 'reticle',   G('dreya'),     'MBCC-S-087'),
  mk('uni',            'Uni',              'uni',              'A','mbcc',     'guard',     G('uni'),       'MBCC-S-221'),
  mk('raven',          'Raven',            'raven',            'A','criminal', 'arcane',    G('raven'),     'MBCC-S-074'),
  mk('corso',          'Corso',            'corso',            'S','criminal', 'fury',      G('corso'),     'MBCC-S-343'),
  mk('etti',           'Etti',             'etti',             'A','criminal', 'arcane',    G('etti'),      'MBCC-S-020'),
  mk('levy',           'Levy',             'levy',             'A','criminal', 'guard',     G('levy'),      'MBCC-S-395'),
  mk('deren',          'Deren',            'deren',            'A','criminal', 'fury',      G('deren'),     'MBCC-S-014'),
  mk('owo',            'OwO',              'owo',              'A','mbcc',     'guard',     G('owo'),       'MBCC-S-168'),
  mk('lynn',           'Lynn',             'lynn',             'A','criminal', 'breaker',   G('lynn'),      'MBCC-S-717'),
  mk('oak_casket',     'Oak Casket',       'oak-casket',       'A','criminal', 'reticle',   G('oak_casket'),'MBCC-S-075'),
  mk('dudu',           'Dudu',             'dudu',             'A','mbcc',     'inclusion', G('dudu'),      'MBCC-S-037'),
  mk('enfer',          'Enfer',            'enfer',            'S','criminal', 'inclusion', G('enfer'),     'MBCC-S-641'),
  mk('mcqueen',        'McQueen',          'mcqueen',          'A','mbcc',     'breaker',   G('mcqueen'),   'MBCC-S-419'),
  mk('serpent',        'Serpent',          'serpent',          'S','criminal', 'breaker',   G('serpent'),   'MBCC-S-948'),
  mk('mess',           'Mess',             'mess',             'B','criminal', 'fury',      G('mess'),      'MBCC-S-367'),
  mk('stargazer',      'Stargazer',        'stargazer',        'S','criminal', 'arcane',    G('stargazer'), 'MBCC-S-023'),
  mk('kawa_kawa',      'Kawa-Kawa',        'kawa-kawa',        'A','criminal', 'guard',     G('kawa-kawa'), 'MBCC-S-360'),
  mk('zoya',           'Zoya',             'zoya',             'A','mbcc',     'fury',      G('zoya'),      'MBCC-S-028'),
  mk('bai_yi',         'Bai Yi',           'bai-yi',           'S','mbcc',     'breaker',   G('bai_yi'),    'MBCC-S-027'),
  mk('crache',         'Crache',           'crache',           'A','criminal', 'breaker',   G('crache'),    'MBCC-S-073'),
  mk('demon',          'Demon',            'demon',            'S','criminal', 'guard',     G('demon'),     'MBCC-S-013'),
  mk('eirene',         'Eirene',           'eirene',           'A','mbcc',     'arcane',    G('eirene'),    'MBCC-S-009'),
  mk('hamel',          'Hamel',            'hamel',            'S','criminal', 'inclusion', G('hamel'),     'MBCC-S-008'),
  mk('langley',        'Langley',          'langley',          'S','mbcc',     'reticle',   G('langley'),   'MBCC-S-006'),
  mk('nox',            'NOX',              'nox',              'A','criminal', 'fury',      G('nox'),       'MBCC-S-NOX'),
  mk('summer',         'Summer',           'summer',           'A','mbcc',     'reticle',   G('summer'),    'MBCC-S-011'),
  mk('anne',           'Anne',             'anne',             'A','mbcc',     'inclusion', G('anne'),      'MBCC-S-404'),
  mk('ariel',          'Ariel',            'ariel',            'S','criminal', 'inclusion', G('ariel'),     'MBCC-S-193'),
  mk('chameleon',      'Chameleon',        'chameleon',        'A','criminal', 'inclusion', G('chameleon'), 'MBCC-S-052'),
  mk('cinnabar',       'Cinnabar',         'cinnabar',         'A','criminal', 'guard',     G('cinnabar'),  'MBCC-S-299'),
  mk('chelsea',        'Countess Chelsea', 'countess-chelsea', 'A','criminal', 'guard',     G('chelsea'),   'MBCC-S-148'),
  mk('dolly',          'Dolly',            'dolly',            'B','mbcc',     'fury',      G('dolly'),     'MBCC-S-311'),
  mk('hecate',         'Hecate',           'hecate',           'S','mbcc',     'arcane',    G('hecate'),    'MBCC-S-019'),
  mk('horo',           'Horo',             'horo',             'A','criminal', 'fury',      G('horo'),      'MBCC-S-186'),
  mk('ignis',          'Ignis',            'ignis',            'A','criminal', 'arcane',    G('ignis'),     'MBCC-S-051'),
  mk('iron',           'Iron',             'iron',             'B','criminal', 'breaker',   G('iron'),      'MBCC-S-062'),
  mk('luvia_ray',      'Luvia Ray',        'luvia-ray',        'A','mbcc',     'arcane',    G('luvia_ray'), 'MBCC-S-341'),
  mk('mrfox',          'Mr. Fox',          'mr-fox',           'A','criminal', 'inclusion', G('mrfox'),     'MBCC-S-077'),
  mk('ninety_nine',    'Ninety-Nine',      'ninety-nine',      'A','mbcc',     'fury',      G('ninety-nine'),'MBCC-S-099'),
  mk('oliver',         'Oliver',           'oliver',           'A','criminal', 'arcane',    G('oliver'),    'MBCC-S-188'),
  mk('pacassi',        'Pacassi',          'pacassi',          'A','mbcc',     'fury',      G('pacassi'),   'MBCC-S-235'),
  mk('pricilla',       'Pricilla',         'pricilla',         'A','mbcc',     'reticle',   G('pricilla'),  'MBCC-S-067'),
  mk('roulecca',       'Roulecca',         'roulecca',         'A','criminal', 'reticle',   G('roulecca'),  'MBCC-S-646'),
  mk('sumire',         'Sumire',           'sumire',           'A','criminal', 'breaker',   G('sumire'),    'MBCC-S-120'),
  mk('tetra',          'Tetra',            'tetra',            'A','mbcc',     'breaker',   G('tetra'),     'MBCC-S-071'),
  mk('victoria',       'Victoria',         'victoria',         'S','criminal', 'arcane',    G('victoria'),  'MBCC-S-103'),
  mk('wendy',          'Wendy',            'wendy',            'B','mbcc',     'fury',      G('wendy'),     'MBCC-S-084'),
  mk('wolverine',      'Wolverine',        'wolverine',        'S','collab',   'reticle',   G('wolverine'), 'MBCC-S-076', '', true),
  mk('che',            'Che',              'che',              'A','criminal', 'fury',      G('che'),       'MBCC-S-270'),
  mk('demolia',        'Demolia',          'demolia',          'S','mbcc',     'guard',     G('demolia'),   'MBCC-S-117'),
  mk('emp',            'EMP',              'emp',              'A','mbcc',     'reticle',   G('emp'),       'MBCC-S-107'),
  mk('flora',          'Flora',            'flora',            'A','criminal', 'reticle',   G('flora'),     'MBCC-S-135'),
  mk('gekkabijin',     'Gekkabijin',       'gekkabijin',       'S','criminal', 'breaker',   G('gekkabijin'),'MBCC-S-445'),
  mk('hella',          'Hella',            'hella',            'A','criminal', 'fury',      G('hella'),     'MBCC-S-098'),
  mk('joan',           'Joan',             'joan',             'A','mbcc',     'arcane',    G('joan'),      'MBCC-S-237'),
  mk('kelvin',         'Kelvin',           'kelvin',           'S','mbcc',     'arcane',    G('kelvin'),    'MBCC-S-592'),
  mk('kk',             'K.K.',             'kk',               'A','mbcc',     'guard',     G('kk'),        'MBCC-S-217'),
  mk('labyrinth',      'Labyrinth',        'labyrinth',        'S','mbcc',     'breaker',   G('labyrinth'), 'MBCC-S-101'),
  mk('lisa',           'Lisa',             'lisa',             'S','criminal', 'inclusion', G('lisa'),      'MBCC-S-355'),
  mk('macchiato',      'Macchiato',        'macchiato',        'A','criminal', 'inclusion', G('macchiato'), 'MBCC-S-555'),
  mk('peggy',          'Peggy',            'peggy',            'B','mbcc',     'guard',     G('peggy'),     'MBCC-S-500'),
  mk('pepper',         'Pepper',           'pepper',           'B','criminal', 'fury',      G('pepper'),    'MBCC-S-250'),
  // CN EXCLUSIVE
  mk('jolyne',         'Jolyne Cujoh',     'jolyne-cujoh',     'S','collab',   'breaker',   G('jolyne_cujoh'),    'FE-40536', '', true),
  mk('jotaro',         'Jotaro Kujo',      'jotaro-kujo',      'A','collab',   'fury',      G('kujo_jotaro'),     'UNKNOWN',  '', true),
  mk('ermes',          'Ermes Costello',   'ermes-costello',   'A','collab',   'fury',      G('ermes_costello'),  'FE-40513', '', true),
  mk('ff',             'F.F.',             'ff',               'S','collab',   'reticle',   G('ff'),              'FE-39424', '', true),
  mk('narciso',        'Narciso Anastasia','narciso-anastasia', 'S','collab',   'arcane',    G('narciso_anastasia'),'MA-28050', '', true),
  mk('weather',        'Weather Forecast', 'weather-forecast', 'S','collab',   'arcane',    G('weatherforecast'), 'MA-152403','', true),
].map(c => ({ ...c, faction: SLUG_ALIGNMENT[c.slug] ?? c.faction }))

const RARITY_COLOR: Record<string, string> = {
  S: '#FFD700', A: '#C084FC', B: '#60A5FA', C: '#6EE7B7',
}

// NEW badge threshold: within last 60 days
const isNew = (char: Character) => {
  if (!char.release_date) return false
  const d = new Date(char.release_date)
  return (Date.now() - d.getTime()) < 60 * 24 * 60 * 60 * 1000
}

export function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterFaction, setFilterFaction] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagFilter, setShowTagFilter] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  useEffect(() => {
    supabase.from('characters').select('*')
      .then(({ data }) => {
        if (data && data.length > 0) {
          // sort ตามลำดับ DEMO_CHARACTERS (slug เป็น key)
          const orderMap = new Map(DEMO_CHARACTERS.map((c, i) => [c.slug, i]))
          const sorted = [...data].sort((a, b) => {
            const ai = orderMap.get(a.slug) ?? -1
            const bi = orderMap.get(b.slug) ?? -1
            return ai - bi
          })
          setCharacters(sorted)
        } else {
          setCharacters(DEMO_CHARACTERS)
        }
        setLoading(false)
      })
  }, [])

  const filtered = characters.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterRarity && c.rarity !== filterRarity) return false
    if (filterClass && c.job_class !== filterClass) return false
    if (filterFaction && c.faction !== filterFaction) return false
    if (selectedTags.length > 0) {
      const charTags = (c.ability_tags as string[] | null) || []
      if (!selectedTags.some(t => charTags.includes(t))) return false
    }
    return true
  })

  const classes = [...new Set(characters.map(c => c.job_class))].sort()
  const factions = [...new Set(characters.map(c => c.faction))].sort()

  if (loading) return <PageLoader />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ── Top bar: search + filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="ค้นหาตัวละคร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon={<Search size={14} />}
          />
        </div>

        <Select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-36">
          <option value="">All Tendencies</option>
          {classes.map(c => <option key={c} value={c}>{JOB_CLASS_LABEL[c] || c}</option>)}
        </Select>

        <Select value={filterFaction} onChange={e => setFilterFaction(e.target.value)} className="w-36">
          <option value="">All Alignments</option>
          {factions.map(f => <option key={f} value={f}>{ALIGNMENT_LABEL[f] || f.toUpperCase()}</option>)}
        </Select>
      </div>

      {/* Rarity filter + count */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Filter size={13} className="text-ptn-disabled" />
        {[
          { v: '', label: 'ทั้งหมด', color: '#888' },
          { v: 'S', label: 'S-Rank', color: '#FFD700' },
          { v: 'A', label: 'A-Rank', color: '#C084FC' },
          { v: 'B', label: 'B-Rank', color: '#60A5FA' },
          { v: 'C', label: 'C-Rank', color: '#6EE7B7' },
        ].map(({ v, label, color }) => (
          <button
            key={v}
            onClick={() => setFilterRarity(v)}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium border transition-all',
              filterRarity === v
                ? 'text-white'
                : 'border-ptn-border text-ptn-muted hover:border-ptn-border/80'
            )}
            style={filterRarity === v ? { borderColor: color, background: `${color}20`, color } : {}}
          >
            {label}
          </button>
        ))}
        <span className="text-xs text-ptn-disabled ml-1">{filtered.length} ตัว</span>
      </div>

      {/* ── Ability Tags filter ── */}
      <div className="mb-5">
        <button
          onClick={() => setShowTagFilter(v => !v)}
          className="flex items-center gap-2 text-sm text-ptn-muted hover:text-ptn-text transition-colors"
        >
          <SlidersHorizontal size={13} />
          ตัวกรองความสามารถ
          {selectedTags.length > 0 && (
            <span className="text-xs text-ptn-cyan font-medium">({selectedTags.length})</span>
          )}
          <ChevronDown size={13} className={`transition-transform ${showTagFilter ? 'rotate-180' : ''}`} />
        </button>

        {showTagFilter && (
          <div className="mt-3 p-4 bg-ptn-elevated rounded-lg border border-ptn-border space-y-4">
            {ABILITY_TAG_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-xs font-semibold mb-2" style={{ color: group.text }}>{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map(tag => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          background: active ? group.bg : 'transparent',
                          borderColor: active ? group.border : '#2a2a3a',
                          color: active ? group.text : '#555',
                        }}
                        className="text-xs px-2.5 py-1 rounded border transition-all hover:opacity-90"
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-ptn-red hover:underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        )}
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
  const isCN = COLLAB_SLUGS.has(character.slug)
  const unreleased = !character.portrait_url
  const charIsNew = isNew(character)
  const tendencyIcon = TENDENCY_ICON_PATH[character.job_class]
  const hasCoreDMG = ((character.ability_tags as string[] | null) || []).includes('Core DMG')
  const isLimited = character.is_limited && !isCN

  const borderDefault = isLimited ? '2px solid #C8860A' : `1px solid ${color}35`
  const borderHover   = isLimited ? '2px solid #F5A623' : `1px solid ${color}80`
  const shadowDefault = isLimited ? '0 0 10px 2px rgba(200,134,10,0.45), 0 0 0 1px rgba(200,134,10,0.15)' : 'none'
  const shadowHover   = isLimited ? '0 0 18px 5px rgba(245,166,35,0.6), 0 0 0 1px rgba(245,166,35,0.25)' : 'none'

  return (
    <Link to={`/characters/${character.slug}`} className="group block">
      <div
        className="relative rounded-lg overflow-hidden aspect-[2/3] bg-ptn-elevated
          transition-all duration-300 hover:-translate-y-0.5"
        style={{ border: borderDefault, boxShadow: shadowDefault }}
        onMouseEnter={e => {
          e.currentTarget.style.border = borderHover
          e.currentTarget.style.boxShadow = shadowHover
        }}
        onMouseLeave={e => {
          e.currentTarget.style.border = borderDefault
          e.currentTarget.style.boxShadow = shadowDefault
        }}
      >
        {/* Art */}
        {character.portrait_url ? (
          <img
            src={character.portrait_url}
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: character.portrait_pos || '50% 20%' }}
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(180deg,${color}12 0%,#0D0D14 100%)` }}
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        {/* Tendency icon — center-bottom area */}
        {tendencyIcon && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-8 h-8 opacity-30 group-hover:opacity-50 transition-opacity"
            style={{ bottom: '52px' }}
          >
            <img src={tendencyIcon} alt={character.job_class} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Core DMG indicator — top right */}
        {hasCoreDMG && (
          <div className="absolute top-2 right-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle, #FFD700 0%, #F97316 70%)',
                boxShadow: '0 0 7px 3px rgba(251,146,60,0.75)',
              }}
            />
          </div>
        )}

        {/* Badges — top left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isCN && (
            <span className="text-[8px] font-bold bg-ptn-red text-white px-1.5 py-0.5 rounded tracking-wider leading-none uppercase">
              CN Exclusive
            </span>
          )}
          {unreleased && !isCN && (
            <span className="text-[8px] font-bold bg-black/70 text-ptn-muted border border-ptn-border px-1.5 py-0.5 rounded tracking-wider leading-none uppercase">
              Unreleased
            </span>
          )}
          {charIsNew && !unreleased && !isCN && (
            <span className="text-[8px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded tracking-wider leading-none uppercase">
              New
            </span>
          )}
          {character.is_limited && !isCN && (
            <span className="text-[8px] font-bold border text-ptn-gold border-ptn-gold/40 bg-ptn-gold/10 px-1.5 py-0.5 rounded tracking-wider leading-none uppercase">
              Limited
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-8">
          <p className="font-heading font-bold text-white text-sm leading-tight drop-shadow truncate">
            {character.name}
          </p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: `${color}99` }}>
            {mbccId}
          </p>
        </div>

        {/* Bottom rarity line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: color, opacity: 0.5 }}
        />
      </div>
    </Link>
  )
}
