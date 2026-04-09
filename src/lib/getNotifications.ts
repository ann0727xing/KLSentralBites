import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationActor = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export type SimpleNotification = {
  id: string;
  type: "follow" | "like" | string;
  created_at: string;
  post_id: string | null;
  actor: NotificationActor | null;
};

export async function getNotifications(
  supabase: SupabaseClient,
): Promise<SimpleNotification[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    console.error("[getNotifications] getUser failed:", authError.message);
    return [];
  }

  const userId = authData?.user?.id;
  if (!userId) {
    console.error("[getNotifications] No logged-in user found");
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      type,
      created_at,
      post_id,
      actor:profiles (
        id,
        username,
        avatar_url
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getNotifications] fetch failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as Array<{
    id: string;
    type: string;
    created_at: string;
    post_id?: string | null;
    actor:
      | {
          id?: string | null;
          username?: string | null;
          avatar_url?: string | null;
        }
      | Array<{
          id?: string | null;
          username?: string | null;
          avatar_url?: string | null;
        }>
      | null;
  }>;

  return rows.map((row) => {
    const actorRaw = Array.isArray(row.actor) ? row.actor[0] : row.actor;
    const actor =
      actorRaw && actorRaw.id && actorRaw.username
        ? {
            id: actorRaw.id,
            username: actorRaw.username,
            avatar_url: actorRaw.avatar_url ?? null,
          }
        : null;

    return {
      id: row.id,
      type: row.type,
      created_at: row.created_at,
      post_id: row.post_id ?? null,
      actor,
    };
  });
}
