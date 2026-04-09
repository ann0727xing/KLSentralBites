"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  fetchCurrentUserNotifications,
  type NotificationRow,
} from "@/lib/supabase/fetch";

export function SimpleNotificationsList() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(
    () => isSupabaseConfigured(),
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let cancelled = false;

    void (async () => {
      const { items: rows, error } = await fetchCurrentUserNotifications(supabase);
      if (cancelled) return;
      if (error) {
        console.error("[SimpleNotificationsList]", error);
      }
      setItems(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-sm text-zinc-500">Loading notifications...</p>;

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No notifications yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((n) => (
        <li key={n.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
          {n.type === "follow" ? "Someone followed you" : "New notification"}
        </li>
      ))}
    </ul>
  );
}
