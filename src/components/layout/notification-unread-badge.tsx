"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAppState } from "@/context/app-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getUnreadNotificationCount } from "@/lib/getUnreadNotificationCount";

/** Unread count pill for the notifications tab (Supabase only). */
export function NotificationUnreadBadge() {
  const { currentUserId } = useAppState();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentUserId) {
      setCount(0);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const n = await getUnreadNotificationCount(supabase);
    setCount(n);
  }, [currentUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    function onMarked() {
      void refresh();
    }
    window.addEventListener("notifications-marked-read", onMarked);
    return () => window.removeEventListener("notifications-marked-read", onMarked);
  }, [refresh]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUserId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`unread-count-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, refresh]);

  if (!isSupabaseConfigured() || count < 1) return null;

  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="pointer-events-none absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white shadow-sm"
      aria-hidden
    >
      {label}
    </span>
  );
}
