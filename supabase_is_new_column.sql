-- เพิ่มคอลัมน์ควบคุมป้าย "NEW" บนการ์ดตัวละคร (เปิด/ปิดเองต่อตัวละคร)
-- รันใน Supabase → SQL Editor ก่อนใช้งานฟีเจอร์นี้
alter table public.characters
  add column if not exists is_new boolean not null default false;
