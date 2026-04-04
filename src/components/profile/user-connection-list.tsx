"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppState } from "@/context/app-state";
import type { User } from "@/types";

type Props = {
  users: User[];
};

export function UserConnectionList({ users }: Props) {
  const { currentUserId, isFollowing, toggleFollow } = useAppState();

  if (users.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-400">No one here yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {users.map((u) => (
        <li key={u.id} className="flex items-center gap-3 py-3.5 first:pt-0">
          <Link
            href={`/u/${u.handle}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <UserAvatar user={u} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {u.displayName}
              </p>
              <p className="truncate text-xs text-zinc-400">@{u.handle}</p>
            </div>
          </Link>
          {u.id !== currentUserId && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                toggleFollow(u.id);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                isFollowing(u.id)
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {isFollowing(u.id) ? "Following" : "Follow"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
