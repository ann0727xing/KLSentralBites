"use client";

import { useEffect, useState } from "react";
import { NotificationItem } from "@/components/NotificationItem";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getNotifications,
  type SimpleNotification,
} from "@/lib/getNotifications";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      let supabase;
      try {
        supabase = getSupabaseBrowserClient();
      } catch (error) {
        console.error("[notifications/page] Supabase client error:", error);
        setLoading(false);
        return;
      }

      const rows = await getNotifications(supabase);
      if (cancelled) return;
      setNotifications(rows);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Notifications</h1>

      {loading ? (
        <p>Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p>No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </main>
  );
}
