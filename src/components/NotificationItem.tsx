"use client";

import Link from "next/link";
import type { SimpleNotification } from "@/lib/getNotifications";

type Props = {
  notification: SimpleNotification;
};

export function NotificationItem({ notification }: Props) {
  const actor = notification.actor;
  const username = actor?.username ?? "someone";
  const avatarUrl = actor?.avatar_url ?? "";
  const isFollow = notification.type === "follow";
  const isLike = notification.type === "like";

  const href = isLike && notification.post_id
    ? `/post/${encodeURIComponent(notification.post_id)}`
    : actor?.username
      ? `/profile/${encodeURIComponent(actor.username)}`
      : "#";

  const text = isFollow
    ? "followed you"
    : isLike
      ? "liked your post"
      : "sent you a notification";

  const showThumb = isLike && Boolean(notification.post_id);
  const thumbSrc = notification.post_image_url ?? "";

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-md border p-3 transition hover:bg-zinc-50"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={`${username} avatar`}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200" aria-hidden />
        )}
        <p className="min-w-0 flex-1 text-sm text-zinc-900">
          <span className="font-semibold">{username}</span> {text}
        </p>
        {showThumb ? (
          thumbSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100"
              aria-hidden
            />
          )
        ) : null}
      </Link>
    </li>
  );
}
