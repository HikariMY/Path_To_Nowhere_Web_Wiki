// โครงตารางฝั่ง Supabase — ต้องแก้ให้ตรงกับ supabase_schema.sql เสมอ
//
// หมายเหตุ: ทุกตารางต้องมีคีย์ `Relationships` ไม่งั้น supabase-js v2 จะมองว่า
// schema ไม่ตรงสเปก แล้ว fallback ไปเป็น `never` ทำให้ .insert()/.select()
// พังทั้งโปรเจกต์แบบเงียบ ๆ

import type { ReportReason, ReportStatus, ReportTargetType } from '../lib/moderation'

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
  reforge: Json | null
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
  /** ว่างได้ — อีเวนต์ถาวรไม่มีกำหนดเริ่ม/ปิด (ดู PERMANENT_EVENT_TYPES) */
  start_date: string | null
  end_date: string | null
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
  // supabase_migration_tier_list_details.sql — แถวที่อ่านก่อนรัน migration จะไม่มีช่องเหล่านี้ อ่านผ่าน readTierListMeta
  server?: string
  role_columns?: Json
  legend?: Json
  source?: Json | null
  is_archived?: boolean
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

/** หัวข้อหนึ่งก้อนในเนื้อไกด์ — body เป็น markdown */
export type GuideSection = {
  heading: string
  body: string
}

export type CharacterGuideRow = {
  id: string
  character_id: string
  author_id: string
  title: string
  patch_version: string | null
  tags: string[]
  /** id (หรือชื่อ) ของสกิล เรียงตามลำดับที่ควรอัป */
  skill_priority: string[]
  level_from: string | null
  level_to: string | null
  /** เลข stage ของ Shackle ที่คุ้มค่า */
  notable_shackles: number[]
  recommended_ecb_id: string | null
  /** character id ของเพื่อนร่วมทีม */
  recommended_team: string[]
  /** ReforgeGuideBuild — { nodes, ex } หรือ null ถ้าไม่ได้แนบ */
  reforge_build: Json | null
  sections: GuideSection[]
  upvotes: number
  created_at: string
  updated_at: string
}

export type CharacterGuideVoteRow = {
  id: string
  guide_id: string
  user_id: string
  created_at: string
}

export type ReportRow = {
  id: string
  /** null = AI เป็นคนติดธง (source = 'ai') */
  reporter_id: string | null
  source: 'user' | 'ai'
  /** คะแนน Noul จาก TypeSafe ต่อหัวข้อ (เฉพาะ source = 'ai') */
  ai_scores: Record<string, number> | null
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  detail: string | null
  status: ReportStatus
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export type GuideCommentRow = {
  id: string
  guide_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

// supabase_migration_cn_guides.sql — สรุปไกด์จากผู้เล่นเซิร์ฟจีน (points = CnPoint[])
export type CharacterCnGuideRow = {
  id: string
  character_id: string
  verdict: string | null
  points: Json
  source_title: string
  source_author: string
  source_url: string
  checked_at: string
  sort_order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// supabase_migration_game_modes.sql — ไกด์โหมด (jsonb อ่านผ่าน lib/gameModes.ts / lib/cnGuides.ts)
export type GameModeRow = {
  id: string
  slug: string
  name: string
  cn_name: string | null
  verified: boolean
  in_global: boolean
  locked: boolean
  global_menu: string | null
  path: string | null
  tag: string | null
  summary: string | null
  sort_order: number
  global_rules: Json
  stages_title: string | null
  stages: Json
  season_label: string | null
  season_trait: string | null
  season_ends: string | null
  season_bosses: Json
  tips: Json
  shots: Json
  cn_note: string | null
  cn_rules: Json
  cn_season_label: string | null
  cn_season_effect: string | null
  cn_buffs: Json
  cn_tips: Json
  created_at: string
  updated_at: string
}

export type GameModeSourceRow = {
  id: string
  mode_id: string
  title: string
  author: string
  url: string
  checked_at: string
  sort_order: number
  created_at: string
}

// supabase_migration_redeem_codes.sql — Redeem Code + แถบสถานะใต้เมนู (logic อยู่ใน lib/redeemCodes.ts)
export type RedeemCodeRow = {
  id: string
  code: string
  reward: string | null
  expires_at: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

/** แถวเดียว id = 1 */
export type SiteStatusRow = {
  id: number
  show_bar: boolean
  patch_name: string | null
  show_event: boolean
  updated_at: string
}

export type TeamRow = {
  id: string
  author_id: string
  title: string
  description: string | null
  /** [{ character_id, build_id }] สูงสุด 6 ช่อง — อ่านผ่าน parseMembers() */
  members: Json
  is_public: boolean
  created_at: string
  updated_at: string
}

export type FavoriteCharacterRow = {
  id: string
  user_id: string
  character_id: string
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

      character_guides: TableOf<CharacterGuideRow, [
        FK<'character_guides_author_id_fkey', 'author_id', 'profiles'>,
        FK<'character_guides_character_id_fkey', 'character_id', 'characters'>,
      ]>
      character_guide_votes: TableOf<CharacterGuideVoteRow, [
        FK<'character_guide_votes_guide_id_fkey', 'guide_id', 'character_guides'>,
        FK<'character_guide_votes_user_id_fkey', 'user_id', 'profiles'>,
      ]>

      game_info: TableOf<GameInfoRow>

      // reports.resolved_by ก็เป็น FK ไป profiles แต่ไม่ประกาศไว้ — กัน `reporter:profiles(...)` กำกวม
      guide_comments: TableOf<GuideCommentRow, [
        FK<'guide_comments_author_id_fkey', 'author_id', 'profiles'>,
        FK<'guide_comments_guide_id_fkey', 'guide_id', 'character_guides'>,
      ]>

      game_modes: TableOf<GameModeRow>
      game_mode_sources: TableOf<GameModeSourceRow, [
        FK<'game_mode_sources_mode_id_fkey', 'mode_id', 'game_modes'>,
      ]>

      redeem_codes: TableOf<RedeemCodeRow>
      site_status:  TableOf<SiteStatusRow>

      character_cn_guides: TableOf<CharacterCnGuideRow, [
        FK<'character_cn_guides_character_id_fkey', 'character_id', 'characters'>,
      ]>

      teams: TableOf<TeamRow, [
        FK<'teams_author_id_fkey', 'author_id', 'profiles'>,
      ]>

      favorite_characters: TableOf<FavoriteCharacterRow, [
        FK<'favorite_characters_user_id_fkey', 'user_id', 'profiles'>,
        FK<'favorite_characters_character_id_fkey', 'character_id', 'characters'>,
      ]>

      reports: TableOf<ReportRow, [
        FK<'reports_reporter_id_fkey', 'reporter_id', 'profiles'>,
      ]>
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
