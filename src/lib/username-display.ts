import type { Comment, Post } from "@/types";

/** Author @handle from joined `users` row or mapped `authorHandle` (both from DB). */
export function postAuthorHandle(post: Post): string | null {
  const h = post.users?.handle ?? post.authorHandle;
  if (typeof h !== "string") return null;
  const t = h.trim();
  return t.length > 0 ? t : null;
}

export function commentAuthorHandle(comment: Comment): string | null {
  const h = comment.users?.handle ?? comment.authorHandle;
  if (typeof h !== "string") return null;
  const t = h.trim();
  return t.length > 0 ? t : null;
}
