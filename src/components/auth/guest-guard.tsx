"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/context/app-state";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    currentUserId,
    bootstrapReady,
    supabaseMode,
    currentUser,
    signupInProgress,
  } = useAppState();
  const router = useRouter();

  const onSignupRoute = pathname === "/signup";
  /** While signup runs, stay on /signup until insert finishes — then the page redirects. */
  const holdSignupForInsert = onSignupRoute && signupInProgress;

  useEffect(() => {
    if (!bootstrapReady) return;
    if (supabaseMode && currentUser === undefined) return;
    if (currentUserId === null) return;
    if (holdSignupForInsert) return;
    router.replace("/following");
  }, [
    bootstrapReady,
    supabaseMode,
    currentUser,
    currentUserId,
    holdSignupForInsert,
    router,
  ]);

  if (!bootstrapReady || (supabaseMode && currentUser === undefined)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-sm text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (currentUserId !== null && !holdSignupForInsert) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-sm text-zinc-400">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
