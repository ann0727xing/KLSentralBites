import type { SupabaseClient } from "@supabase/supabase-js";

export async function markNotificationsAsRead(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error(
      "[markNotificationsAsRead] getUser failed:",
      authError.message,
    );
    return false;
  }

  const userId = String(authData?.user?.id ?? "").trim();
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
