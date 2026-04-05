import type { Comment, Post } from "@/types";

/**
 * True only for real public usernames from `users.handle`.
 * Rejects empty strings, generic "user", and legacy `user_*` backfill patterns.
 */
export function isDisplayableHandle(handle: string | null | undefined): boolean {
  if (typeof handle !== "string") return false;
  const t = handle.trim();
  if (t.length === 0) return false;
  const lower = t.toLowerCase();
  if (lower === "user") return false;
  if (lower.startsWith("user_")) return false;
  return true;
}

/** Author @handle from joined `users` row or mapped `authorHandle` (both from DB). */
export function postAuthorHandle(post: Post): string | null {
  const h = post.users?.handle ?? post.authorHandle;
  if (typeof h !== "string") return null;
  const t = h.trim();
  if (t.length === 0) return null;
  return isDisplayableHandle(t) ? t : null;
}

export function commentAuthorHandle(comment: Comment): string | null {
  const h = comment.users?.handle ?? comment.authorHandle;
  if (typeof h !== "string") return null;
  const t = h.trim();
  if (t.length === 0) return null;
  return isDisplayableHandle(t) ? t : null;
}
