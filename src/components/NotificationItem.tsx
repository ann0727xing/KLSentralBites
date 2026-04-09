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
  const href =
    notification.type === "like" && notification.post_id
      ? `/post/${encodeURIComponent(notification.post_id)}`
      : actor?.username
        ? `/profile/${encodeURIComponent(actor.username)}`
        : "#";
  const text =
    notification.type === "follow"
      ? "followed you"
      : notification.type === "like"
        ? "liked your post"
        : "sent you a notification";

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
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-zinc-200" aria-hidden />
        )}
        <p className="text-sm text-zinc-900">
          <span className="font-semibold">{username}</span> {text}
        </p>
      </Link>
    </li>
  );
}
