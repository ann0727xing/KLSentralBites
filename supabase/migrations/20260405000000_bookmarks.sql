-- Bookmarks (saved posts), keyed to public.users — mirrors app `saves` client state.

create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists bookmarks_post_id on public.bookmarks (post_id);
create index if not exists bookmarks_user_id on public.bookmarks (user_id);

alter table public.bookmarks enable row level security;

create policy "bookmarks_select_all"
  on public.bookmarks for select
  using (true);

create policy "bookmarks_insert_own"
  on public.bookmarks for insert
  with check (user_id = auth.uid());

create policy "bookmarks_delete_own"
  on public.bookmarks for delete
  using (user_id = auth.uid());
