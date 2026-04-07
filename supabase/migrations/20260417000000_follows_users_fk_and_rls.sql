-- Follows: FKs must reference public.users (app uses users, not legacy profiles).
-- RLS: only the authenticated user may insert their own follower row.

alter table public.follows
  drop constraint if exists follows_follower_id_fkey;

alter table public.follows
  drop constraint if exists follows_following_id_fkey;

alter table public.follows
  add constraint follows_follower_id_fkey
  foreign key (follower_id)
  references public.users (id)
  on delete cascade;

alter table public.follows
  add constraint follows_following_id_fkey
  foreign key (following_id)
  references public.users (id)
  on delete cascade;

alter table public.follows enable row level security;

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
  on public.follows for select
  using (true);

drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "Users can follow" on public.follows;
create policy "Users can follow"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);
