"use client";

import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ExploreSearch } from "@/components/explore/explore-search";
import { ExploreTrending } from "@/components/explore/explore-trending";
import type { TrendingRestaurant } from "@/components/explore/explore-trending";
import { PostCard } from "@/components/feed/post-card";
import { findRestaurantByTagParam } from "@/lib/explore-hashtags";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  extractBookmarksFromPostsRows,
  extractLikesFromPostsRows,
  mapSupabasePostRow,
  POSTS_SELECT,
} from "@/lib/supabase/fetch";
import { useAppState } from "@/context/app-state";
import type { Post } from "@/types";

type ExploreFeedItem = { post: Post; likeCount: number };

function likeCountFromRow(row: Record<string, unknown>): number {
  const lr = row.likes;
  if (!Array.isArray(lr)) return 0;
  return lr.length;
}

/**
 * Smarter ordering: likes + recency + optional restaurant tag boost.
 * Aligns with `likes * 3 + recencyScore + restaurantBoost` product spec.
 */
function exploreScore(item: ExploreFeedItem): number {
  const likes = item.likeCount;
  const timeDiff =
    Date.now() - new Date(item.post.createdAt).getTime();
  const recencyScore = Math.max(0, 100_000_000 - timeDiff);
  const hasRestaurant =
    Boolean(item.post.restaurantId) &&
    String(item.post.restaurantId).trim().length > 0;
  const restaurantBoost = hasRestaurant ? 20 : 0;
  return likes * 3 + recencyScore + restaurantBoost;
}

function sortExploreRecommended(items: ExploreFeedItem[]): ExploreFeedItem[] {
  return [...items].sort((a, b) => exploreScore(b) - exploreScore(a));
}

function computeTrending(items: ExploreFeedItem[]): TrendingRestaurant[] {
  const map = new Map<string, { id: string; name: string; count: number }>();
  for (const { post } of items) {
    const rid = post.restaurantId?.trim();
    const name = post.restaurants?.name?.trim();
    if (!rid || !name) continue;
    const cur = map.get(rid) ?? { id: rid, name, count: 0 };
    cur.count += 1;
    map.set(rid, cur);
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag");
  const { explorePosts, state, dispatch, likeCount } = useAppState();

  const supabaseMode = isSupabaseConfigured();

  const [remoteItems, setRemoteItems] = useState<ExploreFeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    if (!supabaseMode) return;
    if (loadingRef.current || !hasMoreRef.current) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const from = pageRef.current * 20;
      const to = from + 19;
      const { data: posts, error } = await supabase
        .from("posts")
        .select(POSTS_SELECT)
        .order("created_at", { ascending: false })
        .range(from, to);

      console.log(posts);

      if (error) {
        console.error("[explore]", error.message);
        return;
      }

      if (!posts || posts.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
        return;
      }

      const rows = posts as Record<string, unknown>[];
      const mapped = rows.map((r) => mapSupabasePostRow(r));

      setRemoteItems((prev) => {
        const seen = new Set(prev.map((x) => x.post.id));
        const next: ExploreFeedItem[] = [...prev];
        for (let i = 0; i < mapped.length; i++) {
          const p = mapped[i];
          const row = rows[i];
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          next.push({ post: p, likeCount: likeCountFromRow(row) });
        }
        return sortExploreRecommended(next);
      });

      dispatch({ type: "MERGE_POSTS_REMOTE", posts: mapped });

      for (const row of rows) {
        const pid = String(row.id ?? "");
        if (!pid) continue;
        const likes = extractLikesFromPostsRows([row]);
        dispatch({
          type: "MERGE_POST_LIKES",
          postId: pid,
          likes,
        });
        const saves = extractBookmarksFromPostsRows([row]);
        dispatch({
          type: "MERGE_POST_SAVES",
          postId: pid,
          saves,
        });
      }

      pageRef.current += 1;
      setPage(pageRef.current);

      if (posts.length < 20) {
        hasMoreRef.current = false;
        setHasMore(false);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [supabaseMode, dispatch]);

  useEffect(() => {
    if (!supabaseMode) return;
    void fetchPosts();
  }, [supabaseMode, fetchPosts]);

  useEffect(() => {
    if (!supabaseMode) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (!hasMoreRef.current || loadingRef.current) return;
        void fetchPosts();
      },
      { root: null, rootMargin: "240px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [supabaseMode, fetchPosts]);

  const matchedRestaurant = useMemo(
    () => findRestaurantByTagParam(state.restaurants, tagParam),
    [state.restaurants, tagParam],
  );

  const localItems = useMemo((): ExploreFeedItem[] => {
    const posts = explorePosts();
    return posts.map((post) => ({
      post,
      likeCount: likeCount(post.id),
    }));
  }, [explorePosts, likeCount]);

  const filteredItems = useMemo(() => {
    if (supabaseMode) {
      let list = remoteItems;
      if (tagParam) {
        if (!matchedRestaurant) return [];
        list = list.filter(
          ({ post }) => post.restaurantId === matchedRestaurant.id,
        );
      }
      return sortExploreRecommended(list);
    }
    let list = localItems;
    if (tagParam) {
      const r = findRestaurantByTagParam(state.restaurants, tagParam);
      if (!r) return [];
      list = list.filter(({ post }) => post.restaurantId === r.id);
    }
    return sortExploreRecommended(list);
  }, [
    supabaseMode,
    remoteItems,
    localItems,
    tagParam,
    state.restaurants,
    matchedRestaurant,
  ]);

  const posts = useMemo(
    () => filteredItems.map((item) => item.post),
    [filteredItems],
  );

  const trending = useMemo(
    () => computeTrending(filteredItems),
    [filteredItems],
  );

  const unknownTag = Boolean(tagParam) && !matchedRestaurant;

  const emptyMessage = unknownTag
    ? "No restaurant matches that hashtag."
    : tagParam
      ? "No public posts for this place yet."
      : undefined;

  return (
    <div className="pt-2 md:pt-0">
      <header className="mb-4 px-0.5 md:mb-5 md:hidden">
        <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
          Explore
        </h1>
        <p className="text-xs text-zinc-400">Public posts from everyone</p>
      </header>

      <header className="mb-2 hidden md:block">
        <h1 className="text-base font-medium leading-tight tracking-tight text-zinc-900">
          Explore
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400">
          Discover posts by restaurant or hashtag
        </p>
      </header>

      <ExploreSearch restaurants={state.restaurants} />

      <ExploreTrending trending={trending} />

      <div className="mx-auto max-w-7xl px-3 pb-8 pt-1 sm:px-4">
        {posts.length === 0 ? (
          <p className="py-24 text-center text-sm text-zinc-400">
            {emptyMessage ?? "No posts yet."}
          </p>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="mb-4 break-inside-avoid">
                <PostCard post={post} masonry />
              </div>
            ))}
          </div>
        )}
      </div>

      {supabaseMode && hasMore && (
        <div
          ref={sentinelRef}
          className="h-4 w-full shrink-0"
          aria-hidden
          data-explore-page={page}
        />
      )}

      {supabaseMode && loading && (
        <p className="py-6 text-center text-sm text-zinc-400">Loading…</p>
      )}

      {supabaseMode && !hasMore && posts.length > 0 && (
        <p className="py-4 text-center text-xs text-zinc-400">
          You&apos;re all caught up
        </p>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse py-20 text-center text-sm text-zinc-400">
          Loading…
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
