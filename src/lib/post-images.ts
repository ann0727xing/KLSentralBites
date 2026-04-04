import type { Post } from "@/types";

export const MAX_POST_IMAGES = 5;

export function postCoverImage(post: Post): string {
  return post.imageUrls[0] ?? "";
}
