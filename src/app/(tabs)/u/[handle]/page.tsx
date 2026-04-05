"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FeedGrid } from "@/components/feed/feed-grid";
import { ProfileSubtleLinks } from "@/components/profile/profile-subtle-links";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppState } from "@/context/app-state";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handle = typeof params.handle === "string" ? params.handle : "";
  const {
    getUserByHandle,
    currentUserId,
    state,
    isFollowing,
    toggleFollow,
  } = useAppState();

  const user = handle ? getUserByHandle(handle) : undefined;

  useEffect(() => {
    if (user?.id === currentUserId) {
      router.replace("/me");
    }
  }, [user, currentUserId, router]);

  const posts = useMemo(() => {
    if (!user) return [];
    return state.posts.filter((p) => p.authorId === user.id && p.isPublic);
  }, [state.posts, user]);

  if (!handle) {
    notFound();
  }

  if (!user) {
    notFound();
  }

  if (user.id === currentUserId) {
    return (
      <p className="py-20 text-center text-sm text-zinc-400">Opening your profile…</p>
    );
  }

  const following = isFollowing(user.id);

  return (
    <div className="pb-8 pt-2 md:pt-0">
      <div className="mb-8 flex flex-col items-center px-2 text-center md:mb-10">
        <div className="ring-2 ring-white ring-offset-2 ring-offset-white">
          <UserAvatar user={user} size={80} />
        </div>
        <h1 className="mt-4 text-base font-medium leading-tight tracking-tight text-zinc-900">
          @{user.handle}
        </h1>
        {user.bio?.trim() ? (
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
            {user.bio}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => toggleFollow(user.id)}
          className={`mt-5 rounded-full px-8 py-2.5 text-sm font-medium transition ${
            following
              ? "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
              : "bg-zinc-900 text-white hover:bg-zinc-800"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
        <ProfileSubtleLinks basePath={`/u/${user.handle}`} />
      </div>

      <FeedGrid posts={posts} />
    </div>
  );
}
