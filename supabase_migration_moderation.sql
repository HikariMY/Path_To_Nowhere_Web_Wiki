-- ============================================================
-- PTN Wiki TH — กันโพสต์ถี่ (rate limit) + ระบบรายงานเนื้อหา
-- ============================================================
-- 1) แก้ policy ตอนสร้างกระทู้ / ตอบกลับ / เทียร์ลิสต์ ให้ author_id ต้องเป็นตัวเอง
--    เดิมเช็กแค่ "ล็อกอินอยู่" → ยิง API ตรงสร้างเนื้อหาในชื่อคนอื่นได้
-- 2) rate limit ด้วย trigger ก่อน insert — ยิง API ตรงก็เลี่ยงไม่ได้
--    แอดมิน/โมเดอเรเตอร์ และ SQL Editor / service role ไม่โดนจำกัด
--      กระทู้ 3 ครั้ง / 10 นาที     ตอบกลับ 10 ครั้ง / 5 นาที
--      เทียร์ลิสต์ 5 ครั้ง / ชั่วโมง  ไกด์ 3 ครั้ง / ชั่วโมง     รายงาน 10 ครั้ง / ชั่วโมง
--    โดนจำกัด → error ข้อความ "RATE_LIMIT:<วินาทีที่ต้องรอ>" (หน้าเว็บแปลงเป็นภาษาไทย)
--    นับจากตารางบันทึก rate_limit_events (ผู้ใช้อ่าน/เขียน/ลบเองไม่ได้) ไม่ใช่จากตารางเนื้อหา
--    — ลบโพสต์ตัวเองหรือแก้ created_at ก็ไม่ช่วยให้โควตาคืน และล็อกต่อผู้ใช้กันยิงพร้อมกันหลายคำขอ
-- 3) ตาราง reports — ผู้ใช้รายงานกระทู้ / คำตอบ / เทียร์ลิสต์ / ไกด์ ได้เรื่องละครั้ง
--    ผู้ใช้เห็นเฉพาะรายงานของตัวเอง แอดมิน/โมเดอเรเตอร์เห็นและปิดเรื่องได้ทั้งหมด
--    ทีมงานแก้ได้แค่สถานะ — resolved_by / resolved_at ถูกตั้งให้อัตโนมัติ (ปลอมไม่ได้)
--
-- ต้องรัน supabase_migration_protect_roles.sql ก่อน (ไม่งั้นผู้ใช้ตั้งตัวเองเป็นทีมงานแล้วข้ามทุกอย่างได้)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--          ตารางท้ายไฟล์ = policy insert ที่เหลืออยู่ของ 3 ตาราง ต้องมีแค่ตัว "... as themselves"
--          ถ้ามี policy insert ชื่ออื่นค้างอยู่ ให้ลบทิ้ง (policy หลายตัวใช้แบบ OR — ตัวเก่ายังเปิดช่องอยู่)
-- ============================================================

-- ── 1) author_id ต้องเป็นตัวเอง ────────────────────────────────
drop policy if exists "Authenticated users can create posts" on public.forum_posts;
drop policy if exists "Users create posts as themselves" on public.forum_posts;
create policy "Users create posts as themselves"
  on public.forum_posts for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authenticated users can reply" on public.forum_replies;
drop policy if exists "Users reply as themselves" on public.forum_replies;
create policy "Users reply as themselves"
  on public.forum_replies for insert
  with check (auth.uid() = author_id);

drop policy if exists "Authenticated users can create tier lists" on public.tier_lists;
drop policy if exists "Users create tier lists as themselves" on public.tier_lists;
create policy "Users create tier lists as themselves"
  on public.tier_lists for insert
  with check (auth.uid() = author_id);

-- ── 3) ตาราง reports (สร้างก่อน trigger rate limit) ─────────────
create table if not exists public.reports (
  id           uuid primary key default uuid_generate_v4(),
  reporter_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('forum_post', 'forum_reply', 'tier_list', 'character_guide')),
  target_id    uuid not null,
  reason       text not null check (reason in ('spam', 'harassment', 'wrong_info', 'inappropriate', 'other')),
  detail       text check (char_length(detail) <= 500),
  status       text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by  uuid references public.profiles(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index if not exists idx_reports_status_created on public.reports (status, created_at desc);
create index if not exists idx_reports_target on public.reports (target_type, target_id);

alter table public.reports enable row level security;

drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id and status = 'open' and resolved_by is null and resolved_at is null);

drop policy if exists "Users see own reports, staff see all" on public.reports;
create policy "Users see own reports, staff see all"
  on public.reports for select
  using (auth.uid() = reporter_id
         or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

drop policy if exists "Staff can update reports" on public.reports;
create policy "Staff can update reports"
  on public.reports for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

drop policy if exists "Admins can delete reports" on public.reports;
create policy "Admins can delete reports"
  on public.reports for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ทีมงานแก้ได้แค่ status — ข้อมูลรายงานเดิมห้ามแก้ และ resolved_by / resolved_at ตั้งให้เอง (ปลอมไม่ได้)
create or replace function public.guard_report_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- SQL Editor / service role
  end if;
  if (new.reporter_id, new.target_type, new.target_id, new.reason, new.detail, new.created_at)
     is distinct from (old.reporter_id, old.target_type, old.target_id, old.reason, old.detail, old.created_at) then
    raise exception 'แก้ได้เฉพาะสถานะของรายงาน' using errcode = '42501';
  end if;
  new.resolved_by := case when new.status = 'open' then null else auth.uid() end;
  new.resolved_at := case when new.status = 'open' then null else now() end;
  return new;
end;
$$;

drop trigger if exists guard_report_update on public.reports;
create trigger guard_report_update before update on public.reports
  for each row execute function public.guard_report_update();

-- ── 2) rate limit ─────────────────────────────────────────────
-- ตารางบันทึกการสร้างเนื้อหา — เปิด RLS แต่ไม่มี policy เลย → ผู้ใช้ทั่วไปแตะไม่ได้
-- มีแค่ enforce_rate_limit() (security definer) ที่อ่าน/เขียน
create table if not exists public.rate_limit_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  action      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_rate_limit_events_lookup on public.rate_limit_events (user_id, action, created_at desc);
alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;

-- อาร์กิวเมนต์ trigger: จำนวนครั้งสูงสุด, ช่วงเวลา (interval) — นับแยกตามตาราง
create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_rows  integer  := TG_ARGV[0]::integer;
  win       interval := TG_ARGV[1]::interval;
  uid       uuid     := auth.uid();
  recent    integer;
  oldest    timestamptz;
begin
  -- SQL Editor / service role (ไม่มีผู้ใช้) และทีมงาน ไม่จำกัด
  if uid is null
     or exists (select 1 from public.profiles where id = uid and role in ('admin', 'moderator')) then
    return new;
  end if;

  -- คำขอพร้อมกันของผู้ใช้คนเดียวต้องรอกันทีละคำขอ — ไม่งั้นทุกคำขออ่านตัวนับค่าเดิมแล้วผ่านหมด
  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || TG_TABLE_NAME || ':' || uid::text, 0));

  -- เก็บแค่ 1 วันล่าสุด (ช่วงเวลาที่ใช้ไม่เกิน 1 ชั่วโมง)
  delete from public.rate_limit_events
   where user_id = uid and action = TG_TABLE_NAME and created_at < now() - interval '1 day';

  select count(*), min(created_at) into recent, oldest
    from public.rate_limit_events
   where user_id = uid and action = TG_TABLE_NAME and created_at > now() - win;

  if recent >= max_rows then
    raise exception 'RATE_LIMIT:%', greatest(1, ceil(extract(epoch from (oldest + win - now()))))::integer
      using errcode = 'P0001';
  end if;

  -- ถ้า insert เนื้อหาล้มทีหลัง แถวนี้ rollback ไปด้วย — นับเฉพาะที่สร้างสำเร็จ
  insert into public.rate_limit_events (user_id, action) values (uid, TG_TABLE_NAME);
  return new;
end;
$$;

drop trigger if exists rate_limit_forum_posts on public.forum_posts;
create trigger rate_limit_forum_posts before insert on public.forum_posts
  for each row execute function public.enforce_rate_limit('3', '10 minutes');

drop trigger if exists rate_limit_forum_replies on public.forum_replies;
create trigger rate_limit_forum_replies before insert on public.forum_replies
  for each row execute function public.enforce_rate_limit('10', '5 minutes');

drop trigger if exists rate_limit_tier_lists on public.tier_lists;
create trigger rate_limit_tier_lists before insert on public.tier_lists
  for each row execute function public.enforce_rate_limit('5', '1 hour');

drop trigger if exists rate_limit_character_guides on public.character_guides;
create trigger rate_limit_character_guides before insert on public.character_guides
  for each row execute function public.enforce_rate_limit('3', '1 hour');

drop trigger if exists rate_limit_reports on public.reports;
create trigger rate_limit_reports before insert on public.reports
  for each row execute function public.enforce_rate_limit('10', '1 hour');

-- ── ตรวจผล: policy insert ที่เหลืออยู่ ──────────────────────────
select tablename, policyname, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('forum_posts', 'forum_replies', 'tier_lists')
  and cmd = 'INSERT'
order by tablename, policyname;
