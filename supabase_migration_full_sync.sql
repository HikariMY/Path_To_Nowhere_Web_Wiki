-- ============================================================
-- PTN Wiki TH — Full sync migration
-- ============================================================
-- ใช้กับฐานข้อมูลที่ "มีข้อมูลอยู่แล้ว" เพื่อเติมตาราง/คอลัมน์ที่เคยสร้างมือ
-- ไว้ใน Supabase Dashboard แต่ไม่เคยถูกบันทึกลง supabase_schema.sql
--
-- ปลอดภัยต่อการรันซ้ำ (idempotent) — ทุกคำสั่งเป็น IF NOT EXISTS
-- ถ้าเพิ่งสร้างโปรเจกต์ใหม่ ให้รัน supabase_schema.sql อย่างเดียวพอ ไม่ต้องรันไฟล์นี้
--
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1) CHARACTERS — คอลัมน์ที่เพิ่มมาหลังสร้างตารางครั้งแรก
-- ------------------------------------------------------------
alter table public.characters
  add column if not exists portrait_pos         text    not null default '50% 20%',
  add column if not exists portrait_zoom        numeric not null default 1,
  add column if not exists ability_tags         text[],
  add column if not exists trivia               jsonb   default '[]'::jsonb,
  add column if not exists char_details         jsonb,
  add column if not exists overview_cards       jsonb,
  add column if not exists materials            jsonb,
  add column if not exists crimebrand_sets      jsonb,
  add column if not exists exclusive_crimebrand jsonb,
  add column if not exists is_unreleased        boolean not null default false,
  add column if not exists is_new               boolean not null default false,
  add column if not exists release_order        integer;

-- ------------------------------------------------------------
-- 2) EVENTS — subtitle + ตัวละครที่โผล่บนการ์ด
-- ------------------------------------------------------------
alter table public.events
  add column if not exists subtitle                  text,
  add column if not exists is_featured               boolean not null default false,
  add column if not exists image_position            text not null default '50% 50%',
  add column if not exists featured_character_ids    uuid[] default '{}',
  add column if not exists featured_character_images jsonb  default null;

-- event_type เดิมมี check constraint ที่แคบกว่า — ขยายให้ครอบคลุมชนิดใหม่ทั้งหมด
alter table public.events drop constraint if exists events_event_type_check;
alter table public.events add constraint events_event_type_check check (event_type in (
  'gacha_new', 'gacha_new_limited', 'gacha_rerun', 'gacha_rerun_limited',
  'event_new', 'event_rerun', 'event_collab',
  'story_new', 'story_eternal',
  'maintenance', 'other',
  'story', 'rerun', 'collab'
));

-- ------------------------------------------------------------
-- 3) FORUM — แนบรูปในกระทู้/คอมเมนต์
-- ------------------------------------------------------------
alter table public.forum_posts
  add column if not exists image_urls text[] default '{}';

alter table public.forum_replies
  add column if not exists image_urls text[] default '{}';

-- ------------------------------------------------------------
-- 4) CRIMEBRANDS
-- ------------------------------------------------------------
create table if not exists public.crimebrands (
  id                   uuid primary key default uuid_generate_v4(),
  name                 text not null,
  slug                 text not null unique,
  rank                 text not null default 'B' check (rank in ('S', 'A', 'B')),
  slot                 integer,
  icon_url             text,
  artwork_url          text,
  source               text,
  unreleased           boolean not null default false,
  release_order        integer not null default 0,
  effects              jsonb not null default '[]'::jsonb,
  set_bonus            text,
  note                 text,
  flavor_texts         jsonb not null default '[]'::jsonb,
  recommended_char_ids uuid[] not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_crimebrands_release_order
  on public.crimebrands(release_order desc);

alter table public.crimebrands enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'crimebrands' and policyname = 'Crimebrands are viewable by everyone') then
    create policy "Crimebrands are viewable by everyone"
      on public.crimebrands for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crimebrands' and policyname = 'Only admins can insert crimebrands') then
    create policy "Only admins can insert crimebrands"
      on public.crimebrands for insert
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crimebrands' and policyname = 'Only admins can update crimebrands') then
    create policy "Only admins can update crimebrands"
      on public.crimebrands for update
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'crimebrands' and policyname = 'Only admins can delete crimebrands') then
    create policy "Only admins can delete crimebrands"
      on public.crimebrands for delete
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) CHARACTER CRIMEBRAND BUILDS
-- ------------------------------------------------------------
create table if not exists public.character_crimebrand_builds (
  id           uuid primary key default uuid_generate_v4(),
  character_id uuid not null references public.characters(id) on delete cascade,
  build_name   text not null,
  description  text,
  slot1_cb_id  uuid references public.crimebrands(id) on delete set null,
  slot1_piece  integer check (slot1_piece between 1 and 3),
  slot2_cb_id  uuid references public.crimebrands(id) on delete set null,
  slot2_piece  integer check (slot2_piece between 1 and 3),
  slot3_cb_id  uuid references public.crimebrands(id) on delete set null,
  slot3_piece  integer check (slot3_piece between 1 and 3),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_cb_builds_character
  on public.character_crimebrand_builds(character_id, sort_order);

alter table public.character_crimebrand_builds enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'character_crimebrand_builds' and policyname = 'Builds are viewable by everyone') then
    create policy "Builds are viewable by everyone"
      on public.character_crimebrand_builds for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'character_crimebrand_builds' and policyname = 'Only admins can insert builds') then
    create policy "Only admins can insert builds"
      on public.character_crimebrand_builds for insert
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'character_crimebrand_builds' and policyname = 'Only admins can update builds') then
    create policy "Only admins can update builds"
      on public.character_crimebrand_builds for update
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'character_crimebrand_builds' and policyname = 'Only admins can delete builds') then
    create policy "Only admins can delete builds"
      on public.character_crimebrand_builds for delete
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 6) GAME INFO
-- ------------------------------------------------------------
create table if not exists public.game_info (
  id         uuid primary key default uuid_generate_v4(),
  category   text not null check (category in ('tag', 'alignment', 'tendency')),
  key        text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, key)
);

alter table public.game_info enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'game_info' and policyname = 'Game info is viewable by everyone') then
    create policy "Game info is viewable by everyone"
      on public.game_info for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'game_info' and policyname = 'Only admins can insert game info') then
    create policy "Only admins can insert game info"
      on public.game_info for insert
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'game_info' and policyname = 'Only admins can update game info') then
    create policy "Only admins can update game info"
      on public.game_info for update
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'game_info' and policyname = 'Only admins can delete game info') then
    create policy "Only admins can delete game info"
      on public.game_info for delete
      using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- ------------------------------------------------------------
-- 7) STORAGE BUCKETS
-- ------------------------------------------------------------
-- ต้องมี bucket (public = true) ครบ 4 อัน — สร้างที่ Dashboard → Storage:
--   avatars, characters, events, forum
