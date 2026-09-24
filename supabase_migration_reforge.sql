-- ============================================================
-- PTN Wiki TH — ระบบ Reforge
-- ============================================================
-- เก็บต้นไม้ Reforge ของตัวละครเป็น jsonb (รูปแบบเดียวกับ shackles)
-- โครงสร้างดู ReforgeData ใน src/types/models.ts
--   { cost_base, cost_bonus, nodes[], effects[], ex_anchor?, presets[] }
-- ตัวละครที่ไม่มี Reforge ให้เป็น null — หน้าเว็บจะซ่อนแท็บ
--
-- สิทธิ์ใช้ policy เดิมของตาราง characters (อ่านได้ทุกคน แก้ได้เฉพาะแอดมิน)
--
-- ปลอดภัยต่อการรันซ้ำ (idempotent)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

alter table public.characters
  add column if not exists reforge jsonb;

-- บังคับอย่างน้อยให้เป็น object — รายละเอียดข้างในตรวจที่ฝั่งเว็บ (validateReforge)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'characters_reforge_is_object'
  ) then
    alter table public.characters
      add constraint characters_reforge_is_object
      check (reforge is null or jsonb_typeof(reforge) = 'object');
  end if;
end $$;
