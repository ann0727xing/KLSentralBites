"use client";

import { FeedGrid } from "@/components/feed/feed-grid";
import {
  fetchPostsByRestaurantId,
  fetchRestaurantNameById,
} from "@/lib/supabase/fetch";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Post } from "@/types";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RestaurantPostsPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    void (async () => {
      const [name, { posts: list, error: postsErr }] = await Promise.all([
        fetchRestaurantNameById(supabase, id),
        fetchPostsByRestaurantId(supabase, id),
      ]);
      if (cancelled) return;
      if (postsErr) setError(postsErr);
      setTitle(name);
      setPosts(list);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-white px-4 pb-10 pt-3 sm:px-5 md:mx-auto md:max-w-3xl md:px-6 md:pt-8">
      <header className="mb-6 flex items-start gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Back"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Restaurant
          </p>
          <h1 className="mt-1 truncate text-lg font-semibold text-zinc-900">
            {loading ? "…" : title ?? "Unknown place"}
          </h1>
          {!loading && (
            <p className="mt-1 text-sm text-zinc-500">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-400">Loading…</p>
      ) : (
        <FeedGrid
          posts={posts}
          emptyMessage="No posts at this restaurant yet."
        />
      )}
    </div>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
}
