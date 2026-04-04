-- KLSentralBites — run in Supabase SQL Editor or via CLI
-- Requires: Auth email confirmations disabled (or confirm) for handle-based signup

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users; passwords live in Supabase Auth only)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique,
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists profiles_handle_lower on public.profiles (lower(handle));

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  hashtag text not null
);

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id),
  image_urls text[] not null default '{}',
  caption text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_id on public.posts (author_id);
create index if not exists posts_created_at on public.posts (created_at desc);

-- ---------------------------------------------------------------------------
-- Likes, saves, comments, follows
-- ---------------------------------------------------------------------------
create table if not exists public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id on public.comments (post_id);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

-- ---------------------------------------------------------------------------
-- New user → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  h text;
  dn text;
begin
  h := lower(trim(new.raw_user_meta_data ->> 'handle'));
  dn := coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), h);
  if h is null or length(h) < 1 then
    raise exception 'handle required in user metadata';
  end if;
  insert into public.profiles (id, handle, display_name)
  values (new.id, h, dn);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

-- Profiles: readable by anyone (handles are public); users update own row
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Restaurants
create policy "restaurants_select_all"
  on public.restaurants for select
  using (true);

create policy "restaurants_insert_authenticated"
  on public.restaurants for insert
  with check (auth.role() = 'authenticated');

-- Posts
create policy "posts_select_visible"
  on public.posts for select
  using (is_public = true or author_id = auth.uid());

create policy "posts_insert_own"
  on public.posts for insert
  with check (author_id = auth.uid());

create policy "posts_update_own"
  on public.posts for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "posts_delete_own"
  on public.posts for delete
  using (author_id = auth.uid());

-- Likes
create policy "likes_select_all"
  on public.likes for select
  using (true);

create policy "likes_insert_own"
  on public.likes for insert
  with check (user_id = auth.uid());

create policy "likes_delete_own"
  on public.likes for delete
  using (user_id = auth.uid());

-- Saves (read all rows for counts / feed logic; writes scoped to own user_id)
create policy "saves_select_all"
  on public.saves for select
  using (true);

create policy "saves_insert_own"
  on public.saves for insert
  with check (user_id = auth.uid());

create policy "saves_delete_own"
  on public.saves for delete
  using (user_id = auth.uid());

-- Comments (readable if post is visible)
create policy "comments_select_if_post_visible"
  on public.comments for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (p.is_public = true or p.author_id = auth.uid())
    )
  );

create policy "comments_insert_authenticated"
  on public.comments for insert
  with check (author_id = auth.uid());

-- Follows
create policy "follows_select_all"
  on public.follows for select
  using (true);

create policy "follows_insert_own"
  on public.follows for insert
  with check (follower_id = auth.uid());

create policy "follows_delete_own"
  on public.follows for delete
  using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed restaurants (KL spots)
-- ---------------------------------------------------------------------------
insert into public.restaurants (id, name, slug, hashtag)
values
  ('a0000000-0000-4000-8000-000000000001', 'KLSentralBites Café', 'klsentralbites-cafe', 'KLSentralBitesCafe'),
  ('a0000000-0000-4000-8000-000000000002', 'Bangsar Noodle Lab', 'bangsar-noodle-lab', 'BangsarNoodleLab'),
  ('a0000000-0000-4000-8000-000000000003', 'The Lunch Club', 'the-lunch-club', 'TheLunchClub'),
  ('a0000000-0000-4000-8000-000000000004', 'Petaling Rice House', 'petaling-rice-house', 'PetalingRiceHouse'),
  ('a0000000-0000-4000-8000-000000000005', 'Sentral Salad Co', 'sentral-salad-co', 'SentralSaladCo'),
  ('a0000000-0000-4000-8000-000000000006', 'Mont Kiara Bowl', 'mont-kiara-bowl', 'MontKiaraBowl')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Storage: post images (public read; users write under own folder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "post_images_public_read"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "post_images_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "post_images_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images' and split_part(name, '/', 1) = auth.uid()::text);

create policy "post_images_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and split_part(name, '/', 1) = auth.uid()::text);
