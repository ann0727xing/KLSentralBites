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
  /** Post cover image for like notifications (from joined `posts`). */
  post_image_url: string | null;
  actor: NotificationActor | null;
};

export async function getNotifications(
  supabase: SupabaseClient,
): Promise<SimpleNotification[]> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("[getNotifications] getSession failed:", sessionError.message);
    return [];
  }

  const userId = session?.user?.id;
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
      post:posts!notifications_post_id_fkey ( image_url ),
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
    post?:
      | { image_url?: string | null }
      | Array<{ image_url?: string | null }>
      | null;
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

    const postRaw = Array.isArray(row.post) ? row.post[0] : row.post;
    const postImageUrl =
      typeof postRaw?.image_url === "string" && postRaw.image_url.length > 0
        ? postRaw.image_url
        : null;

    return {
      id: row.id,
      type: row.type,
      created_at: row.created_at,
      post_id: row.post_id ?? null,
      post_image_url: postImageUrl,
      actor,
    };
  });
}
