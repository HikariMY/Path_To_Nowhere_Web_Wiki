-- ============================================================
-- PTN Wiki TH — Tier list details (รายละเอียดแบบเทียร์ลิสต์จีน)
-- ============================================================
-- เพิ่มคอลัมน์ให้ tier_lists — ไม่ลบ/ไม่แก้คอลัมน์เดิม โค้ดเวอร์ชันที่ออนไลน์อยู่ตอนนี้ใช้ต่อได้ตามปกติ
-- จึงรันไฟล์นี้ก่อน merge PR ได้เลย (แนะนำให้รันก่อน)
--   server        'global' | 'cn'   เทียร์ลิสต์ทางการแยกตามเซิร์ฟ
--   role_columns  jsonb array       ชื่อคอลัมน์ตามบทบาท เช่น ["Damage","Support"] (ว่าง = ไม่แบ่ง)
--   legend        jsonb array       คีย์เครื่องหมายที่ใช้ เช่น ["limited","budget"]
--   source        jsonb object      เครดิตต้นฉบับ { title, author, url, original_url?, date? }
--   is_archived   boolean           แพทช์ก่อนหน้า (ยังเปิดดูได้ แต่ไม่ใช่อันปัจจุบัน)
-- เครื่องหมาย / หมายเหตุ / คอลัมน์ของแต่ละตัว เก็บใน tiers (jsonb เดิม) เป็นช่องเสริม note / details
--
-- + ปิดช่องโหว่เดิม: insert policy เช็กแค่ผู้สร้าง ผู้ใช้ทั่วไปจึงสร้างเทียร์ลิสต์ is_official = true ได้
--   ตอนนี้ตั้งเป็นทางการได้เฉพาะแอดมิน (เหมือนกับ update policy ที่มีอยู่แล้ว)
-- + trigger: server / source / is_archived แก้ได้เฉพาะแอดมิน (กันเทียร์ลิสต์ชุมชนปลอมเครดิตต้นฉบับ)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

alter table public.tier_lists
  add column if not exists server       text    not null default 'global',
  add column if not exists role_columns jsonb   not null default '[]'::jsonb,
  add column if not exists legend       jsonb   not null default '[]'::jsonb,
  add column if not exists source       jsonb,
  add column if not exists is_archived  boolean not null default false;

alter table public.tier_lists drop constraint if exists tier_lists_server_check;
alter table public.tier_lists add constraint tier_lists_server_check
  check (server in ('global', 'cn'));

alter table public.tier_lists drop constraint if exists tier_lists_role_columns_check;
alter table public.tier_lists add constraint tier_lists_role_columns_check
  check (jsonb_typeof(role_columns) = 'array' and jsonb_array_length(role_columns) <= 4);

alter table public.tier_lists drop constraint if exists tier_lists_legend_check;
alter table public.tier_lists add constraint tier_lists_legend_check
  check (jsonb_typeof(legend) = 'array' and jsonb_array_length(legend) <= 10);

-- ลิงก์เครดิตต้องเป็น http(s) — หน้าเว็บกรองซ้ำอีกชั้นก่อนแสดง
alter table public.tier_lists drop constraint if exists tier_lists_source_check;
alter table public.tier_lists add constraint tier_lists_source_check
  check (source is null or (jsonb_typeof(source) = 'object' and coalesce(source->>'url', '') ~* '^https?://'));

create index if not exists idx_tier_lists_official_server
  on public.tier_lists (server, is_archived) where is_official;

-- insert: สร้างในชื่อตัวเองเท่านั้น และตั้งเป็นทางการได้เฉพาะแอดมิน
-- (ลบทั้งชื่อเดิมจาก supabase_schema.sql และชื่อจาก supabase_migration_moderation.sql — policy หลายอันจะ OR กัน)
drop policy if exists "Authenticated users can create tier lists" on public.tier_lists;
drop policy if exists "Users create tier lists as themselves" on public.tier_lists;
create policy "Users create tier lists as themselves"
  on public.tier_lists for insert
  with check (
    auth.uid() = author_id
    and (is_official = false
         or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  );

-- server / source / is_archived ตั้งได้เฉพาะแอดมิน — ผู้ใช้ทั่วไปยิง API ตรงก็ไม่มีผล (insert = ค่าเริ่มต้น, update = คงค่าเดิม)
-- auth.uid() ว่าง = SQL Editor / service role (เช่นสคริปต์กู้ข้อมูลจาก backup) ไม่ต้องกัน
create or replace function public.tier_lists_guard_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.server := 'global';
    new.source := null;
    new.is_archived := false;
  else
    new.server := old.server;
    new.source := old.source;
    new.is_archived := old.is_archived;
  end if;
  return new;
end;
$$;

drop trigger if exists tier_lists_guard_admin_fields on public.tier_lists;
create trigger tier_lists_guard_admin_fields
  before insert or update on public.tier_lists
  for each row execute function public.tier_lists_guard_admin_fields();

-- ตรวจผล: ควรเห็น 5 คอลัมน์ใหม่ และ insert policy เดียว
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'tier_lists'
  and column_name in ('server', 'role_columns', 'legend', 'source', 'is_archived');

select policyname, with_check
from pg_policies
where schemaname = 'public' and tablename = 'tier_lists' and cmd = 'INSERT';
