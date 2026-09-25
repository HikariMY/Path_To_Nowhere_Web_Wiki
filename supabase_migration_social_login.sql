-- ============================================================
-- PTN Wiki TH — รองรับล็อกอินด้วย Discord / Google
-- ============================================================
-- ต้องรันก่อนเปิด provider ใน Supabase Dashboard
--
-- ปัญหาเดิม: trigger สร้างโปรไฟล์ใช้ username จากฟอร์มสมัคร หรือส่วนหน้าอีเมล
-- แต่ profiles.username เป็น unique — คนที่ล็อกอินผ่าน Discord/Google ไม่มี username
-- ส่งมา ถ้าส่วนหน้าอีเมลชนกับคนอื่น (john@gmail กับ john@hotmail) การสมัครจะล้มทั้งก้อน
-- ด้วย "Database error saving new user"
--
-- ใหม่:
--   * username = ชื่อจากฟอร์ม / ชื่อผู้ใช้ของแพลตฟอร์ม / ส่วนหน้าอีเมล
--     ตัดให้เหลือ a-z A-Z 0-9 _ ยาว 3–20 ตัว (ตรงกับกฎหน้าสมัครสมาชิก)
--     ถ้าซ้ำต่อท้ายด้วย _ + 4 ตัวจาก id ผู้ใช้ ถ้ายังซ้ำใช้ user_ + 12 ตัวจาก id
--   * display_name = ชื่อที่แสดงบน Discord/Google (ถ้ามี)
--   * avatar_url   = avatar_url (Discord) หรือ picture (Google)
--   * role ยังเป็นค่า default 'user' เสมอ — ล็อกอินภายนอกไม่ได้สิทธิ์เพิ่ม
--
-- ผู้ใช้เดิมไม่กระทบ (trigger ทำงานตอนสร้างบัญชีใหม่เท่านั้น)
-- ปลอดภัยต่อการรันซ้ำ (create or replace)
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  id_hex    text  := replace(new.id::text, '-', '');
  base      text;
  candidate text;
begin
  base := coalesce(
    nullif(meta->>'username', ''),            -- ฟอร์มสมัครสมาชิกของเว็บ
    nullif(meta->>'user_name', ''),           -- Discord / GitHub
    nullif(meta->>'preferred_username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    ''
  );
  base := left(regexp_replace(base, '[^a-zA-Z0-9_]', '', 'g'), 20);
  if length(base) < 3 then
    base := 'user';
  end if;

  candidate := base;
  if exists (select 1 from public.profiles where username = candidate) then
    candidate := left(base, 15) || '_' || substr(id_hex, 1, 4);
    if exists (select 1 from public.profiles where username = candidate) then
      candidate := 'user_' || substr(id_hex, 1, 12);
    end if;
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    nullif(left(coalesce(
      meta->'custom_claims'->>'global_name',  -- ชื่อแสดงของ Discord
      meta->>'full_name',
      meta->>'name',
      ''
    ), 32), ''),
    coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', ''))
  );
  return new;
end;
$$;
