-- If comment authors lack a public.users row, the users!comments_user_id_fkey embed is empty.
-- `insert into users (id) select ...` alone fails when email/handle are NOT NULL — use auth.users:

insert into public.users (id, email, handle)
select distinct on (c.user_id)
  c.user_id,
  lower(trim(au.email)),
  lower(split_part(trim(au.email), '@', 1))
from public.comments c
inner join auth.users au on au.id = c.user_id
where not exists (select 1 from public.users u where u.id = c.user_id)
on conflict (id) do nothing;
