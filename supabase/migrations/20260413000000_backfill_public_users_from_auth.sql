-- Backfill `public.users` for auth accounts that never got a row (e.g. created before triggers).
-- `public.users` requires `email` and `handle` (NOT NULL); pull email from `auth.users`.

insert into public.users (id, email, handle)
select
  au.id,
  lower(trim(au.email)),
  'user_' || substr(au.id::text, 1, 8)
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
  and au.email is not null
  and length(trim(au.email)) > 0
on conflict (id) do nothing;
