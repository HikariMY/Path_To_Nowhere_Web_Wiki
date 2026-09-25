-- ============================================================
-- PTN Wiki TH — Team Builder
-- ============================================================
-- ผู้ใช้จัดทีมได้สูงสุด 6 ตัว เลือก Crimebrand build ให้แต่ละตัว บันทึกแล้วแชร์ลิงก์ /teams/<id>
--   members = [{ "character_id": "<uuid>", "build_id": "<uuid> | null" }, ...]  (1–6 ช่อง)
--   ทีมสาธารณะทุกคนเห็น · ทีมส่วนตัวเห็นแค่เจ้าของ (และทีมงาน)
--   แก้ได้เฉพาะเจ้าของ · ลบได้เจ้าของหรือแอดมิน
--   สร้างได้ไม่เกิน 10 ทีม / ชั่วโมง (enforce_rate_limit จาก supabase_migration_moderation.sql — ต้องรันก่อน)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.teams (
  id           uuid primary key default uuid_generate_v4(),
  author_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 60),
  description  text check (char_length(description) <= 500),
  members      jsonb not null default '[]'::jsonb
                 check (jsonb_typeof(members) = 'array' and jsonb_array_length(members) between 1 and 6),
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_teams_public_created on public.teams (is_public, created_at desc);
create index if not exists idx_teams_author_created on public.teams (author_id, created_at desc);

alter table public.teams enable row level security;

drop policy if exists "Public teams are viewable, private only by owner and staff" on public.teams;
create policy "Public teams are viewable, private only by owner and staff"
  on public.teams for select
  using (is_public
         or auth.uid() = author_id
         or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

drop policy if exists "Users create teams as themselves" on public.teams;
create policy "Users create teams as themselves"
  on public.teams for insert
  with check (auth.uid() = author_id);

drop policy if exists "Owners update their teams" on public.teams;
create policy "Owners update their teams"
  on public.teams for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Owners and admins delete teams" on public.teams;
create policy "Owners and admins delete teams"
  on public.teams for delete
  using (auth.uid() = author_id
         or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop trigger if exists rate_limit_teams on public.teams;
create trigger rate_limit_teams before insert on public.teams
  for each row execute function public.enforce_rate_limit('10', '1 hour');
