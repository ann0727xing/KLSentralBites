import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "@/types";

/**
 * Fields from Supabase Auth only (not `users.handle` — load handle via `users` table).
 * Avatar / bio may still live in user_metadata until the schema stores them on `users`.
 */
export function supabaseAuthToAppUser(
  u: SupabaseAuthUser,
): Omit<User, "handle"> {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  return {
    id: u.id,
    avatarUrl:
      typeof meta?.avatar_url === "string" ? meta.avatar_url : null,
    bio: typeof meta?.bio === "string" ? meta.bio : "",
  };
}
