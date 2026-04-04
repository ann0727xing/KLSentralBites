import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    "https://jydhsimrvdcylwvciykv.supabase.co",
    "sb_publishable_kD-do5o5BGGYIEp20Sk6Wg_ANGt58is"
  );
}