"use client";

/**
 * Example: Supabase auth only in the browser, inside `useEffect`.
 * Do not call `getUser()` during render — it triggers `/auth/v1/user` and can
 * contribute to cookie/header issues if overused.
 */
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ClientAuthExamplePage() {
  const [email, setEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("[client-auth-example] getUser:", error.message);
      }
      if (!cancelled) {
        setEmail(user?.email ?? null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (email === undefined) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-sm text-zinc-600">
        Loading session…
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-sm text-zinc-800">
      {email ? (
        <p>
          Signed in as <span className="font-medium">{email}</span>
        </p>
      ) : (
        <p>Not signed in.</p>
      )}
    </main>
  );
}
