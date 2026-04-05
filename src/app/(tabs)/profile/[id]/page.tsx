"use client";

import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ProfileSubtleLinks } from "@/components/profile/profile-subtle-links";
import { UserAvatar } from "@/components/profile/user-avatar";
import { postCoverImage } from "@/lib/post-images";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapSupabasePostRow, PROFILE_POSTS_SELECT } from "@/lib/supabase/fetch";
import { useAppState } from "@/context/app-state";
import type { Post, User } from "@/types";

type UsersRow = {
  id: string;
  email: string;
  handle: string;
  display_name: string | null;
  created_at: string;
};

export default function ProfileByIdPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { currentUserId, isFollowing, toggleFollow, dispatch } = useAppState();

  const [profile, setProfile] = useState<UsersRow | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    if (!id.trim()) {
      setMissing(true);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setMissing(true);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("id, email, handle, display_name, created_at")
      .eq("id", id)
      .single();

    if (userErr || !userRow) {
      setMissing(true);
      setProfile(null);
      setPosts([]);
      setLoading(false);
      return;
    }

    setProfile(userRow as UsersRow);

    const { data: postRows } = await supabase
      .from("posts")
      .select(PROFILE_POSTS_SELECT)
      .eq("user_id", id)
      .order("created_at", { ascending: false });

    const mapped = (postRows ?? []).map((r) =>
      mapSupabasePostRow(r as Record<string, unknown>),
    );
    setPosts(mapped);
    if (mapped.length > 0) {
      dispatch({ type: "MERGE_POSTS_REMOTE", posts: mapped });
    }
    setLoading(false);
  }, [id, dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (currentUserId && id && currentUserId === id) {
      router.replace("/me");
    }
  }, [currentUserId, id, router]);

  if (!id) {
    notFound();
  }

  if (loading) {
    return (
      <p className="py-20 text-center text-sm text-zinc-400">Loading…</p>
    );
  }

  if (missing || !profile) {
    notFound();
  }

  const displayHandle =
    profile.display_name?.trim() ||
    profile.handle?.trim() ||
    "User";
  const user: User = {
    id: profile.id,
    handle: profile.handle?.trim() || displayHandle,
    displayName: displayHandle,
    avatarUrl: null,
    bio: "",
  };

  const following = isFollowing(profile.id);
  const isSelf = currentUserId === profile.id;

  return (
    <div className="pb-8 pt-2 md:pt-0">
      <div className="mb-8 flex flex-col items-center px-2 text-center md:mb-10">
        <div className="ring-2 ring-white ring-offset-2 ring-offset-white">
          <UserAvatar user={user} size={80} />
        </div>
        <h1 className="mt-4 text-base font-medium leading-tight tracking-tight text-zinc-900">
          @{displayHandle}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
        {!isSelf && currentUserId && (
          <button
            type="button"
            onClick={() => toggleFollow(profile.id)}
            className={`mt-5 rounded-full px-8 py-2.5 text-sm font-medium transition ${
              following
                ? "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}
        <p className="mt-4">
          <Link
            href={`/u/${encodeURIComponent(displayHandle)}`}
            className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
          >
            View by @handle URL
          </Link>
        </p>
        <ProfileSubtleLinks basePath={`/u/${encodeURIComponent(displayHandle)}`} />
      </div>

      <ProfilePostGrid posts={posts} />
    </div>
  );
}

/** Thumbnail grid (Instagram-style) without full PostCard stack. */
function ProfilePostGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">No posts yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 md:gap-2">
      {posts.map((post) => {
        const src = postCoverImage(post);
        return (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="relative aspect-square overflow-hidden bg-zinc-100"
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                Post
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
