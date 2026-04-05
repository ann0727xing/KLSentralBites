-- Likes: align with public.users (app auth), enforce uniqueness, RLS for toggle like/unlike
-- Run after public.users exists (20260402000000_users_table.sql).

-- ---------------------------------------------------------------------------
-- 1) Foreign key: user_id → public.users(id)
--    (Replaces references to profiles if present — same UUID as auth.users.)
-- ---------------------------------------------------------------------------
alter table public.likes
  drop constraint if exists likes_user_id_fkey;

alter table public.likes
  add constraint likes_user_id_fkey
  foreign key (user_id)
  references public.users (id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Uniqueness: one like per user per post (duplicate inserts fail cleanly)
--    Skip if primary key already exists from initial migration.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where t.relname = 'likes'
      and c.contype = 'p'
  ) then
    alter table public.likes add primary key (user_id, post_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3) RLS — authenticated users insert/delete only their own rows
-- ---------------------------------------------------------------------------
alter table public.likes enable row level security;

drop policy if exists "likes_select_all" on public.likes;
create policy "likes_select_all"
  on public.likes for select
  using (true);

drop policy if exists "likes_insert_own" on public.likes;
drop policy if exists "likes_insert_authenticated_own" on public.likes;
create policy "likes_insert_authenticated_own"
  on public.likes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "likes_delete_own" on public.likes;
drop policy if exists "likes_delete_authenticated_own" on public.likes;
create policy "likes_delete_authenticated_own"
  on public.likes for delete
  to authenticated
  using (user_id = auth.uid());
