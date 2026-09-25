-- ============================================================
-- PTN Wiki TH — คอมเมนต์ใต้ไกด์ตัวละคร
-- ============================================================
-- ทุกคนอ่านได้ · ล็อกอินแล้วคอมเมนต์ได้ (ในชื่อตัวเองเท่านั้น)
-- แก้ได้เฉพาะเจ้าของ (ย้ายไปไกด์อื่นไม่ได้) · ลบได้เจ้าของหรือแอดมิน/โมเดอเรเตอร์
-- คอมเมนต์ได้ไม่เกิน 10 ครั้ง / 5 นาที (enforce_rate_limit จาก supabase_migration_moderation.sql — ต้องรันก่อน)
-- ปุ่มรายงานรองรับคอมเมนต์ด้วย (reports.target_type = 'guide_comment')
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.guide_comments (
  id          uuid primary key default uuid_generate_v4(),
  guide_id    uuid not null references public.character_guides(id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content     text not null check (char_length(btrim(content)) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_guide_comments_guide_created on public.guide_comments (guide_id, created_at);

alter table public.guide_comments enable row level security;

drop policy if exists "Guide comments are viewable by everyone" on public.guide_comments;
create policy "Guide comments are viewable by everyone"
  on public.guide_comments for select
  using (true);

drop policy if exists "Users comment as themselves" on public.guide_comments;
create policy "Users comment as themselves"
  on public.guide_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authors edit their comments" on public.guide_comments;
create policy "Authors edit their comments"
  on public.guide_comments for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Authors and staff delete comments" on public.guide_comments;
create policy "Authors and staff delete comments"
  on public.guide_comments for delete
  using (auth.uid() = author_id
         or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

-- แก้ได้แค่เนื้อหา — ห้ามย้ายไปไกด์อื่น / แก้เวลาสร้าง · updated_at ตั้งให้เอง
create or replace function public.guard_guide_comment_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.guide_id is distinct from old.guide_id or new.created_at is distinct from old.created_at then
    raise exception 'แก้ได้เฉพาะข้อความของคอมเมนต์' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_guide_comment_update on public.guide_comments;
create trigger guard_guide_comment_update before update on public.guide_comments
  for each row execute function public.guard_guide_comment_update();

drop trigger if exists rate_limit_guide_comments on public.guide_comments;
create trigger rate_limit_guide_comments before insert on public.guide_comments
  for each row execute function public.enforce_rate_limit('10', '5 minutes');

-- ── รายงานคอมเมนต์ได้ ────────────────────────────────────────
alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('forum_post', 'forum_reply', 'tier_list', 'character_guide', 'guide_comment'));
