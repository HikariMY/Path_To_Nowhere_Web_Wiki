// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin'
          bio?: string | null
          post_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'moderator' | 'admin'
          bio?: string | null
          post_count?: number
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          name: string
          slug: string
          rarity: 'S' | 'A' | 'B' | 'C'
          faction: string
          job_class: string
          portrait_url: string | null
          portrait_pos: string | null
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
          release_date: string | null
          release_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      events: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          description: string | null
          event_type: 'gacha_new' | 'gacha_new_limited' | 'gacha_rerun' | 'gacha_rerun_limited' | 'event_new' | 'event_rerun' | 'event_collab' | 'story_new' | 'story_eternal' | 'maintenance' | 'other' | 'story' | 'rerun' | 'collab'
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
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      announcements: {
        Row: {
          id: string
          content: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      forum_categories: {
        Row: {
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
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      forum_posts: {
        Row: {
          id: string
          category_id: string
          author_id: string
          title: string
          content: string
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
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      forum_replies: {
        Row: {
          id: string
          post_id: string
          author_id: string
          content: string
          is_deleted: boolean
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      tier_lists: {
        Row: {
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
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      tier_list_votes: {
        Row: {
          id: string
          tier_list_id: string
          user_id: string
          created_at: string
        }
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          target_table: string | null
          target_id: string | null
          meta: Json
          created_at: string
        }
        Insert: Record<string, Json>
        Update: Record<string, Json>
      }
    }
    Functions: {
      increment_post_views: {
        Args: { post_id: string }
        Returns: void
      }
    }
  }
}
