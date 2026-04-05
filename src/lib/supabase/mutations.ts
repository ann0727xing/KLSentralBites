import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Post,
  Restaurant,
  RestaurantId,
  UserId,
  PostId,
} from "@/types";

export async function remoteInsertRestaurant(
  supabase: SupabaseClient,
  r: Restaurant,
): Promise<{ error?: string }> {
  if (!r.id || !r.name?.trim()) {
    return { error: "Invalid restaurant" };
  }
  /** DB schema: restaurants(id, name, created_at) — only send columns that exist. */
  const { error } = await supabase.from("restaurants").upsert(
    {
      id: r.id,
      name: r.name.trim(),
    },
    { onConflict: "id" },
  );
  return { error: error?.message };
}

/** Insert into `public.users` if missing (`id`, `email`, handle = local part of email). */
export async function remoteEnsureUserRow(
  supabase: SupabaseClient,
  args: { id: string; email?: string | null },
): Promise<{ error?: string }> {
  const email = String(args.email ?? "").trim();
  if (!args.id || !email) return {};
  const lower = email.toLowerCase();
  const at = lower.indexOf("@");
  const handle = at > 0 ? lower.slice(0, at) : lower;
  const { error } = await supabase.from("users").upsert(
    { id: args.id, email: lower, handle },
    { onConflict: "id", ignoreDuplicates: true },
  );
  return { error: error?.message };
}

export async function remoteInsertPost(
  supabase: SupabaseClient,
  post: Post,
): Promise<{ error?: string }> {
  if (!post.authorId || String(post.authorId).trim() === "") {
    return { error: "Missing user id" };
  }
  const row: Record<string, unknown> = {
    user_id: post.authorId,
    image_url: post.imageUrls[0] ?? null,
    caption: post.caption ?? null,
    created_at: post.createdAt,
  };
  if (post.restaurantId && String(post.restaurantId).trim() !== "") {
    row.restaurant_id = post.restaurantId;
  }
  const { error } = await supabase.from("posts").insert(row);
  return { error: error?.message };
}

export async function remoteUpdatePost(
  supabase: SupabaseClient,
  args: {
    postId: PostId;
    caption?: string;
    restaurantId: RestaurantId;
  },
): Promise<{ error?: string }> {
  if (!args.postId || String(args.postId).trim() === "") {
    return { error: "Missing post id" };
  }
  const { error } = await supabase
    .from("posts")
    .update({
      caption: args.caption ?? null,
    })
    .eq("id", args.postId);
  return { error: error?.message };
}

export async function remoteDeletePost(
  supabase: SupabaseClient,
  postId: PostId,
): Promise<{ error?: string }> {
  if (!postId || String(postId).trim() === "") {
    return { error: "Missing post id" };
  }
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return { error: error?.message };
}

export async function remoteToggleLike(
  supabase: SupabaseClient,
  userId: UserId,
  postId: PostId,
  liked: boolean,
): Promise<{ error?: string }> {
  if (liked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) {
      console.error("[remoteToggleLike] delete:", error.message, error);
      return { error: error.message };
    }
    return {};
  }
  const { error } = await supabase.from("likes").insert({
    post_id: postId,
    user_id: userId,
  });
  if (error) {
    // Unique (user_id, post_id) — treat duplicate as success (idempotent like)
    if (error.code === "23505") {
      console.warn("[remoteToggleLike] duplicate like skipped:", postId);
      return {};
    }
    console.error("[remoteToggleLike] insert:", error.message, error);
    return { error: error.message };
  }

  const { data: postRow } = await supabase
    .from("posts")
    .select("user_id, author_id")
    .eq("id", postId)
    .maybeSingle();

  const ownerRaw = postRow
    ? (postRow as { user_id?: string; author_id?: string }).user_id ??
      (postRow as { user_id?: string; author_id?: string }).author_id
    : undefined;
  const ownerId =
    typeof ownerRaw === "string" && ownerRaw.length > 0 ? ownerRaw : null;

  if (ownerId && ownerId !== userId) {
    const { error: nErr } = await supabase.from("notifications").insert({
      user_id: ownerId,
      actor_id: userId,
      type: "like",
      post_id: postId,
    });
    if (nErr) {
      console.warn("[remoteToggleLike] notification insert:", nErr.message);
    }
  }

  return {};
}

/** Mark every notification as read for the current user (in-app inbox). */
export async function remoteMarkAllNotificationsRead(
  supabase: SupabaseClient,
  userId: UserId,
): Promise<{ error?: string }> {
  const uid = String(userId ?? "").trim();
  if (!uid) return {};
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", uid)
    .eq("is_read", false);
  return { error: error?.message };
}

export async function remoteToggleSave(
  supabase: SupabaseClient,
  userId: UserId,
  postId: PostId,
  saved: boolean,
): Promise<{ error?: string }> {
  if (saved) {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    return { error: error?.message };
  }
  const { error } = await supabase.from("bookmarks").insert({
    post_id: postId,
    user_id: userId,
  });
  return { error: error?.message };
}

export async function remoteAddComment(
  supabase: SupabaseClient,
  args: {
    postId: PostId;
    authorId: UserId;
    body: string;
  },
): Promise<{
  data?: { id: string; created_at: string };
  error?: string;
}> {
  const text = args.body.trim();
  if (!text) return { error: "Empty comment" };
  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: args.authorId,
      post_id: args.postId,
      content: text,
    })
    .select("id, created_at")
    .single();
  if (error) {
    return { error: error.message };
  }

  const { data: postRow } = await supabase
    .from("posts")
    .select("user_id, author_id")
    .eq("id", args.postId)
    .maybeSingle();
  const ownerRaw = postRow
    ? (postRow as { user_id?: string; author_id?: string }).user_id ??
      (postRow as { user_id?: string; author_id?: string }).author_id
    : undefined;
  const ownerId =
    typeof ownerRaw === "string" && ownerRaw.length > 0 ? ownerRaw : null;
  if (ownerId && ownerId !== args.authorId) {
    const { error: nErr } = await supabase.from("notifications").insert({
      user_id: ownerId,
      actor_id: args.authorId,
      type: "comment",
      post_id: args.postId,
    });
    if (nErr) {
      console.warn("[remoteAddComment] notification insert:", nErr.message);
    }
  }

  return {
    data: data ?? undefined,
  };
}

export async function remoteDeleteComment(
  supabase: SupabaseClient,
  commentId: string,
  userId: UserId,
): Promise<{ error?: string }> {
  const id = String(commentId ?? "").trim();
  if (!id) return { error: "Missing comment id" };
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return { error: error?.message };
}

export async function remoteToggleFollow(
  supabase: SupabaseClient,
  followerId: UserId,
  followingId: UserId,
  currentlyFollowing: boolean,
): Promise<{ error?: string }> {
  if (currentlyFollowing) {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return { error: error?.message };
  }
  const { error } = await supabase.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
  if (error) return { error: error.message };

  if (followingId !== followerId) {
    const { error: nErr } = await supabase.from("notifications").insert({
      user_id: followingId,
      actor_id: followerId,
      type: "follow",
    });
    if (nErr) {
      console.warn("[remoteToggleFollow] notification insert:", nErr.message);
    }
  }

  return {};
}

export async function remoteUpdateProfile(
  supabase: SupabaseClient,
  _userId: UserId,
  args: {
    displayName?: string;
    handle?: string;
    avatarUrl?: string | null;
    bio?: string;
  },
): Promise<{ error?: string }> {
  /** `profiles` table not deployed — persist profile fields on auth user_metadata only. */
  const dataPatch: Record<string, unknown> = {};
  if (args.handle !== undefined) dataPatch.handle = args.handle;
  if (args.displayName !== undefined) dataPatch.display_name = args.displayName;
  if (args.avatarUrl !== undefined) dataPatch.avatar_url = args.avatarUrl;
  if (args.bio !== undefined) dataPatch.bio = args.bio;
  if (Object.keys(dataPatch).length === 0) return {};

  const { error: authErr } = await supabase.auth.updateUser({
    data: dataPatch,
  });
  if (authErr) return { error: authErr.message };
  return {};
}

export async function remoteSetNotificationsEnabled(
  supabase: SupabaseClient,
  _userId: UserId,
  enabled: boolean,
): Promise<{ error?: string }> {
  /** `profiles` table not deployed — store on auth metadata. */
  const { error } = await supabase.auth.updateUser({
    data: { notifications_enabled: enabled },
  });
  return { error: error?.message };
}
