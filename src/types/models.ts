import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type GameEvent = Database['public']['Tables']['events']['Row'] & {
  is_featured?: boolean
}
export type ForumCategory = Database['public']['Tables']['forum_categories']['Row']
export type ForumPost = Database['public']['Tables']['forum_posts']['Row']
export type ForumReply = Database['public']['Tables']['forum_replies']['Row']
export type TierList = Database['public']['Tables']['tier_lists']['Row']
export type TierListVote = Database['public']['Tables']['tier_list_votes']['Row']
export type AdminLog = Database['public']['Tables']['admin_logs']['Row']

// Extended types with joins
export type ForumPostWithAuthor = ForumPost & {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>
  category?: Pick<ForumCategory, 'id' | 'name' | 'slug' | 'color'>
}

export type ForumReplyWithAuthor = ForumReply & {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>
}

export type TierListWithAuthor = TierList & {
  author: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>
  user_voted?: boolean
}

// Skill schema
export interface CharacterSkill {
  name: string
  name_th: string
  type: 'active' | 'passive'
  cost?: number
  description_th: string
  levels?: Array<{
    level: number
    effect: string
  }>
  image_url?: string
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
