"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedGrid } from "@/components/feed/feed-grid";
import { mapSupabasePostRow, POSTS_SELECT } from "@/lib/supabase/fetch";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Post } from "@/types";

type LoadState = "loading" | "notfound" | "nohandle" | "ready";

export default function UserProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id.trim() : "";
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [handle, setHandle] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoadState("notfound");
      return;
    }
    if (!isSupabaseConfigured()) {
      setError("Profiles require Supabase.");
      setLoadState("ready");
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = getSupabaseBrowserClient();

      const { error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("[user profile] getUser:", authError.message);
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, handle, created_at")
        .eq("id", id)
        .single();

      if (cancelled) return;

      if (userError || !user) {
        setLoadState("notfound");
        return;
      }

      const h =
        typeof user.handle === "string" && user.handle.trim().length > 0
          ? user.handle.trim()
          : null;
      if (!h) {
        setHandle(null);
        setPosts([]);
        setLoadState("nohandle");
        return;
      }
      setHandle(h);

      const { data: postsRaw } = await supabase
        .from("posts")
        .select(POSTS_SELECT)
        .eq("user_id", id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const mapped = (postsRaw ?? []).map((r) =>
        mapSupabasePostRow(r as Record<string, unknown>),
      );
      setPosts(mapped.filter((p) => p.isPublic));
      setLoadState("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadState === "notfound") {
    notFound();
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-zinc-500">
        Profiles require Supabase.
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-zinc-500">
        {error}
      </div>
    );
  }

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  if (loadState === "nohandle") {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center text-sm text-zinc-500">
        No handle for this user.
      </div>
    );
  }

  if (!handle) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl pb-10 pt-2 md:pt-0">
      <div className="mb-6 px-0.5">
        <Link
          href="/following"
          className="text-sm text-zinc-500 transition hover:text-zinc-800"
        >
          ← Back
        </Link>
      </div>
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500">@{handle}</p>
      </div>
      <FeedGrid posts={posts} emptyMessage="No posts yet." />
    </div>
  );
}
