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

  useEffect(() => {
    setIsFollowing(following);
  }, [following]);

  return (
    <button
      type="button"
      aria-label={isFollowing ? "Unfollow" : "Follow"}
      className={`relative z-20 shrink-0 cursor-pointer touch-manipulation select-none active:opacity-90 ${className}`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        alert("clicked");
        console.log("CLICKED", {
          userId: currentUserId,
          targetUserId,
        });
        const wasFollowing = isFollowing;
        const ok = await toggleFollow(targetUserId);
        if (ok) {
          setIsFollowing(!wasFollowing);
          alert("done");
        }
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
