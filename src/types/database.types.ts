// โครงตารางฝั่ง Supabase — ต้องแก้ให้ตรงกับ supabase_schema.sql เสมอ
//
// หมายเหตุ: ทุกตารางต้องมีคีย์ `Relationships` ไม่งั้น supabase-js v2 จะมองว่า
// schema ไม่ตรงสเปก แล้ว fallback ไปเป็น `never` ทำให้ .insert()/.select()
// พังทั้งโปรเจกต์แบบเงียบ ๆ

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any

/** foreign key ที่ต้องประกาศไว้ให้ postgrest-js resolve การ join แบบ `author:profiles(...)` ได้ */
type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

/**
 * ใช้ประกาศตารางแบบสั้น ๆ จาก Row เดียว
 * — Insert/Update เป็น Partial<Row> เพื่อให้จับ typo ชื่อคอลัมน์ได้
 *   แต่ไม่บังคับต้องใส่ครบทุกฟิลด์ (ค่า default มาจากฝั่ง DB)
 */
type TableOf<Row, Rels extends Relationship[] = []> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: Rels
}

/** ย่อการประกาศ FK แบบ many-to-one (คอลัมน์เดียว → id) */
type FK<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name
  columns: [Col]
  isOneToOne: false
  referencedRelation: Ref
  referencedColumns: ['id']
}

// ---- Rows ------------------------------------------------------------------

export type ProfileRow = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: 'user' | 'moderator' | 'admin'
  bio: string | null
  post_count: number
  created_at: string
  updated_at: string
}

export type CharacterRow = {
  id: string
  name: string
  slug: string
  rarity: 'S' | 'A' | 'B' | 'C'
  faction: string
  job_class: string
  portrait_url: string | null
  portrait_pos: string | null
  portrait_zoom: number | null
  splash_url: string | null
  overview: string | null
  stats: Json
  skills: Json
  shackles: Json
  tags: string[] | null
  ability_tags: string[] | null
  trivia: Json
  crimebrand_sets: Json
  exclusive_crimebrand: Json | null
  char_details: Json | null
  overview_cards: Json | null
  materials: Json | null
  is_limited: boolean
  is_unreleased: boolean
  is_new: boolean
  release_date: string | null
  release_order: number | null
  created_at: string
  updated_at: string
}

export type EventRow = {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  event_type:
    | 'gacha_new' | 'gacha_new_limited' | 'gacha_rerun' | 'gacha_rerun_limited'
    | 'event_new' | 'event_rerun' | 'event_collab'
    | 'story_new' | 'story_eternal'
    | 'maintenance' | 'other'
    | 'story' | 'rerun' | 'collab'
  banner_url: string | null
  featured_character_ids: string[] | null
  featured_character_images: Record<string, string> | null
  start_date: string
  end_date: string
  is_active: boolean
  is_featured: boolean
  image_position: string | null
  created_at: string
}

export type AnnouncementRow = {
  id: string
  content: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export type ForumCategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  sort_order: number
  post_count: number
  is_locked: boolean
  created_at: string
}

export type ForumPostRow = {
  id: string
  category_id: string
  author_id: string
  title: string
  content: string
  image_urls: string[] | null
  is_pinned: boolean
  is_locked: boolean
  is_deleted: boolean
  views: number
  reply_count: number
  last_reply_at: string | null
  last_reply_by: string | null
  created_at: string
  updated_at: string
}

export type ForumReplyRow = {
  id: string
  post_id: string
  author_id: string
  content: string
  image_urls: string[] | null
  is_deleted: boolean
  parent_id: string | null
  created_at: string
  updated_at: string
}

export type TierListRow = {
  id: string
  author_id: string
  title: string
  description: string | null
  is_official: boolean
  is_public: boolean
  patch_version: string | null
  tiers: Json
  upvotes: number
  created_at: string
  updated_at: string
}

export type TierListVoteRow = {
  id: string
  tier_list_id: string
  user_id: string
  created_at: string
}

export type AdminLogRow = {
  id: string
  admin_id: string
  action: string
  target_table: string | null
  target_id: string | null
  meta: Json
  created_at: string
}

export type CrimebrandRow = {
  id: string
  name: string
  slug: string
  rank: string
  slot: number | null
  icon_url: string | null
  artwork_url: string | null
  source: string | null
  unreleased: boolean
  release_order: number
  effects: Json
  set_bonus: string | null
  note: string | null
  flavor_texts: Json
  recommended_char_ids: string[]
  created_at: string
  updated_at: string
}

export type CharacterCrimebrandBuildRow = {
  id: string
  character_id: string
  build_name: string
  description: string | null
  slot1_cb_id: string | null
  slot1_piece: number | null
  slot2_cb_id: string | null
  slot2_piece: number | null
  slot3_cb_id: string | null
  slot3_piece: number | null
  sort_order: number
  created_at: string
}

export type GameInfoRow = {
  id: string
  category: 'tag' | 'alignment' | 'tendency'
  key: string
  data: Json
  created_at: string
  updated_at: string
}

// ---- Schema ----------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles:         TableOf<ProfileRow>
      characters:       TableOf<CharacterRow>
      events:           TableOf<EventRow>
      announcements:    TableOf<AnnouncementRow>
      forum_categories: TableOf<ForumCategoryRow>

      // หมายเหตุ: forum_posts.last_reply_by ก็เป็น FK ไป profiles เหมือนกัน แต่ไม่ประกาศไว้
      // เพราะไม่มีโค้ดตรงไหน embed มัน — ถ้าประกาศจะทำให้ `author:profiles(...)` กำกวม
      forum_posts: TableOf<ForumPostRow, [
        FK<'forum_posts_author_id_fkey', 'author_id', 'profiles'>,
        FK<'forum_posts_category_id_fkey', 'category_id', 'forum_categories'>,
      ]>
      forum_replies: TableOf<ForumReplyRow, [
        FK<'forum_replies_author_id_fkey', 'author_id', 'profiles'>,
        FK<'forum_replies_post_id_fkey', 'post_id', 'forum_posts'>,
      ]>
      tier_lists: TableOf<TierListRow, [
        FK<'tier_lists_author_id_fkey', 'author_id', 'profiles'>,
      ]>
      tier_list_votes: TableOf<TierListVoteRow, [
        FK<'tier_list_votes_tier_list_id_fkey', 'tier_list_id', 'tier_lists'>,
        FK<'tier_list_votes_user_id_fkey', 'user_id', 'profiles'>,
      ]>
      admin_logs: TableOf<AdminLogRow, [
        FK<'admin_logs_admin_id_fkey', 'admin_id', 'profiles'>,
      ]>

      crimebrands: TableOf<CrimebrandRow>
      character_crimebrand_builds: TableOf<CharacterCrimebrandBuildRow, [
        FK<'character_crimebrand_builds_character_id_fkey', 'character_id', 'characters'>,
      ]>
      game_info: TableOf<GameInfoRow>
    }
    Views: Record<never, never>
    Functions: {
      increment_post_views: {
        Args: { post_id: string }
        Returns: void
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
