import type { Restaurant } from "@/types";
import { nameToHashtag } from "@/lib/hashtag";

/** Strip # and lowercase for comparisons */
export function normalizeTagQuery(input: string): string {
  return input.trim().replace(/^#+/g, "").toLowerCase();
}

export function restaurantsMatchingQuery(
  restaurants: Restaurant[],
  query: string,
): Restaurant[] {
  const q = normalizeTagQuery(query);
  if (!q) return [];
  return restaurants.filter((r) => {
    const h = r.hashtag.toLowerCase();
    const n = r.name.toLowerCase();
    const derived = nameToHashtag(r.name).toLowerCase();
    return h.includes(q) || n.includes(q) || derived.includes(q);
  });
}

export function findRestaurantByTagParam(
  restaurants: Restaurant[],
  tagParam: string | null,
): Restaurant | undefined {
  if (!tagParam) return undefined;
  const raw = decodeURIComponent(tagParam);
  const t = normalizeTagQuery(raw);
  return restaurants.find(
    (r) =>
      r.hashtag.toLowerCase() === t ||
      nameToHashtag(r.name).toLowerCase() === t,
  );
}
