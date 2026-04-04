-- App-facing `public.users` row per auth user (id, email, handle = local part of email).

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  handle text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_all" on public.users;
create policy "users_select_all"
  on public.users for select
  using (true);

drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Idempotent: same semantics as client (only insert if not exists).
create or replace function public.handle_new_user_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
  h text;
begin
  em := new.email;
  if em is null or length(trim(em)) = 0 then
    return new;
  end if;
  em := lower(trim(em));
  h := lower(split_part(em, '@', 1));
  if length(h) = 0 then
    h := em;
  end if;
  insert into public.users (id, email, handle)
  values (new.id, em, h)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_users on auth.users;
create trigger on_auth_user_created_users
  after insert on auth.users
  for each row execute function public.handle_new_user_users();
