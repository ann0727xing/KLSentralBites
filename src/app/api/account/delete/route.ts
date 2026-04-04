import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Deletes the authenticated user (Auth + cascaded profile/posts/…).
 * Requires SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export async function POST(request: Request) {
  let token: string | undefined;
  try {
    const body = (await request.json()) as { token?: string };
    token = body?.token;
  } catch {
    token = undefined;
  }
  if (!token) {
    const authHeader = request.headers.get("authorization");
    token = authHeader?.replace(/^Bearer\s+/i, "");
  }
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured: missing Supabase credentials." },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
