-- ============================================================
-- PTN Wiki TH — ปิดอีเวนต์ที่หมดเวลาให้อัตโนมัติ (ทุกชั่วโมง)
-- ============================================================
-- เดิมแอดมินต้องเข้าไปกดปิด (is_active) เองหลังอีเวนต์จบ
-- ใหม่: pg_cron เรียก deactivate_expired_events() ทุกชั่วโมง นาทีที่ 5
--   * ปิดเฉพาะอีเวนต์ที่มี end_date และเลยเวลาแล้ว
--   * อีเวนต์ถาวร (end_date ว่าง) ไม่แตะ
--   * ไม่ลบอะไร — แอดมินเปิดกลับเองได้ถ้าจำเป็น (ถ้า end_date ยังเลยเวลา จะถูกปิดอีกในรอบถัดไป
--     ให้แก้ end_date ก่อน)
--
-- ปลอดภัยต่อการรันซ้ำ (create or replace / cron.schedule ชื่อเดิมจะอัปเดต job เดิม)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--          ผลลัพธ์ท้ายไฟล์บอกจำนวนอีเวนต์ที่ปิดไปในการรันครั้งนี้ และ job ที่ตั้งไว้
-- ============================================================

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.deactivate_expired_events()
returns integer
language sql
security definer
set search_path = public
as $$
  with closed as (
    update public.events
       set is_active = false
     where is_active
       and end_date is not null
       and end_date < now()
    returning 1
  )
  select count(*)::integer from closed;
$$;

-- เรียกได้เฉพาะ cron / SQL Editor — ผู้ใช้ทั่วไปเรียกผ่าน API ไม่ได้
revoke execute on function public.deactivate_expired_events() from public, anon, authenticated;

select cron.schedule(
  'deactivate-expired-events',
  '5 * * * *',
  $$select public.deactivate_expired_events()$$
);

-- ปิดอีเวนต์ที่ค้างอยู่ตอนนี้เลย ไม่ต้องรอรอบแรก
select public.deactivate_expired_events() as closed_now,
       (select schedule from cron.job where jobname = 'deactivate-expired-events') as schedule;
