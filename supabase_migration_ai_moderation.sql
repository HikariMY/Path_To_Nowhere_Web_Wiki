-- ============================================================
-- PTN Wiki TH — AI moderation (TypeSafe) → คิวรายงานของแอดมิน
-- ============================================================
-- มีกระทู้ / คำตอบ / ไกด์ / เทียร์ลิสต์ใหม่ (ที่ไม่ใช่ของทีมงาน)
--   → trigger ยิง Edge Function "moderate-content" ผ่าน pg_net (ไม่รอผล — การโพสต์ไม่ช้าลง)
--   → function ถาม TypeSafe แล้วถ้าเข้าข่าย ใส่รายงานจาก AI (source = 'ai') เข้าคิว /admin/reports
--   AI ไม่ลบ ไม่ซ่อนเนื้อหาเอง — แอดมินเป็นคนตัดสิน
--   ถ้ายังไม่ได้ตั้งค่า หรือ function ล่ม การโพสต์ยังทำงานปกติ
--
-- ต้องรัน supabase_migration_moderation.sql ก่อน (ตาราง reports)
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--          ตารางท้ายไฟล์โชว์ webhook secret — copy ไปตั้งเป็น MODERATION_WEBHOOK_SECRET ของ Edge Function
--          เสร็จแล้วลบ query นี้ออกจากประวัติ SQL Editor (secret คือด่านเดียวที่กันคนนอกยิง function)
-- เปลี่ยน secret ใหม่ (ถ้าสงสัยว่าหลุด):
--   select vault.update_secret((select id from vault.secrets where name = 'moderation_webhook_secret'),
--                              encode(extensions.gen_random_bytes(32), 'hex'));
--   แล้ว select ค่าใหม่ไปตั้งใน Edge Function อีกครั้ง
--
-- ตรวจทั้งตอนสร้าง และตอนแก้ข้อความ (ไม่งั้นโพสต์ของปกติก่อนแล้วค่อยแก้ทีหลังได้)
-- จำกัดการส่งตรวจ 30 ครั้ง / ชั่วโมง / ผู้ใช้ (กันแก้โพสต์รัว ๆ ให้เสียค่า API) — เกินแล้วข้ามเงียบ ๆ ไม่ขวางการโพสต์
-- ============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ── reports: รองรับรายงานจาก AI ─────────────────────────────────
alter table public.reports alter column reporter_id drop not null;
alter table public.reports add column if not exists source text not null default 'user';
alter table public.reports add column if not exists ai_scores jsonb;

alter table public.reports drop constraint if exists reports_source_check;
alter table public.reports add constraint reports_source_check check (source in ('user', 'ai'));

-- รายงานจากผู้ใช้ต้องมีผู้รายงาน / รายงานจาก AI ต้องไม่มี
alter table public.reports drop constraint if exists reports_source_reporter_check;
alter table public.reports add constraint reports_source_reporter_check
  check ((source = 'user') = (reporter_id is not null));

-- AI มีธงที่ยังเปิดอยู่ได้ครั้งละหนึ่งอันต่อเนื้อหา (ปิดเรื่องแล้วถ้าถูกแก้เป็นของไม่ดี ติดธงใหม่ได้)
drop index if exists public.uq_reports_ai_target;
create unique index uq_reports_ai_target on public.reports (target_type, target_id) where source = 'ai' and status = 'open';

-- ผู้ใช้ส่งได้แค่รายงานของตัวเองแบบ source = 'user'
drop policy if exists "Users can file reports" on public.reports;
create policy "Users can file reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id and source = 'user' and ai_scores is null
              and status = 'open' and resolved_by is null and resolved_at is null);

-- ทีมงานแก้ได้แค่ status (เพิ่ม source / ai_scores เข้ารายการห้ามแก้)
create or replace function public.guard_report_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- SQL Editor / service role
  end if;
  if (new.reporter_id, new.target_type, new.target_id, new.reason, new.detail, new.created_at, new.source, new.ai_scores)
     is distinct from
     (old.reporter_id, old.target_type, old.target_id, old.reason, old.detail, old.created_at, old.source, old.ai_scores) then
    raise exception 'แก้ได้เฉพาะสถานะของรายงาน' using errcode = '42501';
  end if;
  new.resolved_by := case when new.status = 'open' then null else auth.uid() end;
  new.resolved_at := case when new.status = 'open' then null else now() end;
  return new;
end;
$$;

-- ── ค่าที่ trigger ใช้เรียก function (เก็บใน Vault ไม่อยู่ในโค้ด) ────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'moderation_function_url') then
    perform vault.create_secret(
      'https://onqlfdjbemzwkcnnrqnm.supabase.co/functions/v1/moderate-content',
      'moderation_function_url'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'moderation_webhook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'moderation_webhook_secret');
  end if;
end;
$$;

-- ── trigger: มีเนื้อหาใหม่ → ส่งให้ Edge Function ตรวจ ──────────────
create or replace function public.request_ai_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  secret text;
  max_checks_per_hour constant integer := 30;
begin
  -- ทีมงานไม่ต้องตรวจ
  if exists (select 1 from public.profiles where id = new.author_id and role in ('admin', 'moderator')) then
    return new;
  end if;

  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'moderation_function_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'moderation_webhook_secret';
  if fn_url is null or secret is null then
    return new;
  end if;

  -- เพดานการส่งตรวจต่อผู้ใช้ (ใช้ตาราง ledger เดียวกับ rate limit) — เกินแล้วข้าม ไม่ขวางการโพสต์
  delete from public.rate_limit_events
   where user_id = new.author_id and action = 'ai_moderation' and created_at < now() - interval '1 day';
  if (select count(*) from public.rate_limit_events
       where user_id = new.author_id and action = 'ai_moderation' and created_at > now() - interval '1 hour')
     >= max_checks_per_hour then
    return new;
  end if;
  insert into public.rate_limit_events (user_id, action) values (new.author_id, 'ai_moderation');

  -- ส่งแค่ตาราง + id — function อ่านเนื้อหาจริงเองด้วย service role
  perform net.http_post(
    url := fn_url,
    body := jsonb_build_object('table', TG_TABLE_NAME, 'id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-moderation-secret', secret),
    timeout_milliseconds := 20000
  );
  return new;
exception when others then
  -- ตั้งค่าผิด / pg_net มีปัญหา → ห้ามทำให้การโพสต์ล้ม
  raise warning 'request_ai_moderation: %', sqlerrm;
  return new;
end;
$$;

revoke execute on function public.request_ai_moderation() from public, anon, authenticated;

drop trigger if exists ai_moderation_forum_posts on public.forum_posts;
create trigger ai_moderation_forum_posts after insert on public.forum_posts
  for each row execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_forum_replies on public.forum_replies;
create trigger ai_moderation_forum_replies after insert on public.forum_replies
  for each row execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_character_guides on public.character_guides;
create trigger ai_moderation_character_guides after insert on public.character_guides
  for each row execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_tier_lists on public.tier_lists;
create trigger ai_moderation_tier_lists after insert on public.tier_lists
  for each row execute function public.request_ai_moderation();

-- ตอนแก้ — เฉพาะเมื่อข้อความเปลี่ยนจริง (ยอดวิว / โหวต / ปักหมุด ไม่นับ)
drop trigger if exists ai_moderation_forum_posts_edit on public.forum_posts;
create trigger ai_moderation_forum_posts_edit after update of title, content on public.forum_posts
  for each row when (old.title is distinct from new.title or old.content is distinct from new.content)
  execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_forum_replies_edit on public.forum_replies;
create trigger ai_moderation_forum_replies_edit after update of content on public.forum_replies
  for each row when (old.content is distinct from new.content)
  execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_character_guides_edit on public.character_guides;
create trigger ai_moderation_character_guides_edit after update of title, sections on public.character_guides
  for each row when (old.title is distinct from new.title or old.sections is distinct from new.sections)
  execute function public.request_ai_moderation();

drop trigger if exists ai_moderation_tier_lists_edit on public.tier_lists;
create trigger ai_moderation_tier_lists_edit after update of title, description on public.tier_lists
  for each row when (old.title is distinct from new.title or old.description is distinct from new.description)
  execute function public.request_ai_moderation();

-- ── ค่าที่ต้อง copy ไปตั้งใน Edge Function ─────────────────────────
select name, decrypted_secret
from vault.decrypted_secrets
where name in ('moderation_function_url', 'moderation_webhook_secret');
