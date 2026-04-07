"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FollowButton } from "@/components/profile/follow-button";
import { useAppState } from "@/context/app-state";
import { isDisplayableHandle } from "@/lib/username-display";

type UserRow = { id: string; handle: string };

export function SuggestedUsers() {
  const { currentUserId, isFollowing } = useAppState();
  const [candidates, setCandidates] = useState<UserRow[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserId) {
      setCandidates([]);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    void supabase
      .from("users")
      .select("id, handle")
      .neq("id", currentUserId)
      .limit(40)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[suggested-users]", error.message);
          setCandidates([]);
          return;
        }
        setCandidates((data ?? []) as UserRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const suggested = useMemo(() => {
    return candidates
      .filter(
        (u) =>
          typeof u.handle === "string" &&
          isDisplayableHandle(u.handle.trim()),
      )
      .filter((u) => !isFollowing(u.id))
      .slice(0, 10);
  }, [candidates, isFollowing]);

  if (!isSupabaseConfigured() || suggested.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 px-1 md:mb-10">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        Suggested for you
      </h2>
      <ul className="divide-y divide-zinc-100 rounded-2xl bg-zinc-50/50 px-1 py-0.5 ring-1 ring-zinc-100/80">
        {suggested.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-3 py-2.5 first:pt-2 last:pb-2"
          >
            <Link
              href={`/profile/${encodeURIComponent(u.handle)}`}
              className="min-w-0 flex-1 truncate text-sm text-zinc-800"
            >
              @{u.handle}
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
    </section>
  );
}
