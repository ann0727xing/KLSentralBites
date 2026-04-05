"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Loads `users.handle` for the given auth user id (not from user_metadata).
 * `undefined` = not loaded yet; `null` = no row or empty handle.
 */
export function useUserHandleFromDb(userId: string | null | undefined): {
  handle: string | null | undefined;
  loading: boolean;
} {
  const supabaseOn = isSupabaseConfigured();
  const [handle, setHandle] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(
    Boolean(supabaseOn && userId && String(userId).trim() !== ""),
  );

  useEffect(() => {
    if (!supabaseOn || !userId || String(userId).trim() === "") {
      setHandle(undefined);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setHandle(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void supabase
      .from("users")
      .select("handle")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setHandle(null);
          setLoading(false);
          return;
        }
        const h =
          typeof data?.handle === "string" ? data.handle.trim() : "";
        setHandle(h.length > 0 ? h : null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, supabaseOn]);

  return { handle, loading };
}
