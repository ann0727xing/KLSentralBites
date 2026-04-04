"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/context/app-state";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUserId, bootstrapReady, supabaseMode, currentUser } =
    useAppState();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!bootstrapReady) return;
    if (supabaseMode && currentUser === undefined) return;
    if (currentUserId === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [bootstrapReady, supabaseMode, currentUser, currentUserId, router, pathname]);

  if (
    !bootstrapReady ||
    (supabaseMode && currentUser === undefined) ||
    currentUserId === null
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
