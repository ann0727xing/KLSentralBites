"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/context/app-state";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { currentUserId, bootstrapReady, supabaseMode, currentUser } =
    useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!bootstrapReady) return;
    if (supabaseMode && currentUser === undefined) return;
    if (currentUserId !== null) {
      router.replace("/following");
    }
  }, [bootstrapReady, supabaseMode, currentUser, currentUserId, router]);

  if (
    !bootstrapReady ||
    (supabaseMode && currentUser === undefined) ||
    currentUserId !== null
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="text-sm text-zinc-400">Redirecting…</p>
      </div>
    );
  }

  return <>{children}</>;
}
