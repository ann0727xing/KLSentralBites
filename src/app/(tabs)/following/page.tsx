"use client";

import { FeedGrid } from "@/components/feed/feed-grid";
import { useAppState } from "@/context/app-state";

export default function FollowingPage() {
  const { followingFeedPosts, bootstrapReady } = useAppState();
  const posts = followingFeedPosts();

  if (!bootstrapReady) {
    return (
      <div className="pt-2 md:pt-0">
        <p className="py-24 text-center text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="pt-2 md:pt-0">
      <header className="mb-4 px-0.5 md:mb-6 md:hidden">
        <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
          Following
        </h1>
        <p className="text-xs text-zinc-400">From people you follow</p>
      </header>
      <FeedGrid
        posts={posts}
        emptyMessage="No posts yet. Share something or follow people to see their posts here."
      />
    </div>
  );
}
