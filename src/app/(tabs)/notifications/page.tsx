"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { needsUnoptimizedImage } from "@/lib/image-data";
import { postCoverImage } from "@/lib/post-images";
import { useAppState } from "@/context/app-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchNotificationsForUser,
  mapNotificationRowFromRaw,
  NOTIFICATION_DETAIL_SELECT,
  type NotificationRow,
} from "@/lib/supabase/fetch";
import { remoteMarkAllNotificationsRead } from "@/lib/supabase/mutations";
import type { AppNotification, Post, User } from "@/types";

export default function NotificationsPage() {
  const { notifications, getUser, getPost, currentUserId } =
    useAppState();
  const mockItems = notifications();
  const [remoteItems, setRemoteItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(
    () => isSupabaseConfigured() && Boolean(currentUserId),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(() => new Set());

  const handleNewNotification = useCallback(
    async (newNotification: Record<string, unknown>) => {
      const recipientId =
        typeof newNotification.user_id === "string"
          ? newNotification.user_id
          : "";
      if (!currentUserId || recipientId !== currentUserId) return;

      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;

      const nid = String(newNotification.id ?? "");
      if (!nid) return;

      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_DETAIL_SELECT)
        .eq("id", nid)
        .single();

      if (error || !data) {
        console.warn("[notifications] realtime refetch failed:", error?.message);
        return;
      }

      const row = mapNotificationRowFromRaw(data as Record<string, unknown>);

      setRemoteItems((prev) => {
        if (prev.some((x) => x.id === row.id)) return prev;
        return [row, ...prev];
      });

      if (
        row.type === "like" ||
        row.type === "follow" ||
        row.type === "comment"
      ) {
        setToast(
          row.type === "like"
            ? "New like ❤️"
            : row.type === "follow"
              ? "New follower"
              : "New comment 💬",
        );
        window.setTimeout(() => setToast(null), 3500);
        setHighlightIds((prev) => new Set(prev).add(row.id));
        window.setTimeout(() => {
          setHighlightIds((prev) => {
            const next = new Set(prev);
            next.delete(row.id);
            return next;
          });
        }, 4000);
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          void handleNewNotification(payload.new as Record<string, unknown>);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, handleNewNotification]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserId) {
      setLoading(false);
      setRemoteItems([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      await remoteMarkAllNotificationsRead(supabase, currentUserId);
      if (cancelled) return;
      window.dispatchEvent(new Event("notifications-marked-read"));
      const { items, error } = await fetchNotificationsForUser(
        supabase,
        currentUserId,
      );
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.error("[notifications]", error);
        setRemoteItems([]);
        return;
      }
      setRemoteItems(items);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const useRemote = isSupabaseConfigured() && Boolean(currentUserId);

  const empty = useMemo(() => {
    if (useRemote) return remoteItems.length === 0 && !loading;
    return mockItems.length === 0;
  }, [useRemote, remoteItems.length, loading, mockItems.length]);

  if (useRemote && loading) {
    return (
      <div className="mx-auto max-w-lg pb-8 pt-2 md:pt-0">
        <header className="mb-6 px-0.5">
          <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
            Notifications
          </h1>
          <p className="text-xs text-zinc-400">Activity on your posts and profile</p>
        </header>
        <p className="py-16 text-center text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg pb-8 pt-2 md:pt-0">
      <header className="mb-6 px-0.5">
        <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
          Notifications
        </h1>
        <p className="text-xs text-zinc-400">Activity on your posts and profile</p>
      </header>

      {toast && (
        <div
          className="mb-4 rounded-2xl bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {empty ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          You are all caught up.
        </p>
      ) : useRemote ? (
        <ul className="space-y-2">
          {remoteItems.map((n) => (
            <RemoteNotificationListItem
              key={n.id}
              n={n}
              getPost={getPost}
              highlight={highlightIds.has(n.id)}
            />
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {mockItems.map((n) => (
            <MockNotificationListItem
              key={n.id}
              n={n}
              getUser={getUser}
              getPost={getPost}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function syntheticUser(actorId: string, handle: string): User {
  return {
    id: actorId,
    handle,
    avatarUrl: null,
  };
}

function RemoteNotificationListItem({
  n,
  getPost,
  highlight,
}: {
  n: NotificationRow;
  getPost: (id: string) => Post | undefined;
  highlight?: boolean;
}) {
  const actor = syntheticUser(n.actorId, n.actorHandle);
  const href =
    n.postId && (n.type === "like" || n.type === "comment")
      ? `/post/${n.postId}`
      : `/profile/${encodeURIComponent(n.actorHandle)}`;

  const label =
    n.type === "like"
      ? "liked your post"
      : n.type === "follow"
        ? "followed you"
        : "commented on your post";

  const showThumb =
    (n.type === "like" || n.type === "comment") && Boolean(n.postId);

  return (
    <li>
      <Link
        href={href}
        className={`flex gap-3 rounded-2xl p-3 transition hover:bg-zinc-50 ${
          highlight
            ? "bg-brand/10 ring-2 ring-brand/40 ring-offset-2 ring-offset-white"
            : ""
        }`}
      >
        <UserAvatar user={actor} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-800">
            <span className="font-medium">@{n.actorHandle}</span>
            <span className="text-zinc-500"> {label}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatRelativeTime(n.createdAt)}
          </p>
        </div>
        {showThumb ? (
          <PostThumb
            postId={n.postId!}
            imageUrl={n.postImageUrl}
            getPost={getPost}
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100" aria-hidden />
        )}
      </Link>
    </li>
  );
}

function PostThumb({
  postId,
  imageUrl,
  getPost,
}: {
  postId: string;
  imageUrl?: string;
  getPost: (id: string) => Post | undefined;
}) {
  const post = getPost(postId);
  const thumb =
    imageUrl && imageUrl.length > 0
      ? imageUrl
      : post
        ? postCoverImage(post)
        : "";
  if (!thumb) {
    return (
      <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100" aria-hidden />
    );
  }
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
      <Image
        src={thumb}
        alt=""
        fill
        unoptimized={needsUnoptimizedImage(thumb)}
        className="object-cover"
        sizes="48px"
      />
    </div>
  );
}

function MockNotificationListItem({
  n,
  getUser,
  getPost,
}: {
  n: AppNotification;
  getUser: (id: string) => User | undefined;
  getPost: (id: string) => Post | undefined;
}) {
  const actor = getUser(n.actorId);
  const post = n.postId ? getPost(n.postId) : undefined;

  if (!actor) return null;

  const href =
    n.type === "follow"
      ? `/profile/${encodeURIComponent(actor.handle)}`
      : n.postId
        ? `/post/${n.postId}`
        : "#";

  const label =
    n.type === "like"
      ? "liked your post"
      : n.type === "follow"
        ? "followed you"
        : "commented on your post";

  return (
    <li>
      <Link
        href={href}
        className="flex gap-3 rounded-2xl p-3 transition hover:bg-zinc-50"
      >
        <UserAvatar user={actor} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-800">
            <span className="font-medium">@{actor.handle}</span>
            <span className="text-zinc-500"> {label}</span>
          </p>
          {n.type === "comment" && n.preview && (
            <p className="mt-0.5 truncate text-xs text-zinc-400">
              “{n.preview}”
            </p>
          )}
          <p className="mt-0.5 text-xs text-zinc-400">
            {formatRelativeTime(n.createdAt)}
          </p>
        </div>
        {n.type !== "follow" && post ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={postCoverImage(post)}
              alt=""
              fill
              unoptimized={needsUnoptimizedImage(postCoverImage(post))}
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100" aria-hidden />
        )}
      </Link>
    </li>
  );
}
