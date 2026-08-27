-- ============================================================
-- PTN Wiki TH — ไกด์ตัวละครโดยผู้เล่น
-- ============================================================
-- แท็บใหม่ในหน้าตัวละคร ให้สมาชิกที่ล็อกอินแล้วเขียนไกด์ได้
-- ไกด์ขึ้นเว็บทันทีไม่ต้องรออนุมัติ แอดมิน/โมเดอเรเตอร์ลบทีหลังได้
--
-- ปลอดภัยต่อการรันซ้ำ (idempotent)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1) ตารางไกด์
-- ------------------------------------------------------------
create table if not exists public.character_guides (
  id            uuid primary key default uuid_generate_v4(),
  character_id  uuid not null references public.characters(id) on delete cascade,
  author_id     uuid not null references public.profiles(id)   on delete cascade,

  title         text not null,
  patch_version text,                              -- ไกด์เกมกาชาเน่าเร็ว ต้องรู้ว่าเขียนตอนแพตช์ไหน
  tags          text[] not null default '{}',      -- บริบท เช่น PvE / Crimson Abyss / สายฟรี

  -- ── กล่องสรุปการลงทุน (ผูกกับข้อมูลจริงของตัวละคร) ──
  skill_priority     text[] not null default '{}', -- id (หรือชื่อ) ของสกิล เรียงตามลำดับที่ควรอัป
  level_from         text,                         -- เช่น '7777'
  level_to           text,                         -- เช่น '9090'
  notable_shackles   integer[] not null default '{}',  -- เลข stage ของ Shackle ที่คุ้มค่า
  recommended_ecb_id uuid references public.crimebrands(id) on delete set null,
  recommended_team   uuid[] not null default '{}', -- character id ของเพื่อนร่วมทีม

  -- ── เนื้อไกด์ ──
  sections      jsonb not null default '[]'::jsonb, -- [{ heading, body }] body เป็น markdown

  upvotes       integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- เรียงไกด์ของตัวละครหนึ่ง ๆ จากโหวตมากไปน้อย
create index if not exists idx_character_guides_char
  on public.character_guides(character_id, upvotes desc, created_at desc);

create index if not exists idx_character_guides_author
  on public.character_guides(author_id);

alter table public.character_guides enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'character_guides' and policyname = 'Guides are viewable by everyone') then
    create policy "Guides are viewable by everyone"
      on public.character_guides for select using (true);
  end if;

  -- สมาชิกที่ล็อกอินแล้วเขียนได้ แต่เขียนในนามตัวเองเท่านั้น
  if not exists (select 1 from pg_policies where tablename = 'character_guides' and policyname = 'Members can write their own guide') then
    create policy "Members can write their own guide"
      on public.character_guides for insert
      with check (auth.uid() = author_id);
  end if;

  -- เจ้าของแก้ได้ แอดมิน/โมเดอเรเตอร์แก้ได้
  if not exists (select 1 from pg_policies where tablename = 'character_guides' and policyname = 'Author or staff can update a guide') then
    create policy "Author or staff can update a guide"
      on public.character_guides for update
      using (
        auth.uid() = author_id
        or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
      )
      with check (
        auth.uid() = author_id
        or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
      );
  end if;

  if not exists (select 1 from pg_policies where tablename = 'character_guides' and policyname = 'Author or staff can delete a guide') then
    create policy "Author or staff can delete a guide"
      on public.character_guides for delete
      using (
        auth.uid() = author_id
        or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator'))
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) โหวต "มีประโยชน์" — โครงเดียวกับ tier_list_votes
-- ------------------------------------------------------------
create table if not exists public.character_guide_votes (
  id         uuid primary key default uuid_generate_v4(),
  guide_id   uuid not null references public.character_guides(id) on delete cascade,
  user_id    uuid not null references public.profiles(id)         on delete cascade,
  created_at timestamptz not null default now(),
  unique (guide_id, user_id)
);

alter table public.character_guide_votes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'character_guide_votes' and policyname = 'Guide votes are viewable by everyone') then
    create policy "Guide votes are viewable by everyone"
      on public.character_guide_votes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'character_guide_votes' and policyname = 'Members can vote') then
    create policy "Members can vote"
      on public.character_guide_votes for insert
      with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'character_guide_votes' and policyname = 'Members can remove their vote') then
    create policy "Members can remove their vote"
      on public.character_guide_votes for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- นับโหวตให้อัตโนมัติ (แบบเดียวกับ tier_lists)
create or replace function public.update_character_guide_upvotes()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.character_guides set upvotes = upvotes + 1 where id = NEW.guide_id;
  elsif TG_OP = 'DELETE' then
    update public.character_guides set upvotes = upvotes - 1 where id = OLD.guide_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_guide_vote_change on public.character_guide_votes;
create trigger on_guide_vote_change
  after insert or delete on public.character_guide_votes
  for each row execute procedure public.update_character_guide_upvotes();

-- ------------------------------------------------------------
-- 3) ตรวจผล — ต้องขึ้น "ok" ทุกบรรทัด
-- ------------------------------------------------------------
with expected(tbl, col) as (values
  ('character_guides', 'character_id'),
  ('character_guides', 'author_id'),
  ('character_guides', 'title'),
  ('character_guides', 'patch_version'),
  ('character_guides', 'tags'),
  ('character_guides', 'skill_priority'),
  ('character_guides', 'level_from'),
  ('character_guides', 'level_to'),
  ('character_guides', 'notable_shackles'),
  ('character_guides', 'recommended_ecb_id'),
  ('character_guides', 'recommended_team'),
  ('character_guides', 'sections'),
  ('character_guides', 'upvotes'),
  ('character_guide_votes', 'guide_id'),
  ('character_guide_votes', 'user_id')
)
select
  e.tbl                                     as "ตาราง",
  e.col                                     as "คอลัมน์",
  case when c.column_name is null
       then '>>> MISSING <<<' else 'ok' end as "สถานะ"
from expected e
left join information_schema.columns c
  on  c.table_schema = 'public'
  and c.table_name   = e.tbl
  and c.column_name  = e.col
order by (c.column_name is null) desc, e.tbl, e.col;
