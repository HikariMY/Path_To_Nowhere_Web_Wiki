import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type GameEvent = Database['public']['Tables']['events']['Row']
export type ForumCategory = Database['public']['Tables']['forum_categories']['Row']
export type ForumPost = Database['public']['Tables']['forum_posts']['Row']
export type ForumReply = Database['public']['Tables']['forum_replies']['Row']
export type TierList = Database['public']['Tables']['tier_lists']['Row']
export type TierListVote = Database['public']['Tables']['tier_list_votes']['Row']
export type AdminLog = Database['public']['Tables']['admin_logs']['Row']

// Extended types with joins
export type ForumPostWithAuthor = ForumPost & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'role'>
  category?: Pick<ForumCategory, 'id' | 'name' | 'slug' | 'color'>
}

export type ForumReplyWithAuthor = ForumReply & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'role'>
}

export type TierListWithAuthor = TierList & {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'role'>
  user_voted?: boolean
}

// Skill range grid schema
export interface SkillRange {
  rows: number
  cols: number
  cells: number[]  // 0=empty, 1=active, 2=self position (red)
}

// Skill schema (new)
export interface CharacterSkill {
  id?: string
  name: string
  order?: number        // 1st / 2nd / 3rd / 4th unlock slot
  tags?: string[]       // e.g. ['Normal ATK'] or ['Ultimate', '18 Energy', '1 Core Damage']
  description?: string
  icon_url?: string
  levels?: string[]     // 10 entries indexed 0-9 (LV1-LV10), empty string = no change
  range?: SkillRange
  range2?: SkillRange   // optional 2nd range (e.g. a transformed/alternate state)
}

// Stats schema
export interface CharacterStats {
  hp: number
  atk: number
  def: number
  res: number
  spd: number
  crit_rate?: number
  crit_dmg?: number
}

// Shackle break schema
export interface ShackleBreak {
  stage: number
  cost: number
  bonus: string
  bonus_th: string
  name?: string
  icon_url?: string
}

// ---- Reforge schema (characters.reforge jsonb) ----

// ค่าที่นับรวมได้ เช่น Attack +4.5% หรือ HP +250 (label เดียวกัน + unit เดียวกัน = บวกรวมกัน)
export interface ReforgeStat {
  label: string
  value: number
  unit: 'percent' | 'flat'
}

export type ReforgeNodeCategory = 'attribute' | 'special'

export interface ReforgeNode {
  id: string
  name: string
  name_th?: string
  category: ReforgeNodeCategory
  cost: number
  icon_url?: string
  description?: string
  description_th?: string
  stats?: ReforgeStat[]
  stage: number            // 1-based
  row: 'top' | 'bottom'
  col: number              // ตำแหน่งซ้าย→ขวาภายใน stage
  choice_group?: string    // โหนดกลุ่มเดียวกันเปิดได้ทีละ 1
  linked_to?: string       // เส้นเชื่อมไปโหนดนี้ — ตกแต่งอย่างเดียว ไม่บังคับลำดับ
}

// Intensify / Leap / COST — ปลดครบเสมอในหน้าเว็บ
export interface ReforgeEffect {
  id: string
  stage: number
  type: 'intensify' | 'leap' | 'cost'
  stats: ReforgeStat[]
}

// Overlimit Anchor (EX) ของตัวละครนี้ — ตัวละครอื่นที่คลาสตรงยืมไปใช้ได้
export interface ReforgeExAnchor {
  name: string
  name_th?: string
  description: string
  description_th?: string
  icon_url?: string
  exclusive_classes: string[]   // ว่าง = ทุกคลาส
}

export interface ReforgePreset {
  id: string
  name: string
  node_ids: string[]
}

export interface ReforgeData {
  cost_base: number    // 21
  cost_bonus: number   // +5
  nodes: ReforgeNode[]
  effects: ReforgeEffect[]
  ex_anchor?: ReforgeExAnchor
  presets: ReforgePreset[]
}

// build Reforge ที่แนบในไกด์ (character_guides.reforge_build jsonb)
export interface ReforgeGuideBuild {
  nodes: string[]        // id โหนดที่เปิด
  ex: string | null      // character_id เจ้าของ EX ที่เลือก
}

// Tier list tiers schema
export interface TierRow {
  label: string
  color: string
  character_ids: string[]
}

// Editor state
export interface TierEditorState {
  title: string
  description: string
  patch_version: string
  tiers: TierRow[]
  unassigned: string[]
}
