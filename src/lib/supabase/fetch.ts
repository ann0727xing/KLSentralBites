import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Comment,
  Follow,
  Like,
  Post,
  PostId,
  Restaurant,
  Save,
  User,
} from "@/types";

export type RemoteSnapshot = {
  users: User[];
  restaurants: Restaurant[];
  posts: Post[];
  comments: Comment[];
  likes: Like[];
  saves: Save[];
  follows: Follow[];
  notificationsEnabled: boolean;
};

/**
 * PostgREST may return a nested row as object or single-element array.
 * Requires FK: posts.user_id → users.id
 */
function pickJoinedRow<T extends Record<string, unknown>>(
  raw: unknown,
): T | undefined {
  if (raw == null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === "object"
      ? (first as T)
      : undefined;
  }
  if (typeof raw === "object") return raw as T;
  return undefined;
}

function mapCommentRow(
  row: Record<string, unknown>,
  postId: PostId,
): Comment {
  const usersJoin = pickJoinedRow<{
    id?: string;
    handle?: string;
  }>(row.users);
  const handleStr =
    typeof usersJoin?.handle === "string" && usersJoin.handle.length > 0
      ? usersJoin.handle
      : undefined;
  const uid =
    usersJoin?.id != null ? String(usersJoin.id) : undefined;
  return {
    id: String(row.id ?? ""),
    postId,
    authorId: String(row.user_id ?? ""),
    body: typeof row.content === "string" ? row.content : "",
    createdAt:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date().toISOString(),
    authorHandle: handleStr,
    users:
      usersJoin != null && (uid != null || handleStr != null)
        ? { id: uid, handle: handleStr }
        : undefined,
  };
}

/**
 * Loads comments for a post with `users (handle)`.
 * Use `latestOnly: true` + `limit` for the N most recent (feed cards).
 */
export async function fetchCommentsForPost(
  supabase: SupabaseClient,
  postId: string,
  opts?: { limit?: number; latestOnly?: boolean },
): Promise<{ comments: Comment[]; error?: string }> {
  const pid = String(postId ?? "").trim();
  if (!pid) return { comments: [] };

  const COMMENT_SELECT = `
    id,
    content,
    created_at,
    user_id,
    users!comments_user_id_fkey (
      id,
      handle
    )
  `;

  let q = supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("post_id", pid);

  if (opts?.latestOnly && opts?.limit != null) {
    q = q.order("created_at", { ascending: false }).limit(opts.limit);
  } else {
    q = q.order("created_at", { ascending: true });
    if (opts?.limit != null) q = q.limit(opts.limit);
  }

  const { data: comments, error } = await q;
  if (error) return { comments: [], error: error.message };

  let rows = (comments ?? []) as Record<string, unknown>[];
  if (opts?.latestOnly && opts?.limit != null) {
    rows = rows.slice().reverse();
  }

  return {
    comments: rows.map((r) => mapCommentRow(r, pid)),
  };
}

/**
 * Maps posts rows + `users` / `restaurants` embeds (requires FKs in Supabase).
 */
export function mapSupabasePostRow(row: Record<string, unknown>): Post {
  const id = String(row.id ?? "");
  const authorId = String(row.user_id ?? row.author_id ?? "");
  const usersJoin = pickJoinedRow<{
    id?: string;
    handle?: string;
  }>(row.users);
  const authorHandle =
    typeof usersJoin?.handle === "string" && usersJoin.handle.length > 0
      ? String(usersJoin.handle)
      : undefined;
  const uid =
    usersJoin?.id != null ? String(usersJoin.id) : undefined;
  const users =
    usersJoin != null && (uid != null || authorHandle != null)
      ? { id: uid, handle: authorHandle }
      : undefined;
  const restaurantsJoin = pickJoinedRow<Record<string, unknown>>(
    row.restaurants,
  );
  const restaurants =
    restaurantsJoin != null
      ? {
          name:
            typeof restaurantsJoin.name === "string"
              ? restaurantsJoin.name
              : undefined,
        }
      : undefined;
  const restaurantId =
    typeof row.restaurant_id === "string"
      ? row.restaurant_id
      : row.restaurant_id != null
        ? String(row.restaurant_id)
        : "";
  let imageUrls: string[] = [];
  if (Array.isArray(row.image_urls)) {
    imageUrls = (row.image_urls as unknown[]).filter(
      (u): u is string => typeof u === "string" && u.length > 0,
    );
  } else if (typeof row.image_url === "string" && row.image_url) {
    imageUrls = [row.image_url];
  }
  const caption =
    typeof row.caption === "string" ? row.caption : null;
  const isPublic = Boolean(row.is_public ?? true);
  const createdAt =
    typeof row.created_at === "string"
      ? row.created_at
      : new Date().toISOString();

  let bookmarks: { user_id: string }[] | undefined;
  const bmRaw = row.bookmarks;
  if (Array.isArray(bmRaw)) {
    const bmList: { user_id: string }[] = [];
    for (const item of bmRaw) {
      if (item && typeof item === "object") {
        const uid = (item as { user_id?: unknown }).user_id;
        if (typeof uid === "string" && uid.length > 0) {
          bmList.push({ user_id: uid });
        }
      }
    }
    bookmarks = bmList.length > 0 ? bmList : undefined;
  }

  return {
    id,
    authorId,
    authorHandle,
    users,
    restaurantId,
    restaurants,
    imageUrls,
    caption: caption ?? undefined,
    isPublic,
    createdAt,
    bookmarks,
  };
}

/**
 * Flatten `likes (user_id)` embeds from post rows into `Like[]`.
 * Requires FK: likes.post_id → posts.id
 */
export function extractLikesFromPostsRows(
  rows: Array<Record<string, unknown>>,
): Like[] {
  const likes: Like[] = [];
  for (const raw of rows) {
    const postId = String(raw.id ?? "");
    if (!postId) continue;
    const lr = raw.likes;
    const arr = Array.isArray(lr) ? lr : [];
    for (const item of arr) {
      if (item && typeof item === "object") {
        const uid = (item as { user_id?: unknown }).user_id;
        if (typeof uid === "string" && uid.length > 0) {
          likes.push({ userId: uid, postId });
        }
      }
    }
  }
  return likes;
}

/**
 * Flatten `bookmarks (user_id)` embeds from post rows into `Save[]`.
 * Requires FK: bookmarks.post_id → posts.id
 */
export function extractBookmarksFromPostsRows(
  rows: Array<Record<string, unknown>>,
): Save[] {
  const saves: Save[] = [];
  for (const raw of rows) {
    const postId = String(raw.id ?? "");
    if (!postId) continue;
    const br = raw.bookmarks;
    const arr = Array.isArray(br) ? br : [];
    for (const item of arr) {
      if (item && typeof item === "object") {
        const uid = (item as { user_id?: unknown }).user_id;
        if (typeof uid === "string" && uid.length > 0) {
          saves.push({ userId: uid, postId });
        }
      }
    }
  }
  return saves;
}

/**
 * Requires FKs: posts_user_id_fkey → users.id, posts.restaurant_id → restaurants.id
 * Core author embed (never use `*` on posts): id, image_url, caption, user_id + users FK.
 */
export const POSTS_SELECT = `
  id,
  image_url,
  caption,
  created_at,
  user_id,
  restaurant_id,
  users!posts_user_id_fkey (
    id,
    handle
  ),
  restaurants (
    name
  ),
  likes (
    user_id
  ),
  bookmarks (
    user_id
  )
` as const;

/** `bookmarks` rows with nested `posts` for the Saved collection page. */
export const BOOKMARKS_LIST_SELECT = `
  post_id,
  posts (
${POSTS_SELECT}
  )
` as const;

/** Posts for another user’s profile (`/profile/[handle]`). Same embeds as feed posts. */
export const PROFILE_POSTS_SELECT = `
  id,
  image_url,
  caption,
  created_at,
  user_id,
  restaurant_id,
  users!posts_user_id_fkey (
    id,
    handle
  ),
  restaurants (
    name
  ),
  likes (
    user_id
  ),
  bookmarks (
    user_id
  )
` as const;

export async function fetchRemoteSnapshot(
  supabase: SupabaseClient,
  currentUserId: string | null,
): Promise<{ snapshot: RemoteSnapshot; error?: string }> {
  console.log("[fetchRemoteSnapshot] currentUserId:", currentUserId);

  let followsData: Array<{
    follower_id: string;
    following_id: string;
  }> = [];

  if (currentUserId) {
    const { data, error: followsError } = await supabase
      .from("follows")
      .select("follower_id, following_id")
      .eq("follower_id", currentUserId);

    if (followsError) {
      console.error(
        "[fetchRemoteSnapshot] follows query error:",
        followsError.message,
        followsError,
      );
      followsData = [];
    } else {
      followsData = data ?? [];
    }
  }

  console.log("followsData", followsData);

  const followingIds: string[] = [];
  for (const row of followsData) {
    if (
      typeof row.following_id === "string" &&
      row.following_id.length > 0 &&
      !followingIds.includes(row.following_id)
    ) {
      followingIds.push(row.following_id);
    }
  }

  console.log("followingIds", followingIds);

  const targetIds =
    currentUserId != null && String(currentUserId).trim().length > 0
      ? [...new Set([currentUserId, ...followingIds])]
      : [];

  console.log("targetIds", targetIds);

  const follows: Follow[] = followsData.map((r) => ({
    followerId: r.follower_id as string,
    followingId: r.following_id as string,
  }));

  if (!targetIds.length) {
    const posts: Post[] = [];
    console.log("posts", posts);
    return {
      snapshot: {
        users: [],
        restaurants: [],
        posts,
        comments: [],
        likes: [],
        saves: [],
        follows,
        notificationsEnabled: true,
      },
    };
  }

  const { data: postsRaw, error: postsError } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .in("user_id", targetIds)
    .order("created_at", { ascending: false });

  console.log(postsRaw);

  if (postsError) {
    console.error(
      "[fetchRemoteSnapshot] posts query error:",
      postsError.message,
      postsError,
    );
    return { snapshot: emptySnapshot(), error: postsError.message };
  }

  const rawRows = (postsRaw ?? []) as Array<Record<string, unknown>>;
  const posts = rawRows.map((r) => mapSupabasePostRow(r));
  const likes = extractLikesFromPostsRows(rawRows);
  const saves = extractBookmarksFromPostsRows(rawRows);

  console.log("posts", posts);

  return {
    snapshot: {
      users: [],
      restaurants: [],
      posts,
      comments: [],
      likes,
      saves,
      follows,
      notificationsEnabled: true,
    },
  };
}

export const EMPTY_REMOTE_SNAPSHOT: RemoteSnapshot = {
  users: [],
  restaurants: [],
  posts: [],
  comments: [],
  likes: [],
  saves: [],
  follows: [],
  notificationsEnabled: true,
};

function emptySnapshot(): RemoteSnapshot {
  return { ...EMPTY_REMOTE_SNAPSHOT };
}

export async function fetchPostById(
  supabase: SupabaseClient,
  postId: string,
): Promise<{
  post: Post | null;
  likes: Like[];
  saves: Save[];
  error?: string;
}> {
  const id = String(postId ?? "").trim();
  if (!id) {
    return { post: null, likes: [], saves: [], error: "Missing post id" };
  }

  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .eq("id", id)
    .single();

  if (error) return { post: null, likes: [], saves: [], error: error.message };
  if (!data) return { post: null, likes: [], saves: [] };
  const row = data as Record<string, unknown>;
  const post = mapSupabasePostRow(row);
  const likes = extractLikesFromPostsRows([row]);
  const saves = extractBookmarksFromPostsRows([row]);
  return { post, likes, saves };
}

export async function fetchPostsByRestaurantId(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<{ posts: Post[]; error?: string }> {
  const rid = String(restaurantId ?? "").trim();
  if (!rid) return { posts: [] };

  const { data, error } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: false });

  if (error) return { posts: [], error: error.message };
  return {
    posts: (data ?? []).map((r) =>
      mapSupabasePostRow(r as Record<string, unknown>),
    ),
  };
}

export async function fetchRestaurantNameById(
  supabase: SupabaseClient,
  restaurantId: string,
): Promise<string | null> {
  const rid = String(restaurantId ?? "").trim();
  if (!rid) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", rid)
    .maybeSingle();
  const n = data?.name;
  return typeof n === "string" && n.length > 0 ? n : null;
}

export type NotificationRow = {
  id: string;
  type: "like" | "follow" | "comment";
  createdAt: string;
  actorId: string;
  actorHandle: string;
  postId?: string;
  isRead: boolean;
  /** From `posts.image_url` when joined (like notifications). */
  postImageUrl?: string;
};

/** Shared select for list, single fetch, and realtime refetch (includes joins). */
export const NOTIFICATION_DETAIL_SELECT = `
  id,
  type,
  created_at,
  actor_id,
  post_id,
  is_read,
  actor:users!notifications_actor_id_fkey ( handle ),
  post:posts!notifications_post_id_fkey ( id, image_url )
` as const;

/** Map one notification row from PostgREST (with actor + post embeds). */
export function mapNotificationRowFromRaw(
  raw: Record<string, unknown>,
): NotificationRow {
  const actorJoin = pickJoinedRow<{ handle?: string }>(raw.actor);
  const postJoin = pickJoinedRow<{ id?: string; image_url?: string }>(
    raw.post,
  );
  const postIdRaw = raw.post_id;
  const postId =
    typeof postIdRaw === "string" && postIdRaw.length > 0
      ? postIdRaw
      : postJoin?.id != null
        ? String(postJoin.id)
        : undefined;
  const postImageUrl =
    typeof postJoin?.image_url === "string" && postJoin.image_url.length > 0
      ? postJoin.image_url
      : undefined;
  const actorLabel =
    typeof actorJoin?.handle === "string" && actorJoin.handle.trim().length > 0
      ? actorJoin.handle.trim()
      : "";
  const t = raw.type;
  const type: NotificationRow["type"] =
    t === "like" || t === "follow" || t === "comment" ? t : "like";
  return {
    id: String(raw.id ?? ""),
    type,
    createdAt:
      typeof raw.created_at === "string"
        ? raw.created_at
        : new Date().toISOString(),
    actorId: String(raw.actor_id ?? ""),
    actorHandle: actorLabel,
    postId,
    isRead: Boolean(raw.is_read),
    postImageUrl,
  };
}

export async function fetchNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ items: NotificationRow[]; error?: string }> {
  const uid = String(userId ?? "").trim();
  if (!uid) return { items: [] };

  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_DETAIL_SELECT)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) return { items: [], error: error.message };

  const items: NotificationRow[] = [];
  for (const raw of data ?? []) {
    items.push(mapNotificationRowFromRaw(raw as Record<string, unknown>));
  }
  return { items };
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ count: number; error?: string }> {
  const uid = String(userId ?? "").trim();
  if (!uid) return { count: 0 };

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("is_read", false);

  if (error) return { count: 0, error: error.message };
  return { count: count ?? 0 };
}
