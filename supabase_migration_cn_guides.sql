-- ============================================================
-- PTN Wiki TH — สรุปไกด์จากผู้เล่นเซิร์ฟจีน (แท็บไกด์ → "ข้อมูลจากผู้เล่นจีน")
-- ============================================================
-- ตารางใหม่ ไม่แตะตารางเดิม — เว็บที่ออนไลน์อยู่ตอนนี้ใช้ต่อได้ตามปกติ รันก่อน merge PR ได้เลย
--   ทีมงานเขียนสรุปด้วยคำของเราเอง (ไม่แปลทั้งบท) ต้องมีเครดิตผู้เขียน + ลิงก์ต้นฉบับทุกครั้ง
--   points = [{ "title": "บทบาท", "body": "DPS สาย Long Fight ..." }, ...]  (1–12 ข้อ)
--   checked_at = วันที่ตรวจกับต้นฉบับล่าสุด (หน้าแอดมินเตือนเมื่อเกิน 60 วัน)
--   ทุกคนอ่านได้ · เพิ่ม/แก้/ลบได้เฉพาะแอดมิน
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.character_cn_guides (
  id             uuid primary key default uuid_generate_v4(),
  character_id   uuid not null references public.characters(id) on delete cascade,
  verdict        text check (verdict is null or char_length(verdict) <= 120),
  points         jsonb not null default '[]'::jsonb
                   check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 1 and 12),
  source_title   text not null check (char_length(btrim(source_title)) between 1 and 200),
  source_author  text not null check (char_length(btrim(source_author)) between 1 and 100),
  source_url     text not null check (source_url ~* '^https?://'),
  checked_at     date not null default current_date,
  sort_order     integer not null default 0,
  created_by     uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_character_cn_guides_char
  on public.character_cn_guides (character_id, sort_order, created_at);

alter table public.character_cn_guides enable row level security;

drop policy if exists "CN guide summaries are viewable by everyone" on public.character_cn_guides;
create policy "CN guide summaries are viewable by everyone"
  on public.character_cn_guides for select using (true);

drop policy if exists "Admins manage CN guide summaries" on public.character_cn_guides;
create policy "Admins manage CN guide summaries"
  on public.character_cn_guides for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ตรวจผล: ควรเห็นตาราง (0 แถว) และ policy 2 อัน
select count(*) as rows from public.character_cn_guides;

select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'character_cn_guides'
order by policyname;
