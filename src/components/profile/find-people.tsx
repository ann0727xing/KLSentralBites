"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useMemo, useState } from "react";
import { FollowButton } from "@/components/profile/follow-button";
import { useAppState } from "@/context/app-state";

export function FindPeople() {
  const [query, setQuery] = useState("");
  const { state, currentUserId, isFollowing } = useAppState();

  const results = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (t.length === 0) return [];
    return state.users
      .filter((u) => u.id !== currentUserId)
      .filter((u) => u.handle.toLowerCase().includes(t))
      .slice(0, 24);
  }, [query, state.users, currentUserId]);

  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <label className="sr-only" htmlFor="find-people-search">
        Search people by @handle
      </label>
      <input
        id="find-people-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="@handle"
        className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
      />

      {hasQuery && results.length === 0 && (
        <p className="mt-3 text-center text-xs text-zinc-400">No matches</p>
      )}

      {hasQuery && results.length > 0 && (
        <ul className="mt-3 divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 px-1 py-0.5">
          {results.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 py-2.5 first:pt-2 last:pb-2"
            >
              <Link
                href={`/profile/${encodeURIComponent(u.handle)}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <UserAvatar user={u} size={40} />
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    @{u.handle}
                  </p>
                </div>
              </Link>
              <FollowButton
                targetUserId={u.id}
                following={isFollowing(u.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                  isFollowing(u.id)
                    ? "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
