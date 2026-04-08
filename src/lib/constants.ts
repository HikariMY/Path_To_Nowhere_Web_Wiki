export const RARITY_COLORS: Record<string, string> = {
  S: '#FFD700',
  A: '#C084FC',
  B: '#60A5FA',
  C: '#6EE7B7',
}

export const RARITY_BG: Record<string, string> = {
  S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  A: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-green-500/20 text-green-400 border-green-500/30',
}

export const RARITY_LABEL: Record<string, string> = {
  S: 'S-Rank',
  A: 'A-Rank',
  B: 'B-Rank',
  C: 'C-Rank',
}

export const JOB_CLASS_LABEL: Record<string, string> = {
  arcane:    'Arcane',
  breaker:   'Umbra',
  fury:      'Fury',
  guard:     'Endura',
  inclusion: 'Catalyst',
  reticle:   'Reticle',
}

export const TENDENCY_ICON: Record<string, string> = {
  arcane:    '/TenIcon/arcane.png',
  breaker:   '/TenIcon/umbra.png',
  fury:      '/TenIcon/fury.png',
  guard:     '/TenIcon/endura.png',
  inclusion: '/TenIcon/catalyst.png',
  reticle:   '/TenIcon/reticle.png',
}

export const JOB_CLASS_COLORS: Record<string, string> = {
  arcane:    'text-violet-400',
  breaker:   'text-orange-400',
  fury:      'text-red-400',
  guard:     'text-blue-400',
  inclusion: 'text-green-400',
  reticle:   'text-yellow-400',
}

export const FACTION_LABEL: Record<string, string> = {
  mbcc:           'MBCC',
  criminal:       'ผู้ต้องหา',
  mercenary:      'รับจ้าง',
  underground:    'ใต้ดิน',
  other:          'อื่นๆ',
}

export const ALIGNMENT_LABEL: Record<string, string> = {
  violence:   'Violence',
  love:       'Love',
  greed:      'Greed',
  treachery:  'Treachery',
  limbo:      'Limbo',
  anger:      'Anger',
  sloth:      'Sloth',
  fraud:      'Fraud',
  heresy:     'Heresy',
  immortal:   'Immortal',
  pestilence: 'Pestilence',
  infinite:   'Infinite',
  famine:     'Famine',
  war:        'War',
  death:      'Death',
  sequester:  'Sequester',
}

export const ALIGNMENT_ICON: Record<string, string> = {
  violence:   '/ALIcon/violence.jpg',
  love:       '/ALIcon/love.jpg',
  greed:      '/ALIcon/greed.jpg',
  treachery:  '/ALIcon/treachery.jpg',
  limbo:      '/ALIcon/limbo.jpg',
  anger:      '/ALIcon/anger.jpg',
  sloth:      '/ALIcon/sloth.jpg',
  fraud:      '/ALIcon/fraud.jpg',
  heresy:     '/ALIcon/heresy.jpg',
  immortal:   '/ALIcon/immortal.jpg',
  pestilence: '/ALIcon/libram-pestilence.jpg',
  infinite:   '/ALIcon/libram-infinite.jpg',
  famine:     '/ALIcon/libram-famine.jpg',
  war:        '/ALIcon/libram-war.jpg',
  death:      '/ALIcon/libram-death.jpg',
  sequester:  '/ALIcon/sequester.jpg',
}

export const EVENT_TYPE_LABEL: Record<string, string> = {
  // Gacha / Banner
  gacha_new:          'ตู้กาชาใหม่',
  gacha_new_limited:  'ตู้กาชาใหม่ลิมิตเต็ต',
  gacha_rerun:        'ตู้กาชารีรัน',
  gacha_rerun_limited:'ตู้กาชารีรันลิมิตเต็ต',
  // Event
  event_new:          'อีเวนต์ใหม่',
  event_rerun:        'อีเวนต์รีรัน',
  event_collab:       'อีเวนต์คอลแลบ',
  // Story
  story_new:          'เนื้อเรื่องใหม่',
  story_eternal:      'เนื้อเรื่อง Eternal Nightmare',
  // Misc
  maintenance:        'บำรุงรักษา',
  other:              'อื่นๆ',
  // Legacy
  story:   'อีเวนต์เนื้อเรื่อง',
  rerun:   'อีเวนต์รีรัน',
  collab:  'อีเวนต์ความร่วมมือ',
}

export const GACHA_EVENT_TYPES = ['gacha_new', 'gacha_new_limited', 'gacha_rerun', 'gacha_rerun_limited']

export const EVENT_TYPE_COLORS: Record<string, string> = {
  gacha_new:          'bg-ptn-gold/20 text-ptn-gold border-ptn-gold/30',
  gacha_new_limited:  'bg-ptn-red/20 text-ptn-red border-ptn-red/30',
  gacha_rerun:        'bg-amber-500/20 text-amber-400 border-amber-500/30',
  gacha_rerun_limited:'bg-orange-500/20 text-orange-400 border-orange-500/30',
  event_new:          'bg-green-500/20 text-green-400 border-green-500/30',
  event_rerun:        'bg-teal-500/20 text-teal-400 border-teal-500/30',
  event_collab:       'bg-purple-500/20 text-purple-400 border-purple-500/30',
  story_new:          'bg-blue-500/20 text-blue-400 border-blue-500/30',
  story_eternal:      'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  maintenance:        'bg-gray-500/20 text-gray-400 border-gray-500/30',
  other:              'bg-ptn-muted/20 text-ptn-muted border-ptn-muted/30',
  // Legacy
  story:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  rerun:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  collab:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export const FORUM_CATEGORY_ICONS: Record<string, string> = {
  general:    'MessageSquare',
  strategy:   'Swords',
  characters: 'Users',
  events:     'Calendar',
  media:      'Image',
  bug:        'Bug',
  trade:      'ArrowLeftRight',
}

export const TIER_COLORS = [
  { label: 'SS', color: '#FF4444' },
  { label: 'S',  color: '#FFD700' },
  { label: 'A',  color: '#C084FC' },
  { label: 'B',  color: '#60A5FA' },
  { label: 'C',  color: '#6EE7B7' },
  { label: 'D',  color: '#9898B0' },
]

export const ROLE_LABEL: Record<string, string> = {
  admin:     'แอดมิน',
  moderator: 'โมเดอเรเตอร์',
  user:      'สมาชิก',
}

export const ROLE_COLORS: Record<string, string> = {
  admin:     'bg-red-500/20 text-red-400 border-red-500/30',
  moderator: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  user:      'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export const PAGE_SIZE = 20
