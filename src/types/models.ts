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
