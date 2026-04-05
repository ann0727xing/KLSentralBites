export type UserId = string;
export type PostId = string;
export type RestaurantId = string;
export type CommentId = string;

export interface User {
  id: UserId;
  /** Unique username (shown as @handle). */
  handle: string;
  /** Set when user uploads a photo; otherwise `null`. */
  avatarUrl: string | null;
  bio?: string;
}

export interface Restaurant {
  id: RestaurantId;
  name: string;
  /** URL segment, e.g. klsentralbites-cafe */
  slug: string;
  /** Shown as #HashtagStyle (no leading # in field) */
  hashtag: string;
}

export interface Post {
  id: PostId;
  authorId: UserId;
  authorHandle?: string;
  /** Joined from `users` when loaded from Supabase (`users!posts_user_id_fkey`). */
  users?: {
    id?: string;
    handle?: string;
  };
  /** From `bookmarks (user_id)` when loaded from Supabase (who saved this post). */
  bookmarks?: { user_id: string }[];
  restaurantId: RestaurantId;
  restaurants?: {
    name?: string;
    hashtag?: string;
  };
  /** 1–5 image URLs (data URLs or remote). No video. */
  imageUrls: string[];
  caption?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface Comment {
  id: CommentId;
  postId: PostId;
  authorId: UserId;
  body: string;
  createdAt: string;
  /** From `users.handle` when loaded from Supabase. */
  authorHandle?: string;
  /** Nested `users` row from PostgREST when `comments.user_id → users.id` exists. */
  users?: {
    id?: string;
    handle?: string;
  };
}

export interface Like {
  userId: UserId;
  postId: PostId;
}

export interface Save {
  userId: UserId;
  postId: PostId;
}

/** followerId follows followingId */
export interface Follow {
  followerId: UserId;
  followingId: UserId;
}

export type NotificationType = "like" | "comment" | "follow";

export interface AppNotification {
  id: string;
  type: NotificationType;
  actorId: UserId;
  /** Omitted for follow notifications. */
  postId?: PostId;
  createdAt: string;
  /** For comments */
  preview?: string;
}
