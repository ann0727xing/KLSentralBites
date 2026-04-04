"use client";

import Link from "next/link";

export type TrendingRestaurant = {
  id: string;
  name: string;
  count: number;
};

type Props = {
  trending: TrendingRestaurant[];
};

export function ExploreTrending({ trending }: Props) {
  if (trending.length === 0) return null;

  return (
    <section className="mb-4 space-y-2 px-0.5">
      <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        Trending restaurants
      </h2>
      <ul className="space-y-1.5">
        {trending.map((t, i) => (
          <li key={t.id}>
            <Link
              href={`/restaurant/${t.id}`}
              className="flex items-baseline justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm transition hover:bg-zinc-100"
            >
              <span className="min-w-0 text-zinc-900">
                <span className="font-medium text-zinc-400">#{i + 1}</span>{" "}
                <span className="font-medium">#{t.name}</span>
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                {t.count} {t.count === 1 ? "post" : "posts"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
