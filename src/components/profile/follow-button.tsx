"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/context/app-state";
import type { UserId } from "@/types";

type Props = {
  targetUserId: UserId;
  following: boolean;
  className?: string;
};

/**
 * Follow control with optimistic UI: local `isFollowing` updates after a successful toggle.
 * Debug: alerts + console logs (remove alerts when stable).
 */
export function FollowButton({ targetUserId, following, className = "" }: Props) {
  const { currentUserId, toggleFollow } = useAppState();
  const [isFollowing, setIsFollowing] = useState(following);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setIsFollowing(following);
  }, [following]);

  return (
    <button
      type="button"
      disabled={pending}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
      aria-busy={pending}
      className={`relative z-20 shrink-0 touch-manipulation select-none active:opacity-90 ${pending ? "cursor-wait opacity-70" : "cursor-pointer"} ${className}`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pending) return;
        setPending(true);
        console.log("CLICKED", {
          userId: currentUserId,
          targetUserId,
        });
        try {
          const wasFollowing = isFollowing;
          const ok = await toggleFollow(targetUserId);
          if (ok) {
            setIsFollowing(!wasFollowing);
          }
        } finally {
          setPending(false);
        }
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
