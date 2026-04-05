-- Passwords belong in auth.users only, never in public.users.
alter table public.users drop column if exists password;

-- New signups send handle in raw_user_meta_data (see supabase.auth.signUp options.data).
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
  insert into public.users (id, email, handle)
  values (new.id, em, h)
  on conflict (id) do update
    set email = excluded.email,
        handle = excluded.handle;
  return new;
end;
$$;
