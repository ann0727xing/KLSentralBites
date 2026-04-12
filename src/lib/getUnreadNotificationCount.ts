import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
): Promise<number> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error(
      "[getUnreadNotificationCount] getSession failed:",
      sessionError.message,
    );
    return 0;
  }

  const userId = String(session?.user?.id ?? "").trim();
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error(
      "[getUnreadNotificationCount] count query failed:",
      error.message,
    );
    return 0;
  }

  return count ?? 0;
}
