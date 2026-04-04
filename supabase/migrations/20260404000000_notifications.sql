-- In-app notifications (likes, follows, comments)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid not null references public.users (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  type text not null check (type in ('like', 'follow', 'comment')),
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_insert_as_actor" on public.notifications;
create policy "notifications_insert_as_actor"
  on public.notifications for insert
  with check (actor_id = auth.uid());
