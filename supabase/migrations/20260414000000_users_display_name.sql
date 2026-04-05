-- Public username shown as @display_name (aligned with auth user_metadata.display_name).

alter table public.users add column if not exists display_name text;

-- Sync from Supabase Auth metadata
update public.users u
set display_name = a.raw_user_meta_data->>'display_name'
from auth.users a
where u.id = a.id;

-- Clear empty strings
update public.users
set display_name = null
where display_name is not null and trim(display_name) = '';

-- Prefer existing handle when auth has no display_name
update public.users
set display_name = handle
where display_name is null;

-- Fallback for any remaining nulls
update public.users
set display_name = 'user_' || substr(id::text, 1, 5)
where display_name is null;

-- New signups: keep handle + set display_name from metadata or handle
create or replace function public.handle_new_user_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  em text;
  h text;
  meta text;
  dn text;
begin
  em := new.email;
  if em is null or length(trim(em)) = 0 then
    return new;
  end if;
  em := lower(trim(em));
  meta := lower(trim(new.raw_user_meta_data->>'handle'));
  if meta is not null and length(meta) >= 3 and meta ~ '^[a-z0-9]{3,15}$' then
    h := meta;
  else
    h := lower(split_part(em, '@', 1));
    if length(h) = 0 then
      h := em;
    end if;
  end if;
  dn := nullif(trim(new.raw_user_meta_data->>'display_name'), '');
  if dn is null or length(dn) = 0 then
    dn := h;
  end if;
  insert into public.users (id, email, handle, display_name)
  values (new.id, em, h, dn)
  on conflict (id) do update
    set email = excluded.email,
        handle = excluded.handle,
        display_name = excluded.display_name;
  return new;
end;
$$;
