-- ============================================================
-- PTN Wiki TH — รองรับอีเวนต์ถาวร (ไม่มีวันเริ่ม/วันสิ้นสุด)
-- ============================================================
-- เนื้อเรื่องหลักกับ Eternal Nightmare อยู่ในเกมตลอด ไม่มีกำหนดปิด
-- จึงต้องปล่อยให้ start_date / end_date ว่างได้
--
-- ปลอดภัยต่อการรันซ้ำ — drop not null ซ้ำไม่ error
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

alter table public.events alter column start_date drop not null;
alter table public.events alter column end_date   drop not null;

-- ------------------------------------------------------------
-- ตรวจผล — ทั้งสองแถวต้องขึ้น "ว่างได้"
-- ------------------------------------------------------------
select
  column_name                                          as "คอลัมน์",
  case when is_nullable = 'YES'
       then 'ว่างได้' else '>>> ยังบังคับกรอก <<<' end as "สถานะ"
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'events'
  and column_name in ('start_date', 'end_date')
order by column_name;
