-- ============================================================
-- PTN Wiki TH — ไกด์โหมด (/modes) + แหล่งอ้างอิงของแต่ละโหมด
-- ============================================================
-- ตารางใหม่ 2 ตาราง ไม่แตะตารางเดิม — รันก่อน merge PR ได้เลย
--   game_modes          ข้อมูลโหมด: Global (เช็กในเกมเอง) แสดงเป็นหลัก + ข้อมูลเซิร์ฟจีน (ล่วงหน้า) แยกส่วน
--     *_rules / cn_buffs / stages  = [{ "title": "...", "body": "..." }]   (หัวข้อ: รายละเอียด)
--     season_bosses / tips / cn_tips = ["...", ...]
--     shots = [{ "url": "https://...", "caption": "..." }]   ภาพจากในเกม (อัปโหลดผ่านหน้าแอดมิน)
--     cn_name ใช้เทียบกับแหล่งอ้างอิงในหน้าแอดมิน ไม่แสดงบนหน้าเว็บ
--   game_mode_sources   เครดิตต้นฉบับ (สรุปเอง ไม่แปลทั้งบท) + วันที่ตรวจล่าสุด (เตือนเมื่อเกิน 60 วัน)
--   ทุกคนอ่านได้ · เพิ่ม/แก้/ลบได้เฉพาะแอดมิน
-- เนื้อหาเริ่มต้นอยู่ใน supabase_seed_game_modes.sql (รันหลังไฟล์นี้)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.game_modes (
  id                uuid primary key default uuid_generate_v4(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name              text not null check (char_length(btrim(name)) between 1 and 80),
  cn_name           text,
  verified          boolean not null default false,
  in_global         boolean not null default true,
  locked            boolean not null default false,
  global_menu       text,
  path              text,
  tag               text,
  summary           text,
  sort_order        integer not null default 0,
  global_rules      jsonb not null default '[]'::jsonb check (jsonb_typeof(global_rules) = 'array'),
  stages_title      text,
  stages            jsonb not null default '[]'::jsonb check (jsonb_typeof(stages) = 'array'),
  season_label      text,
  season_trait      text,
  season_ends       timestamptz,
  season_bosses     jsonb not null default '[]'::jsonb check (jsonb_typeof(season_bosses) = 'array'),
  tips              jsonb not null default '[]'::jsonb check (jsonb_typeof(tips) = 'array'),
  shots             jsonb not null default '[]'::jsonb check (jsonb_typeof(shots) = 'array'),
  cn_note           text,
  cn_rules          jsonb not null default '[]'::jsonb check (jsonb_typeof(cn_rules) = 'array'),
  cn_season_label   text,
  cn_season_effect  text,
  cn_buffs          jsonb not null default '[]'::jsonb check (jsonb_typeof(cn_buffs) = 'array'),
  cn_tips           jsonb not null default '[]'::jsonb check (jsonb_typeof(cn_tips) = 'array'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_game_modes_order on public.game_modes (sort_order, name);

create table if not exists public.game_mode_sources (
  id          uuid primary key default uuid_generate_v4(),
  mode_id     uuid not null references public.game_modes(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  author      text not null check (char_length(btrim(author)) between 1 and 100),
  url         text not null check (url ~* '^https?://'),
  checked_at  date not null default current_date,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_game_mode_sources_mode on public.game_mode_sources (mode_id, sort_order);

alter table public.game_modes enable row level security;
alter table public.game_mode_sources enable row level security;

drop policy if exists "Game modes are viewable by everyone" on public.game_modes;
create policy "Game modes are viewable by everyone"
  on public.game_modes for select using (true);

drop policy if exists "Admins manage game modes" on public.game_modes;
create policy "Admins manage game modes"
  on public.game_modes for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Mode sources are viewable by everyone" on public.game_mode_sources;
create policy "Mode sources are viewable by everyone"
  on public.game_mode_sources for select using (true);

drop policy if exists "Admins manage mode sources" on public.game_mode_sources;
create policy "Admins manage mode sources"
  on public.game_mode_sources for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ตรวจผล: ควรเห็น policy 4 อัน
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('game_modes', 'game_mode_sources')
order by tablename, policyname;
