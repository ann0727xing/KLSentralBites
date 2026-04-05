-- Client inserts into `public.users` after `auth.signUp()`.
-- Triggers on auth.users that insert into public.users can fail and abort signup with
-- "Database error saving new user".

drop trigger if exists on_auth_user_created_users on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
