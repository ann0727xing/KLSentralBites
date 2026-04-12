import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-only singleton Supabase client.
 *
 * - Do not import this from Server Components, Route Handlers that set cookies,
 *   middleware, or `layout.tsx` — that pattern grows auth cookies and triggers
 *   `REQUEST_HEADER_TOO_LARGE` on Vercel.
 * - Call `auth.getUser()` / `getSession()` only inside client `useEffect` or
 *   event handlers, never during render.
 */
let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient must be called in the browser.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
    );
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}
