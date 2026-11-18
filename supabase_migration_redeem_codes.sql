-- ============================================================
-- PTN Wiki TH — Redeem Code + แถบสถานะใต้เมนู
-- ============================================================
-- ตารางใหม่ 2 ตาราง ไม่แก้/ไม่ลบตารางเดิม — รันก่อน merge PR ได้เลย
--   redeem_codes   โค้ดแลกของในเกม: กดคัดลอกได้บนหน้าแรกและแถบสถานะ
--                  หมดอายุ (expires_at) แล้วซ่อนจากหน้าเว็บเอง · ว่าง = ไม่มีวันหมดอายุ
--   site_status    แถวเดียว (id = 1): เปิด/ปิดแถบสถานะ · ชื่อแพทช์ปัจจุบัน · โชว์อีเวนต์ที่ใกล้หมดหรือไม่
--   ทุกคนอ่านได้ · เพิ่ม/แก้/ลบได้เฉพาะแอดมิน
--
-- คัดลอกโค้ดจากประกาศเดิมรูปแบบ "Redeem Code:XXXX" มาใส่ให้ (ประกาศเดิมไม่ถูกแก้หรือลบ
-- ถ้าไม่อยากให้ขึ้นซ้ำในกล่องข่าวสาร ให้ไปปิดประกาศนั้นที่หน้าแอดมิน → ข่าวสาร/ประกาศ)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create table if not exists public.redeem_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null check (code ~ '^\S{1,40}$'),
  reward      text check (reward is null or char_length(reward) <= 120),
  expires_at  timestamptz,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- โค้ดในเกมไม่สนตัวพิมพ์เล็ก/ใหญ่ — กันใส่ซ้ำ
create unique index if not exists idx_redeem_codes_code on public.redeem_codes (lower(code));

create table if not exists public.site_status (
  id          smallint primary key default 1 check (id = 1),
  show_bar    boolean not null default true,
  patch_name  text check (patch_name is null or char_length(patch_name) <= 40),
  show_event  boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.redeem_codes enable row level security;
alter table public.site_status enable row level security;

drop policy if exists "Redeem codes are viewable by everyone" on public.redeem_codes;
create policy "Redeem codes are viewable by everyone"
  on public.redeem_codes for select using (true);

drop policy if exists "Admins manage redeem codes" on public.redeem_codes;
create policy "Admins manage redeem codes"
  on public.redeem_codes for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Site status is viewable by everyone" on public.site_status;
create policy "Site status is viewable by everyone"
  on public.site_status for select using (true);

drop policy if exists "Admins manage site status" on public.site_status;
create policy "Admins manage site status"
  on public.site_status for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ค่าเริ่มต้น: แพทช์ Global ปัจจุบัน (ไม่ทับค่าที่แอดมินตั้งไว้แล้ว)
insert into public.site_status (id, patch_name) values (1, 'Requiem')
on conflict (id) do nothing;

-- คัดลอกโค้ดจากประกาศเดิม (อ่านอย่างเดียว) — โค้ดที่มีอยู่แล้วข้ามไป
insert into public.redeem_codes (code, is_active, sort_order)
select c.code, c.is_active, c.sort_order
from (
  select btrim(substring(content from '(?i)^\s*redeem\s*code\s*:\s*(.*)$')) as code, is_active, sort_order
  from public.announcements
) c
where c.code ~ '^\S{1,40}$'
on conflict do nothing;

-- ตรวจผล: ควรเห็น policy 4 อัน และโค้ดที่คัดลอกมา
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('redeem_codes', 'site_status')
order by tablename, policyname;

select code, is_active from public.redeem_codes order by sort_order, created_at;
