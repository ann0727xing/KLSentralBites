import type { SupabaseClient } from "@supabase/supabase-js";

export async function markNotificationsAsRead(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error(
      "[markNotificationsAsRead] getSession failed:",
      sessionError.message,
    );
    return false;
  }

  const userId = String(session?.user?.id ?? "").trim();
  if (!userId) {
    console.error("[markNotificationsAsRead] No logged-in user found");
    return false;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error(
      "[markNotificationsAsRead] update failed:",
      error.message,
    );
    return false;
  }

  return true;
}
