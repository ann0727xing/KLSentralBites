"use client";

import { useCallback, useEffect, useState } from "react";
import { PostCard } from "@/components/feed/post-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  BOOKMARKS_LIST_SELECT,
  extractBookmarksFromPostsRows,
  extractLikesFromPostsRows,
  mapSupabasePostRow,
} from "@/lib/supabase/fetch";
import { useAppState } from "@/context/app-state";
import type { Post } from "@/types";

export default function SavedPage() {
  const { currentUserId, dispatch, savedPosts } = useAppState();
  const supabaseOn = isSupabaseConfigured();

  const [remotePosts, setRemotePosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(supabaseOn);

  const loadSaved = useCallback(async () => {
    if (!supabaseOn || !currentUserId) {
      setRemotePosts([]);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("bookmarks")
      .select(BOOKMARKS_LIST_SELECT)
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[saved]", error.message);
      setRemotePosts([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    const mapped: Post[] = [];

    for (const row of rows) {
      const pr = row.posts;
      const postRaw = Array.isArray(pr) ? pr[0] : pr;
      if (!postRaw || typeof postRaw !== "object") continue;
      const postRow = postRaw as Record<string, unknown>;
      mapped.push(mapSupabasePostRow(postRow));
    }

    if (mapped.length > 0) {
      dispatch({ type: "MERGE_POSTS_REMOTE", posts: mapped });
    }
    for (const row of rows) {
      const pr = row.posts;
      const postRaw = Array.isArray(pr) ? pr[0] : pr;
      if (!postRaw || typeof postRaw !== "object") continue;
      const postRow = postRaw as Record<string, unknown>;
      const pid = String(postRow.id ?? "");
      if (!pid) continue;
      dispatch({
        type: "MERGE_POST_LIKES",
        postId: pid,
        likes: extractLikesFromPostsRows([postRow]),
      });
      dispatch({
        type: "MERGE_POST_SAVES",
        postId: pid,
        saves: extractBookmarksFromPostsRows([postRow]),
      });
    }

    setRemotePosts(mapped);
    setLoading(false);
  }, [supabaseOn, currentUserId, dispatch]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  const displayPosts = supabaseOn
    ? remotePosts
    : currentUserId
      ? savedPosts()
      : [];

  return (
    <div className="pb-8 pt-2 md:pt-0">
      <header className="mb-4 px-0.5 md:mb-5">
        <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
          Saved
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Posts you&apos;ve bookmarked
        </p>
      </header>

      <div className="mx-auto max-w-xl space-y-6 p-4">
        {supabaseOn && loading ? (
          <p className="py-16 text-center text-sm text-zinc-400">Loading…</p>
        ) : displayPosts.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-400">
            No saved posts yet
          </p>
        ) : (
          displayPosts.map((post) => (
            <PostCard key={post.id} post={post} savedView />
          ))
        )}
      </div>
    </div>
  );
}
