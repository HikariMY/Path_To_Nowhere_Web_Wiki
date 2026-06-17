-- ============================================================
-- PTN Wiki TH - Supabase Schema
-- คัดลอกทั้งหมดไปรันใน Supabase SQL Editor
-- ============================================================

-- EXTENSIONS
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (auto-created on signup)
-- ============================================================
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  username      text unique not null,
  avatar_url    text,
  role          text not null default 'user'
                  check (role in ('user', 'moderator', 'admin')),
  bio           text,
  post_count    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CHARACTERS
-- ============================================================
create table public.characters (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  slug          text not null unique,
  rarity        text not null check (rarity in ('S', 'A', 'B', 'C')),
  faction       text not null,
  job_class     text not null,
  portrait_url  text,
  splash_url    text,
  overview      text,
  stats         jsonb,
  skills        jsonb,
  shackles      jsonb,
  tags          text[],
  is_limited    boolean not null default false,
  is_new        boolean not null default false,
  release_date  date,
  release_order integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "Characters are viewable by everyone"
  on public.characters for select using (true);

create policy "Only admins can insert characters"
  on public.characters for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Only admins can update characters"
  on public.characters for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Only admins can delete characters"
  on public.characters for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- EVENTS
-- ============================================================
create table public.events (
  id             uuid primary key default uuid_generate_v4(),
  title          text not null,
  description    text,
  event_type     text not null check (event_type in (
                   'gacha_new', 'gacha_new_limited', 'gacha_rerun', 'gacha_rerun_limited',
                   'event_new', 'event_rerun', 'event_collab',
                   'story_new', 'story_eternal',
                   'maintenance', 'other',
                   'story', 'rerun', 'collab'
                 )),
  banner_url     text,
  start_date     timestamptz not null,
  end_date       timestamptz not null,
  is_active      boolean not null default true,
  is_featured    boolean not null default false,
  image_position             text not null default '50% 50%',
  featured_character_images  jsonb default null,
  created_at                 timestamptz not null default now()
);
-- Migration (run if table already exists):
-- ALTER TABLE public.events ADD COLUMN featured_character_images jsonb DEFAULT NULL;

alter table public.events enable row level security;

create policy "Events are viewable by everyone"
  on public.events for select using (true);

create policy "Admins can insert events"
  on public.events for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Admins can update events"
  on public.events for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Admins can delete events"
  on public.events for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

-- ============================================================
-- FORUM CATEGORIES
-- ============================================================
create table public.forum_categories (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  slug          text not null unique,
  description   text,
  icon          text,
  color         text,
  sort_order    integer not null default 0,
  post_count    integer not null default 0,
  is_locked     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.forum_categories enable row level security;

create policy "Categories are viewable by everyone"
  on public.forum_categories for select using (true);

create policy "Only admins can insert categories"
  on public.forum_categories for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Only admins can update categories"
  on public.forum_categories for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Only admins can delete categories"
  on public.forum_categories for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- FORUM POSTS
-- ============================================================
create table public.forum_posts (
  id            uuid primary key default uuid_generate_v4(),
  category_id   uuid not null references public.forum_categories(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  content       text not null,
  is_pinned     boolean not null default false,
  is_locked     boolean not null default false,
  is_deleted    boolean not null default false,
  views         integer not null default 0,
  reply_count   integer not null default 0,
  last_reply_at timestamptz,
  last_reply_by uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

create policy "Posts are viewable by everyone"
  on public.forum_posts for select using (not is_deleted);

create policy "Authenticated users can create posts"
  on public.forum_posts for insert
  with check (auth.uid() is not null);

create policy "Authors can update own posts"
  on public.forum_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Admins and mods can update any post"
  on public.forum_posts for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Authors and admins can delete posts"
  on public.forum_posts for delete
  using (auth.uid() = author_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

-- Increment post views function (security definer)
create or replace function public.increment_post_views(post_id uuid)
returns void language sql security definer as $$
  update public.forum_posts set views = views + 1 where id = post_id;
$$;

-- ============================================================
-- FORUM REPLIES
-- ============================================================
create table public.forum_replies (
  id            uuid primary key default uuid_generate_v4(),
  post_id       uuid not null references public.forum_posts(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  is_deleted    boolean not null default false,
  parent_id     uuid references public.forum_replies(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.forum_replies enable row level security;

create policy "Replies are viewable by everyone"
  on public.forum_replies for select using (not is_deleted);

create policy "Authenticated users can reply"
  on public.forum_replies for insert
  with check (auth.uid() is not null);

create policy "Authors can update own replies"
  on public.forum_replies for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Admins and mods can update any reply"
  on public.forum_replies for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Authors and admins can delete replies"
  on public.forum_replies for delete
  using (auth.uid() = author_id or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

-- ============================================================
-- TIER LISTS
-- ============================================================
create table public.tier_lists (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  is_official   boolean not null default false,
  is_public     boolean not null default true,
  patch_version text,
  tiers         jsonb not null default '[]',
  upvotes       integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.tier_lists enable row level security;

create policy "Public tier lists viewable by everyone"
  on public.tier_lists for select using (is_public = true);

create policy "Authors can view own private tier lists"
  on public.tier_lists for select using (auth.uid() = author_id);

create policy "Authenticated users can create tier lists"
  on public.tier_lists for insert
  with check (auth.uid() is not null);

create policy "Authors can update own tier lists"
  on public.tier_lists for update
  using (auth.uid() = author_id and is_official = false)
  with check (auth.uid() = author_id and is_official = false);

create policy "Admins can update any tier list"
  on public.tier_lists for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Authors and admins can delete tier lists"
  on public.tier_lists for delete
  using (auth.uid() = author_id or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- TIER LIST VOTES
-- ============================================================
create table public.tier_list_votes (
  id            uuid primary key default uuid_generate_v4(),
  tier_list_id  uuid not null references public.tier_lists(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (tier_list_id, user_id)
);

alter table public.tier_list_votes enable row level security;

create policy "Anyone can view votes"
  on public.tier_list_votes for select using (true);

create policy "Authenticated users can vote"
  on public.tier_list_votes for insert
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can remove own vote"
  on public.tier_list_votes for delete
  using (auth.uid() = user_id);

-- Auto-update upvotes count
create or replace function public.update_tier_list_upvotes()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.tier_lists set upvotes = upvotes + 1 where id = NEW.tier_list_id;
  elsif TG_OP = 'DELETE' then
    update public.tier_lists set upvotes = upvotes - 1 where id = OLD.tier_list_id;
  end if;
  return null;
end;
$$;

create trigger on_vote_change
  after insert or delete on public.tier_list_votes
  for each row execute procedure public.update_tier_list_upvotes();

-- ============================================================
-- ADMIN LOGS
-- ============================================================
create table public.admin_logs (
  id            uuid primary key default uuid_generate_v4(),
  admin_id      uuid not null references public.profiles(id),
  action        text not null,
  target_table  text,
  target_id     uuid,
  meta          jsonb,
  created_at    timestamptz not null default now()
);

alter table public.admin_logs enable row level security;

create policy "Only admins can view logs"
  on public.admin_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Only admins can insert logs"
  on public.admin_logs for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table public.announcements (
  id          uuid primary key default uuid_generate_v4(),
  content     text not null,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "Announcements are viewable by everyone"
  on public.announcements for select using (true);

create policy "Admins can insert announcements"
  on public.announcements for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Admins can update announcements"
  on public.announcements for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

create policy "Admins can delete announcements"
  on public.announcements for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'moderator')));

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_forum_posts_category on public.forum_posts(category_id);
create index idx_forum_posts_author   on public.forum_posts(author_id);
create index idx_forum_posts_date     on public.forum_posts(is_pinned desc, created_at desc);
create index idx_forum_replies_post   on public.forum_replies(post_id);
create index idx_tier_lists_official  on public.tier_lists(is_official, upvotes desc);
create index idx_characters_rarity    on public.characters(rarity);
create index idx_characters_slug      on public.characters(slug);
create index idx_events_active        on public.events(is_active, end_date);

-- ============================================================
-- SEED DATA - Forum Categories
-- ============================================================
insert into public.forum_categories (name, slug, description, icon, color, sort_order) values
  ('ทั่วไป',          'general',    'พูดคุยทั่วไปเกี่ยวกับ Path to Nowhere',             'MessageSquare', '#60A5FA', 1),
  ('กลยุทธ์และแนะนำ', 'strategy',   'แชร์เทคนิคการเล่น บิลด์ตัวละคร และแนะนำด่านต่างๆ', 'Swords',        '#C8102E', 2),
  ('ตัวละคร',         'characters', 'พูดคุยเกี่ยวกับตัวละครแต่ละตัว ทักษะ และการใช้งาน', 'Users',         '#C084FC', 3),
  ('อีเวนต์',         'events',     'ข้อมูลและแนะนำอีเวนต์ปัจจุบันและที่กำลังจะมา',      'Calendar',      '#F59E0B', 4),
  ('สื่อและผลงาน',    'media',      'แชร์ภาพ วิดีโอ และผลงานแฟนอาร์ต',                   'Image',         '#10B981', 5),
  ('รายงานบัก',       'bug',        'แจ้งปัญหาและข้อบกพร่อง',                             'Bug',           '#9898B0', 6);

-- ============================================================
-- STORAGE BUCKETS (สร้างใน Supabase Dashboard > Storage)
-- ============================================================
-- สร้าง bucket ชื่อ: avatars, characters, events  (public = true)

-- ============================================================
-- ตั้งค่า Admin คนแรก:
-- 1. สมัครสมาชิกบนเว็บก่อน
-- 2. รันคำสั่งนี้ใน SQL Editor (แทนที่ 'your_username'):
--    UPDATE public.profiles SET role = 'admin' WHERE username = 'your_username';
-- ============================================================
