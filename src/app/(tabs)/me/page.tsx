"use client";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FeedGrid } from "@/components/feed/feed-grid";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { FindPeople } from "@/components/profile/find-people";
import { SuggestedUsers } from "@/components/profile/suggested-users";
import { ProfileSubtleLinks } from "@/components/profile/profile-subtle-links";
import { UserAvatar } from "@/components/profile/user-avatar";
import { useAppState } from "@/context/app-state";
import {
  enrichPostsWithUserHandles,
  mapSupabasePostRow,
  POSTS_SELECT,
} from "@/lib/supabase/fetch";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useUserHandleFromDb } from "@/hooks/use-user-handle-from-db";
import { supabaseAuthToAppUser } from "@/lib/supabase-auth-user";
import type { Post, User } from "@/types";

function MeContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "saved" ? "saved" : "posts";
  const { state, getUser, savedPosts, currentUserId } = useAppState();
  const supabaseOn = isSupabaseConfigured();
  const { handle: dbHandle, loading: handleLoading } =
    useUserHandleFromDb(currentUserId);

  const [currentUser, setCurrentUser] = useState<
    SupabaseAuthUser | null | undefined
  >(() => (supabaseOn ? undefined : null));

  const [mePostsFromDb, setMePostsFromDb] = useState<Post[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!supabaseOn) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setCurrentUser(data.user ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseOn]);

  useEffect(() => {
    if (!supabaseOn) return;
    if (currentUser === undefined || currentUser === null) {
      setMePostsFromDb([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (currentUserId == null || String(currentUserId).trim() === "") {
        if (!cancelled) setMePostsFromDb([]);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: posts, error } = await supabase
        .from("posts")
        .select(POSTS_SELECT)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error || !posts) {
        setMePostsFromDb([]);
        return;
      }
      let mapped = posts.map((r) =>
        mapSupabasePostRow(r as Record<string, unknown>),
      );
      mapped = await enrichPostsWithUserHandles(supabase, mapped);
      setMePostsFromDb(mapped);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseOn, currentUser, currentUserId]);

  const profileUser: User | null | undefined = useMemo(() => {
    if (!supabaseOn) {
      if (!currentUserId) return null;
      return getUser(currentUserId) ?? null;
    }
    if (currentUser === undefined) return undefined;
    if (currentUser === null) return null;
    if (handleLoading) return undefined;
    if (dbHandle == null) return null;
    return {
      ...supabaseAuthToAppUser(currentUser),
      handle: dbHandle,
    } satisfies User;
  }, [
    supabaseOn,
    currentUser,
    currentUserId,
    getUser,
    dbHandle,
    handleLoading,
  ]);

  const myPosts = useMemo(() => {
    if (supabaseOn) return mePostsFromDb;
    if (!currentUserId) return [];
    return state.posts.filter((p) => p.authorId === currentUserId);
  }, [supabaseOn, mePostsFromDb, state.posts, currentUserId]);

  const saved = savedPosts();

  if (profileUser === undefined) {
    return <div>Loading...</div>;
  }

  if (profileUser === null) {
    if (!supabaseOn || currentUser === null) {
      return <div>Not logged in</div>;
    }
    return (
      <div className="py-20 text-center text-sm text-zinc-500">
        Could not load profile (missing handle in users table).
      </div>
    );
  }

  return (
    <div className="pb-8 pt-2 md:pt-0">
      <div className="mb-8 flex flex-col items-center px-2 text-center md:mb-10">
        <div className="ring-2 ring-white ring-offset-2 ring-offset-white">
          <UserAvatar user={profileUser} size={80} />
        </div>
        <h1 className="mt-4 text-base font-medium leading-tight tracking-tight text-zinc-900">
          @{profileUser.handle}
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
          {profileUser.bio?.trim() ? (
            profileUser.bio
          ) : (
            <span className="text-zinc-400">Add a short bio in Edit profile</span>
          )}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Edit profile
          </button>
          <Link
            href="/settings"
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
          >
            Settings
          </Link>
        </div>
        <ProfileSubtleLinks basePath="/me" />
      </div>

      <section className="mb-8 px-1 md:mb-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Find People
        </h2>
        <FindPeople />
      </section>

      <SuggestedUsers />

      <nav className="mb-3 flex justify-center gap-1 rounded-2xl bg-zinc-100/80 p-1 ring-1 ring-zinc-200/50 md:mb-5">
        <TabLink href="/me" active={tab === "posts"}>
          Posts
        </TabLink>
        <TabLink href="/me?tab=saved" active={tab === "saved"}>
          Saved
        </TabLink>
      </nav>

      <div className="rounded-2xl bg-surface-muted-subtle px-1 pb-2 pt-1 ring-1 ring-zinc-200/40 md:px-2 md:pb-3">
        {tab === "posts" ? (
          <FeedGrid posts={myPosts} />
        ) : (
          <FeedGrid posts={saved} savedView />
        )}
      </div>

      <EditProfileDialog
        user={profileUser}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative min-w-[6rem] rounded-xl px-5 py-2.5 text-center text-sm font-medium transition ${
        active
          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/60 after:pointer-events-none after:absolute after:bottom-1.5 after:left-1/2 after:h-[3px] after:w-8 after:-translate-x-1/2 after:rounded-full after:bg-brand"
          : "text-zinc-500 hover:bg-white/70 hover:text-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

export default function MePage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse py-20 text-center text-sm text-zinc-400">
          Loading…
        </div>
      }
    >
      <MeContent />
    </Suspense>
  );
}
