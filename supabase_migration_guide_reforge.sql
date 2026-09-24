-- ============================================================
-- PTN Wiki TH — แนบ build Reforge ในไกด์ผู้เล่น
-- ============================================================
-- ต้องรัน supabase_migration_character_guides.sql และ
-- supabase_migration_reforge.sql มาก่อน
--
-- reforge_build รูปแบบ { "nodes": ["<node id>", ...], "ex": "<character id>" | null }
-- id โหนดอ้างถึง characters.reforge ของตัวละครเดียวกัน — ถ้าแอดมินลบโหนดทีหลัง
-- หน้าเว็บจะกรองทิ้งและบอกผู้อ่าน (parseGuideBuild)
--
-- สิทธิ์ใช้ policy เดิมของ character_guides (เจ้าของ/แอดมิน/โมเดอเรเตอร์แก้ได้)
--
-- ปลอดภัยต่อการรันซ้ำ (idempotent)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

alter table public.character_guides
  add column if not exists reforge_build jsonb;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'character_guides_reforge_build_is_object'
  ) then
    alter table public.character_guides
      add constraint character_guides_reforge_build_is_object
      check (reforge_build is null or jsonb_typeof(reforge_build) = 'object');
  end if;
end $$;
