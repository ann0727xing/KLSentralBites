import Image from "next/image";
import type { User } from "@/types";
import { needsUnoptimizedImage } from "@/lib/image-data";

type Props = {
  user: Pick<User, "handle" | "displayName" | "avatarUrl">;
  size: number;
  className?: string;
};

/**
 * Profile image or neutral placeholder (initial from display name) when none set.
 */
export function UserAvatar({ user, size, className }: Props) {
  const src = user.avatarUrl;
  const initial = (
    (user.displayName || user.handle).slice(0, 1) || "?"
  ).toUpperCase();

  if (src) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full bg-zinc-100 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized={needsUnoptimizedImage(src)}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, Math.round(size * 0.38)),
      }}
      aria-hidden
    >
      <span className="font-medium leading-none">{initial}</span>
    </div>
  );
}
