-- If posts.user_id has no public.users row, PostgREST returns users: null.
-- Raw `insert into users (id) select ...` fails when email/handle are NOT NULL.

insert into public.users (id, email, handle)
select distinct on (p.user_id)
  p.user_id,
  lower(trim(au.email)),
  lower(split_part(trim(au.email), '@', 1))
from public.posts p
inner join auth.users au on au.id = p.user_id
where not exists (select 1 from public.users u where u.id = p.user_id)
on conflict (id) do nothing;
