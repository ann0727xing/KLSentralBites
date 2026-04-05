"use client";

import Link from "next/link";
import { useState } from "react";
import { SavePinIcon } from "@/components/icons/save-pin";
import { postCoverImage } from "@/lib/post-images";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { remoteToggleSave } from "@/lib/supabase/mutations";
import { useAppState } from "@/context/app-state";
import type { Post } from "@/types";

type Props = {
  post: Post;
  /** Saved tab: unsave without navigating away */
  savedView?: boolean;
  /** Narrow columns (e.g. Explore masonry): cover image in column width */
  masonry?: boolean;
};

export function PostCard({ post, savedView, masonry }: Props) {
  const {
    likeCount,
    isLikedByMe,
    isSavedByMe,
    toggleLike,
    toggleSave,
    dispatch,
    currentUserId,
  } = useAppState();

  const likes = likeCount(post.id);
  const cover = postCoverImage(post);
  const multi = post.imageUrls.length > 1;
  const [likeAnimate, setLikeAnimate] = useState(false);

  const isBookmarked = Boolean(
    currentUserId &&
      (isSavedByMe(post.id) ||
        post.bookmarks?.some((b) => b.user_id === currentUserId)),
  );

  async function toggleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await remoteToggleSave(
        supabase,
        currentUserId,
        post.id,
        isBookmarked,
      );
      if (!error) dispatch({ type: "TOGGLE_SAVE", postId: post.id });
      return;
    }
    toggleSave(post.id);
  }

  const imageObjectClass = masonry ? "object-cover" : "object-contain";
  const postHref = `/post/${post.id}`;

  return (
    <div className={`relative ${masonry ? "w-full min-w-0" : ""}`}>
      <article
        className={`w-full rounded-2xl bg-zinc-50 ${masonry ? "min-w-0" : ""}`}
      >
        <Link href={postHref} className="block w-full">
          <div className="relative w-full overflow-hidden bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className={`block h-auto w-full max-w-full ${imageObjectClass} transition duration-500`}
              loading="lazy"
              decoding="async"
            />
            {multi && (
              <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-[2px]">
                {post.imageUrls.length}
              </span>
            )}
          </div>
        </Link>

        <div className="px-2 pb-2 pt-2">
          <Link
            href={`/user/${post.authorId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            @{post.users?.display_name ?? "User"}
          </Link>
          {post.caption ? (
            <Link href={postHref} className="mt-1 block">
              <p className="line-clamp-2 text-[13px] font-normal leading-[1.4] text-zinc-600">
                {post.caption}
              </p>
            </Link>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!currentUserId}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setLikeAnimate(true);
                setTimeout(() => setLikeAnimate(false), 300);
                toggleLike(post.id);
              }}
              className={`rounded-full p-1 text-base transition hover:opacity-90 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 ${
                likeAnimate ? "scale-125 transition-transform duration-300" : ""
              }`}
              aria-label={isLikedByMe(post.id) ? "Unlike" : "Like"}
            >
              {isLikedByMe(post.id) ? "❤️" : "🤍"}
            </button>
            <Link
              href={postHref}
              className="text-xs font-normal leading-[1.4] text-zinc-400 hover:text-zinc-500"
              onClick={(e) => e.stopPropagation()}
            >
              {likes} {likes === 1 ? "like" : "likes"}
            </Link>
          </div>
        </div>
      </article>

      {savedView && (
        <button
          type="button"
          onClick={(e) => void toggleBookmark(e)}
          className="absolute left-2 top-2 z-10 rounded-full bg-black/40 p-2 text-white backdrop-blur-[2px] transition hover:bg-black/55"
          aria-label="Remove from saved"
        >
          <SavePinIcon filled className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
