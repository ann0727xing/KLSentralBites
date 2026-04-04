-- Ensure `post-images` exists and is public (safe to re-run).
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set
  public = excluded.public,
  name = excluded.name;
