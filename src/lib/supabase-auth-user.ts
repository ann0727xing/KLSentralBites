import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "@/types";

/** Build app `User` from Supabase Auth when `state.users` has no row (common in Supabase mode). */
export function supabaseAuthToAppUser(u: SupabaseAuthUser): User {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const handleFromMeta =
    typeof meta?.handle === "string" ? meta.handle.trim() : "";
  const handle = handleFromMeta || "user";
  return {
    id: u.id,
    handle,
    avatarUrl:
      typeof meta?.avatar_url === "string" ? meta.avatar_url : null,
    bio: typeof meta?.bio === "string" ? meta.bio : "",
  };
}
