-- Unread state + recipient can mark notifications read

alter table public.notifications
  add column if not exists is_read boolean not null default false;

create index if not exists notifications_user_unread
  on public.notifications (user_id, is_read)
  where is_read = false;

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
