-- ============================================================
-- PTN Wiki TH — bucket เก็บ backup รายคืน
-- ============================================================
-- GitHub Actions (scripts/backup.ts) เขียนไฟล์ YYYY-MM-DD.json ลง bucket นี้ทุกคืน 02:00 เวลาไทย
-- และลบไฟล์ที่เก่ากว่า 30 วันเอง
--
-- bucket เป็นแบบส่วนตัว และไม่มี policy ใด ๆ → ผู้ใช้เว็บ (anon / login) อ่านเขียนไม่ได้เลย
-- มีแค่ service role key (ใน GitHub Secrets) กับ Supabase Dashboard ที่เข้าถึงได้
-- ดาวน์โหลด backup: Dashboard → Storage → backups → เลือกไฟล์ → Download
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

select id, public from storage.buckets where id = 'backups';
