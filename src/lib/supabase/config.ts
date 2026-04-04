/** Synthetic email domain for Supabase Auth (handle maps to unique email). */
export const AUTH_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "auth.klsentralbites.invalid";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function handleToEmail(handle: string): string {
  const h = handle.trim().toLowerCase();
  return `${h}@${AUTH_EMAIL_DOMAIN}`;
}
