"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { UserConnectionList } from "@/components/profile/user-connection-list";
import { useAppState } from "@/context/app-state";

export default function UserFollowersPage() {
  const params = useParams();
  const handle = typeof params.handle === "string" ? params.handle : "";
  const { getUserByHandle, followersForUser } = useAppState();
  const user = handle ? getUserByHandle(handle) : undefined;

  if (!handle || !user) {
    notFound();
  }

  const users = followersForUser(user.id);

  return (
    <div className="pb-8 pt-2 md:pt-0">
      <div className="mb-6 flex items-center gap-3 px-0.5">
        <Link
          href={`/u/${user.handle}`}
          className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
          aria-label="Back to profile"
        >
          <BackIcon className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            @{user.displayName ?? user.handle}
          </p>
          <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
            Followers
          </h1>
        </div>
      </div>
      <UserConnectionList users={users} />
    </div>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}
