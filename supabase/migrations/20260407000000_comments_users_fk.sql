-- Comments: user_id → public.users(id) so `.select('*, users(...)')` returns handles.

alter table public.users
  add column if not exists handle text;

update public.users
set handle = coalesce(nullif(trim(handle), ''), nullif(split_part(email, '@', 1), ''))
where handle is null or trim(handle) = '';

-- Legacy schema (initial.sql): author_id → profiles, body
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'author_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'user_id'
  ) then
    alter table public.comments drop constraint if exists comments_author_id_fkey;
    alter table public.comments rename column author_id to user_id;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'body'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'comments' and column_name = 'content'
  ) then
    alter table public.comments rename column body to content;
  end if;
end $$;

alter table public.comments
  drop constraint if exists comments_user_id_fkey;

alter table public.comments
  add constraint comments_user_id_fkey
  foreign key (user_id)
  references public.users (id)
  on delete cascade;
