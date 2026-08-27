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
-- แนะนำให้ backup ก่อน (Dashboard → Database → Backups)
-- ส่วนที่ 8 ท้ายไฟล์คือคำสั่งตรวจผล — ดูว่าขึ้น ok ครบทุกบรรทัดไหม
-- ============================================================

-- ตารางด้านล่างใช้ uuid_generate_v4() — DB เดิมน่าจะมี extension นี้อยู่แล้ว
-- แต่ประกาศไว้กันพลาดสำหรับ DB ที่ยังไม่มี
create extension if not exists "uuid-ossp";

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
--
-- ไล่ลบ check constraint ทุกตัวบน events ที่อ้างถึง event_type แทนที่จะลบตามชื่อ
-- เพราะถ้า constraint เดิมถูกตั้งชื่ออื่น (ไม่ใช่ events_event_type_check)
-- การลบตามชื่อจะไม่เกิดอะไรขึ้นเลย แล้วตัวเก่าที่แคบกว่าจะยังบล็อกชนิดใหม่อยู่เงียบ ๆ
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel     on rel.oid = con.conrelid
    join pg_namespace ns  on ns.oid  = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'events'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%event_type%'
  loop
    execute format('alter table public.events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.events add constraint events_event_type_check check (event_type in (
  'gacha_new', 'gacha_new_limited', 'gacha_rerun', 'gacha_rerun_limited',
  'event_new', 'event_rerun', 'event_collab',
  'story_new', 'story_eternal',
  'maintenance', 'other',
  'story', 'rerun', 'collab'
));

-- ------------------------------------------------------------
-- 3) PROFILES — ชื่อที่แสดง
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text;

-- ------------------------------------------------------------
-- 4) FORUM — แนบรูปในกระทู้/คอมเมนต์
-- ------------------------------------------------------------
alter table public.forum_posts
  add column if not exists image_urls text[] default '{}';

alter table public.forum_replies
  add column if not exists image_urls text[] default '{}';

-- ------------------------------------------------------------
-- 5) CRIMEBRANDS
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
-- 6) CHARACTER CRIMEBRAND BUILDS
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
-- 7) GAME INFO
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
-- 8) STORAGE BUCKETS
-- ------------------------------------------------------------
-- ต้องมี bucket (public = true) ครบ 4 อัน — สร้างที่ Dashboard → Storage:
--   avatars, characters, events, forum
-- ตรวจว่ามีครบไหมด้วยคำสั่งนี้:
--   select id, public from storage.buckets order by id;

-- ------------------------------------------------------------
-- 9) ตรวจผล — ควรขึ้น "ok" ทุกบรรทัด
-- ------------------------------------------------------------
-- ถ้ามีบรรทัดไหนขึ้น MISSING แปลว่า migration ยังไม่ครบ อย่าเพิ่ง deploy
with expected(tbl, col) as (values
  ('characters', 'portrait_pos'),
  ('characters', 'portrait_zoom'),
  ('characters', 'ability_tags'),
  ('characters', 'trivia'),
  ('characters', 'char_details'),
  ('characters', 'overview_cards'),
  ('characters', 'materials'),
  ('characters', 'crimebrand_sets'),
  ('characters', 'exclusive_crimebrand'),
  ('characters', 'is_unreleased'),
  ('characters', 'is_new'),
  ('characters', 'release_order'),
  ('events', 'subtitle'),
  ('events', 'is_featured'),
  ('events', 'image_position'),
  ('events', 'featured_character_ids'),
  ('events', 'featured_character_images'),
  ('profiles', 'display_name'),
  ('forum_posts', 'image_urls'),
  ('forum_replies', 'image_urls'),
  ('crimebrands', 'id'),
  ('crimebrands', 'effects'),
  ('crimebrands', 'flavor_texts'),
  ('crimebrands', 'recommended_char_ids'),
  ('crimebrands', 'release_order'),
  ('crimebrands', 'unreleased'),
  ('character_crimebrand_builds', 'character_id'),
  ('character_crimebrand_builds', 'build_name'),
  ('character_crimebrand_builds', 'slot1_cb_id'),
  ('character_crimebrand_builds', 'slot2_cb_id'),
  ('character_crimebrand_builds', 'slot3_cb_id'),
  ('character_crimebrand_builds', 'sort_order'),
  ('game_info', 'category'),
  ('game_info', 'key'),
  ('game_info', 'data')
)
select
  e.tbl                                              as "ตาราง",
  e.col                                              as "คอลัมน์",
  case when c.column_name is null
       then '>>> MISSING <<<' else 'ok' end          as "สถานะ"
from expected e
left join information_schema.columns c
  on  c.table_schema = 'public'
  and c.table_name   = e.tbl
  and c.column_name  = e.col
order by (c.column_name is null) desc, e.tbl, e.col;
