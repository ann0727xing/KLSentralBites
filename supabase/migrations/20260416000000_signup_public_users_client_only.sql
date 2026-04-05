-- Client calls `public.users` insert after `auth.signUp()`.
-- The previous trigger on auth.users could fail (constraints, duplicates) and abort
-- the auth user creation with "Database error saving new user".

drop trigger if exists on_auth_user_created_users on auth.users;
