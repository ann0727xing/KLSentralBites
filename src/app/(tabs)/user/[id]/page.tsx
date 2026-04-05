import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedGrid } from "@/components/feed/feed-grid";
import { mapSupabasePostRow, POSTS_SELECT } from "@/lib/supabase/fetch";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Props = { params: Promise<{ id: string }> };

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const uid = String(id ?? "").trim();
  if (!uid) notFound();

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-zinc-500">
        Profiles require Supabase.
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, email, handle, created_at")
    .eq("id", uid)
    .single();

  if (userError || !user) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("posts")
    .select(POSTS_SELECT)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  const mapped = (posts ?? []).map((r) =>
    mapSupabasePostRow(r as Record<string, unknown>),
  );

  const handle =
    typeof user.handle === "string" && user.handle.trim().length > 0
      ? user.handle.trim()
      : null;

  if (!handle) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center text-sm text-zinc-500">
        No handle for this user.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-10 pt-2 md:pt-0">
      <div className="mb-6 px-0.5">
        <Link
          href="/following"
          className="text-sm text-zinc-500 transition hover:text-zinc-800"
        >
          ← Back
        </Link>
      </div>
      <div className="mb-8 text-center">
        <p className="text-sm text-gray-500">@{handle}</p>
      </div>
      <FeedGrid
        posts={mapped.filter((p) => p.isPublic)}
        emptyMessage="No posts yet."
      />
    </div>
  );
}
