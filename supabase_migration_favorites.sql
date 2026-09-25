-- ============================================================
-- PTN Wiki TH — ตัวละครโปรด
-- ============================================================
-- ผู้ใช้กดหัวใจตัวละครได้ (ตัวละครละครั้ง) — โชว์ในหน้าโปรไฟล์ ทุกคนเห็นได้
-- เพิ่ม/ลบได้เฉพาะของตัวเอง · กดได้ไม่เกิน 60 ครั้ง / 10 นาที (ใช้ enforce_rate_limit จาก
-- supabase_migration_moderation.sql — ต้องรันไฟล์นั้นก่อน)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.favorite_characters (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  character_id  uuid not null references public.characters(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (user_id, character_id)
);

create index if not exists idx_favorite_characters_character on public.favorite_characters (character_id);

alter table public.favorite_characters enable row level security;

drop policy if exists "Favorites are viewable by everyone" on public.favorite_characters;
create policy "Favorites are viewable by everyone"
  on public.favorite_characters for select
  using (true);

drop policy if exists "Users add their own favorites" on public.favorite_characters;
create policy "Users add their own favorites"
  on public.favorite_characters for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users remove their own favorites" on public.favorite_characters;
create policy "Users remove their own favorites"
  on public.favorite_characters for delete
  using (auth.uid() = user_id);

drop trigger if exists rate_limit_favorite_characters on public.favorite_characters;
create trigger rate_limit_favorite_characters before insert on public.favorite_characters
  for each row execute function public.enforce_rate_limit('60', '10 minutes');
