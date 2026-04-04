"use client";

import type { Post } from "@/types";
import { PostCard } from "./post-card";

type Props = {
  posts: Post[];
  /** Pass through to cards (e.g. unsave on Saved tab) */
  savedView?: boolean;
  /** Override default empty copy */
  emptyMessage?: string;
};

export function FeedGrid({ posts, savedView, emptyMessage }: Props) {
  if (posts.length === 0) {
    return (
      <p className="py-24 text-center text-sm text-zinc-400">
        {emptyMessage ??
          "No posts yet. When people share, they will show up here."}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:hidden">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} savedView={savedView} />
        ))}
      </div>
      <div className="hidden sm:block">
        <div className="columns-2 gap-x-3 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6">
          {posts.map((post) => (
            <div key={post.id} className="mb-4 break-inside-avoid">
              <PostCard post={post} savedView={savedView} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
