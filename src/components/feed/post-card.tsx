"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SavePinIcon } from "@/components/icons/save-pin";
import { postCoverImage } from "@/lib/post-images";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchCommentsForPost } from "@/lib/supabase/fetch";
import { remoteToggleSave } from "@/lib/supabase/mutations";
import { useAppState } from "@/context/app-state";
import type { Comment, Post } from "@/types";

type Props = {
  post: Post;
  /** Saved tab: show remove control that unsaves without opening the post */
  savedView?: boolean;
  /** Explore modal: no navigation on media/caption (grid opens modal instead). */
  modalEmbed?: boolean;
  /** CSS columns masonry: full-width card, image stays within column */
  masonry?: boolean;
};

export function PostCard({ post, savedView, modalEmbed, masonry }: Props) {
  const {
    getRestaurant,
    getUser,
    likeCount,
    isLikedByMe,
    isSavedByMe,
    toggleLike,
    toggleSave,
    dispatch,
    currentUserId,
    commentsForPost,
    addComment,
    deleteComment,
  } = useAppState();
  const restaurant = getRestaurant(post.restaurantId);
  const handle =
    post.users?.handle ??
    post.authorHandle ??
    getUser(post.authorId)?.handle;
  const likes = likeCount(post.id);
  const cover = postCoverImage(post);
  const multi = post.imageUrls.length > 1;
  const restaurantId =
    post.restaurantId && String(post.restaurantId).trim().length > 0
      ? post.restaurantId
      : null;

  const [cardComments, setCardComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [likeAnimate, setLikeAnimate] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCardComments([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const { comments } = await fetchCommentsForPost(supabase, post.id, {
        limit: 3,
        latestOnly: true,
      });
      if (!cancelled) setCardComments(comments);
    })();
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  /** Prefer global state after insert (re-fetched with `users.handle`); else initial feed fetch. */
  const displayComments = useMemo(() => {
    if (!isSupabaseConfigured()) {
      return commentsForPost(post.id).slice(-3);
    }
    const synced = commentsForPost(post.id).slice(-3);
    if (synced.length > 0) return synced;
    return cardComments;
  }, [commentsForPost, post.id, cardComments]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    const text = draft.trim();
    if (!text || !currentUserId) return;
    await addComment(post.id, text);
    setDraft("");
  }

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

  const mediaBlock = (
    <div className="relative w-full overflow-hidden bg-zinc-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cover}
        alt=""
        className={`block h-auto w-full max-w-full ${imageObjectClass} transition duration-500 ${modalEmbed ? "" : "group-hover:opacity-[0.98]"}`}
        loading="lazy"
        decoding="async"
      />
      {multi && (
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-[2px]">
          {post.imageUrls.length}
        </span>
      )}
    </div>
  );

  return (
    <div className={`relative ${masonry ? "w-full min-w-0" : ""}`}>
      <article
        className={`overflow-hidden rounded-2xl bg-zinc-50 ${masonry ? "w-full min-w-0" : ""}`}
      >
        {modalEmbed ? (
          <div className="block">{mediaBlock}</div>
        ) : (
          <Link href={`/post/${post.id}`} className="group block">
            {mediaBlock}
          </Link>
        )}

        <div className="px-2 pt-2">
          {handle && (
            <p className="truncate font-mono text-[11px] leading-tight text-zinc-400">
              @{handle}
            </p>
          )}
          {post.restaurants?.name && restaurantId && (
            <Link
              href={`/restaurant/${restaurantId}`}
              className="mt-1 block cursor-pointer text-sm text-gray-500 underline-offset-2 transition hover:text-black hover:underline active:opacity-60"
              onClick={(e) => e.stopPropagation()}
            >
              #{post.restaurants.name}
            </Link>
          )}
          {!post.restaurants?.name && restaurant?.name && restaurantId && (
            <Link
              href={`/restaurant/${restaurantId}`}
              className="mt-1 block cursor-pointer text-sm text-gray-500 underline-offset-2 transition hover:text-black hover:underline active:opacity-60"
              onClick={(e) => e.stopPropagation()}
            >
              #{restaurant.name}
            </Link>
          )}
          {post.caption &&
            (modalEmbed ? (
              <p className="mt-1 line-clamp-2 text-[13px] font-normal leading-[1.4] text-zinc-600">
                {post.caption}
              </p>
            ) : (
              <Link
                href={`/post/${post.id}`}
                className="mt-1 line-clamp-2 block text-[13px] font-normal leading-[1.4] text-zinc-600 hover:text-zinc-800"
              >
                {post.caption}
              </Link>
            ))}
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
            <button
              type="button"
              disabled={!currentUserId}
              onClick={(e) => void toggleBookmark(e)}
              className="rounded-full p-1 text-base transition hover:opacity-90 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={isBookmarked ? "Remove bookmark" : "Save post"}
            >
              {isBookmarked ? "🔖" : "📑"}
            </button>
            <Link
              href={`/post/${post.id}`}
              className="text-xs font-normal leading-[1.4] text-zinc-400 hover:text-zinc-500"
              onClick={(e) => e.stopPropagation()}
            >
              {likes} {likes === 1 ? "like" : "likes"}
            </Link>
          </div>

          <div
            className="mt-3 border-t border-zinc-100/90 pt-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {displayComments.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {displayComments.map((c) => {
                  const showHandle =
                    c.users?.handle ??
                    c.authorHandle ??
                    getUser(c.authorId)?.handle ??
                    "User";
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-baseline gap-x-1 text-[13px] leading-snug"
                    >
                      <span className="font-medium text-zinc-800">
                        @{showHandle}
                      </span>
                      <span className="min-w-0 flex-1 text-zinc-600">{c.body}</span>
                      {currentUserId === c.authorId && (
                        <button
                          type="button"
                          className="shrink-0 text-[11px] text-zinc-400 hover:text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void deleteComment(c.id, post.id);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="flex gap-2"
              onSubmit={(e) => void handleSubmitComment(e)}
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment…"
                disabled={!currentUserId}
                className="min-h-9 flex-1 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!currentUserId || !draft.trim()}
                className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </article>
      {savedView && (
        <button
          type="button"
          onClick={() => toggleSave(post.id)}
          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[2px] transition hover:bg-black/55"
          aria-label="Remove from saved"
        >
          <SavePinIcon filled className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
