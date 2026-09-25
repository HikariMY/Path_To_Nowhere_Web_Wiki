-- ============================================================
-- PTN Wiki TH — ปิดช่องโหว่ผู้ใช้ตั้งตัวเองเป็นแอดมิน (ด่วน — รันได้เลย ไม่ต้องรอ merge)
-- ============================================================
-- ปัญหา: policy "Users can update own profile" ให้แก้แถวตัวเองได้ทุกคอลัมน์ รวมถึง role
--   → ใครก็ยิง API supabase.from('profiles').update({ role: 'admin' }).eq('id', <ตัวเอง>) ได้
--   แล้วเข้าหน้าแอดมิน / ข้าม rate limit / เห็นรายงานทั้งหมด
--
-- แก้:
--   * trigger ก่อน update: เปลี่ยน role หรือ username ได้เฉพาะแอดมิน (หรือ SQL Editor / service role)
--     ผู้ใช้ทั่วไปยังแก้ชื่อแสดง รูป bio ของตัวเองได้ตามเดิม
--   * policy ให้แอดมินแก้โปรไฟล์คนอื่นได้ (หน้าจัดการสมาชิกใช้เปลี่ยน role)
--
-- ปลอดภัยต่อการรันซ้ำ
-- วิธีใช้: Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
--          ตารางท้ายไฟล์ = ทุกบัญชีที่ role ไม่ใช่ user — ตรวจว่ามีแต่ทีมงานจริง
--          ถ้ามีคนแปลกปลอม: update public.profiles set role = 'user' where username = '<ชื่อ>';
-- ============================================================

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.username is distinct from old.username)
     and auth.uid() is not null
     and not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'เปลี่ยน role หรือชื่อผู้ใช้ได้เฉพาะแอดมิน' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileges on public.profiles;
create trigger protect_profile_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ตรวจผล: ใครมีสิทธิ์พิเศษบ้าง
select username, display_name, role, updated_at
from public.profiles
where role <> 'user'
order by role, username;
