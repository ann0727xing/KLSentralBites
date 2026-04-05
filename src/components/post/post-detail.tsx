"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { SavePinIcon } from "@/components/icons/save-pin";
import { EditPostDialog } from "@/components/post/edit-post-dialog";
import { PostImageCarousel } from "@/components/post/post-image-carousel";
import { fetchCommentsForPost, fetchPostById } from "@/lib/supabase/fetch";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Post } from "@/types";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/context/app-state";

type Props = { postId: string };

export function PostDetail({ postId }: Props) {
  const router = useRouter();
  const {
    currentUserId,
    getPost,
    getUser,
    getRestaurant,
    likeCount,
    isLikedByMe,
    isSavedByMe,
    commentsForPost,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    deletePost,
    dispatch,
  } = useAppState();

  const cached = getPost(postId);
  const [remotePost, setRemotePost] = useState<Post | null>(null);
  const [fetchDone, setFetchDone] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { post, likes, saves } = await fetchPostById(supabase, postId);
        if (!cancelled) {
          setRemotePost(post);
          if (post) {
            dispatch({ type: "MERGE_POSTS_REMOTE", posts: [post] });
            dispatch({
              type: "MERGE_POST_LIKES",
              postId: post.id,
              likes,
            });
            dispatch({
              type: "MERGE_POST_SAVES",
              postId: post.id,
              saves,
            });
            const { comments, error } = await fetchCommentsForPost(
              supabase,
              post.id,
            );
            if (!cancelled && !error) {
              dispatch({
                type: "SET_POST_COMMENTS",
                postId: post.id,
                comments,
              });
            }
          }
        }
      } finally {
        if (!cancelled) setFetchDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, dispatch]);

  const post = remotePost ?? cached;

  const [draft, setDraft] = useState("");
  const commentsRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(e: PointerEvent) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("pointerdown", handlePointer);
      return () => document.removeEventListener("pointerdown", handlePointer);
    }
  }, [menuOpen]);

  const author = post ? getUser(post.authorId) : undefined;
  const restaurant = post ? getRestaurant(post.restaurantId) : undefined;
  const comments = post ? commentsForPost(post.id) : [];
  const likes = post ? likeCount(post.id) : 0;
  const isOwner = post?.authorId === currentUserId;

  const sortedComments = useMemo(() => comments, [comments]);

  const linkHandle =
    post?.users?.display_name ??
    post?.authorHandle ??
    author?.displayName ??
    author?.handle;
  const showRestaurantTag =
    post?.restaurants?.name != null && post.restaurants.name.length > 0;
  const fallbackRestaurantName =
    !showRestaurantTag && restaurant?.name ? restaurant.name : null;

  if (!isSupabaseConfigured() && !cached) {
    notFound();
  }
  if (isSupabaseConfigured() && fetchDone && !post) {
    notFound();
  }
  if (isSupabaseConfigured() && !fetchDone && !cached) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center text-sm text-zinc-400 md:max-w-2xl">
        Loading…
      </div>
    );
  }
  if (!post) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center text-sm text-zinc-400 md:max-w-2xl">
        Loading…
      </div>
    );
  }

  function handleDelete() {
    setMenuOpen(false);
    if (
      typeof window !== "undefined" &&
      !window.confirm("Delete this post? This cannot be undone.")
    ) {
      return;
    }
    router.replace("/following");
    setTimeout(() => deletePost(postId), 0);
  }

  const restaurantHref =
    post.restaurantId && String(post.restaurantId).length > 0
      ? `/restaurant/${post.restaurantId}`
      : null;

  return (
    <div className="mx-auto max-w-lg pb-8 md:max-w-2xl md:pb-12">
      <div className="mb-4 flex items-center justify-between gap-3 md:mb-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Back"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-zinc-400">Post</span>
        </div>
        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Post options"
            >
              <MoreIcon className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] overflow-hidden rounded-xl bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-zinc-100"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-4 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                >
                  Edit post
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                  onClick={handleDelete}
                >
                  Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl bg-zinc-50">
        <PostImageCarousel imageUrls={post.imageUrls} priority />
      </div>

      <div className="mt-6 space-y-5 px-0.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            {post.authorId && (
              <p className="text-sm font-medium text-zinc-900">
                <Link
                  href={`/user/${post.authorId}`}
                  className="hover:text-zinc-600"
                >
                  <span className="text-sm text-gray-500">
                    @{post.users?.handle ?? "User"}
                  </span>
                </Link>
                {!post.isPublic && (
                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    Private
                  </span>
                )}
              </p>
            )}
            {showRestaurantTag && restaurantHref && (
              <Link
                href={restaurantHref}
                className="block cursor-pointer text-sm text-gray-500 underline-offset-2 transition hover:text-black hover:underline active:opacity-60"
              >
                #{post.restaurants?.name}
              </Link>
            )}
            {!showRestaurantTag && fallbackRestaurantName && restaurantHref && (
              <Link
                href={restaurantHref}
                className="block cursor-pointer text-sm text-gray-500 underline-offset-2 transition hover:text-black hover:underline active:opacity-60"
              >
                #{fallbackRestaurantName}
              </Link>
            )}
            {author && !linkHandle && (
              <p className="text-xs text-zinc-400">
                <Link
                  href={`/u/${author.handle}`}
                  className="text-zinc-600 hover:text-zinc-800"
                >
                  {author.displayName}
                </Link>
                {!post.isPublic && (
                  <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                    Private
                  </span>
                )}
              </p>
            )}
            {post.caption && (
              <p className="text-sm leading-relaxed text-zinc-700">{post.caption}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label="Like"
              active={isLikedByMe(post.id)}
              onClick={() => toggleLike(post.id)}
            >
              <HeartIcon filled={isLikedByMe(post.id)} />
            </IconButton>
            <IconButton
              label="Comment"
              onClick={() =>
                commentsRef.current?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <ChatIcon />
            </IconButton>
            <IconButton
              label={isSavedByMe(post.id) ? "Unsave" : "Save"}
              active={isSavedByMe(post.id)}
              onClick={() => toggleSave(post.id)}
            >
              <SavePinIcon filled={isSavedByMe(post.id)} />
            </IconButton>
          </div>
        </div>

        <p className="text-xs text-zinc-400">
          {likes} {likes === 1 ? "like" : "likes"}
        </p>

        <section ref={commentsRef} className="w-full space-y-4 pt-8">
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Comments
          </h2>
          <ul className="w-full space-y-4">
            {sortedComments.map((c) => {
              const u = getUser(c.authorId);
              return (
                <li key={c.id} className="flex gap-3">
                  {u ? (
                    <UserAvatar user={u} size={32} />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-800">
                      <span className="font-semibold">
                        @{c.users?.display_name ?? "User"}
                      </span>{" "}
                      <span className="font-normal">{c.body}</span>
                    </p>
                  </div>
                  {currentUserId === c.authorId && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-zinc-400 hover:text-red-600"
                      onClick={() => void deleteComment(c.id, post.id)}
                    >
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <form
            className="w-full pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = draft.trim();
              if (!t) return;
              addComment(post.id, t);
              setDraft("");
            }}
          >
            <div className="flex w-full items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-full border border-zinc-200 px-4 py-2 outline-none"
              />
              <button
                type="submit"
                className="whitespace-nowrap rounded-full bg-black px-4 py-2 text-white"
              >
                Send
              </button>
            </div>
          </form>
        </section>
      </div>

      <EditPostDialog
        post={post}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const className = `rounded-full p-2.5 transition ${
    active ? "text-zinc-900" : "text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700"
  }`;
  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg className="h-6 w-6" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
  );
}
