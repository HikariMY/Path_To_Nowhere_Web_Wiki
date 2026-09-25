-- ============================================================
-- PTN Wiki TH — สร้างโปรไฟล์ให้บัญชีที่ยังไม่มี
-- ============================================================
-- ปัญหา: บัญชีที่สมัครด้วยอีเมลช่วงแรก (มี.ค. 2026) บางบัญชีไม่มีแถวใน profiles
-- เว็บจึงแสดงเหมือนยังไม่ได้ล็อกอิน แม้จะล็อกอินอยู่ — และการเชื่อม Google/Discord
-- เข้ากับบัญชีเดิมก็ไม่ช่วย เพราะ trigger ทำงานตอนสร้างผู้ใช้ใหม่เท่านั้น
--
-- ไฟล์นี้สร้างโปรไฟล์ให้ทุกบัญชีที่ยังไม่มี ด้วยกฎเดียวกับ handle_new_user
-- (supabase_migration_social_login.sql):
--   username     = ชื่อจากฟอร์ม / ชื่อผู้ใช้ของแพลตฟอร์ม / ส่วนหน้าอีเมล
--                  เหลือ a-z A-Z 0-9 _ ยาว 3–20 ตัว ถ้าซ้ำต่อท้าย _ + 4 ตัวจาก id
--   display_name = ชื่อแสดงจาก Discord/Google (ถ้ามี)
--   avatar_url   = รูปจาก Discord/Google (ถ้ามี)
--   role         = ค่า default 'user'
--
-- ไม่แตะโปรไฟล์ที่มีอยู่แล้ว · ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--          ตารางผลลัพธ์ท้ายไฟล์ต้องขึ้น users_without_profile = 0
-- ============================================================

do $$
declare
  u         record;
  meta      jsonb;
  id_hex    text;
  base      text;
  candidate text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    where not exists (select 1 from public.profiles p where p.id = au.id)
    order by au.created_at
  loop
    meta   := coalesce(u.raw_user_meta_data, '{}'::jsonb);
    id_hex := replace(u.id::text, '-', '');

    base := coalesce(
      nullif(meta->>'username', ''),
      nullif(meta->>'user_name', ''),
      nullif(meta->>'preferred_username', ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
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
      u.id,
      candidate,
      nullif(left(coalesce(
        meta->'custom_claims'->>'global_name',
        meta->>'full_name',
        meta->>'name',
        ''
      ), 32), ''),
      coalesce(nullif(meta->>'avatar_url', ''), nullif(meta->>'picture', ''))
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

select count(*) as users_without_profile
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
