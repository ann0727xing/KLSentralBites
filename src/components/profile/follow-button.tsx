"use client";

import { useAppState } from "@/context/app-state";
import type { UserId } from "@/types";

type Props = {
  targetUserId: UserId;
  following: boolean;
  className?: string;
};

/**
 * Standalone Follow control: always clickable, logs CLICKED before calling toggleFollow.
 * Use next to <Link> rows — stopPropagation avoids the link stealing the tap.
 */
export function FollowButton({ targetUserId, following, className = "" }: Props) {
  const { currentUserId, toggleFollow } = useAppState();

  return (
    <button
      type="button"
      aria-label={following ? "Unfollow" : "Follow"}
      className={`relative z-20 shrink-0 cursor-pointer touch-manipulation select-none active:opacity-90 ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("CLICKED", {
          userId: currentUserId,
          targetUserId,
        });
        void toggleFollow(targetUserId);
      }}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
