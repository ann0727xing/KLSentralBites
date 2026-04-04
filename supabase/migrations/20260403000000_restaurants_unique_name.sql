-- Deduplicate restaurants by name, then enforce unique name.
-- Reassign posts so FKs stay valid before deleting duplicate rows.

-- 1) Point posts at the canonical restaurant (lowest id per name)
update public.posts as p
set restaurant_id = k.canon_id
from (
  select
    r.id as rid,
    (
      select min(r2.id)
      from public.restaurants r2
      where r2.name = r.name
    ) as canon_id
  from public.restaurants r
) as k
where p.restaurant_id = k.rid
  and k.rid is distinct from k.canon_id;

-- 2) Remove duplicate restaurant rows (keep one row per name: min(id))
delete from public.restaurants as a
using public.restaurants as b
where a.id > b.id
  and a.name = b.name;

-- 3) Unique name (idempotent if re-run after manual fix)
alter table public.restaurants
  drop constraint if exists unique_restaurant_name;

alter table public.restaurants
  add constraint unique_restaurant_name unique (name);
