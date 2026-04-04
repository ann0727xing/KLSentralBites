"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Restaurant } from "@/types";
import {
  findRestaurantByTagParam,
  restaurantsMatchingQuery,
} from "@/lib/explore-hashtags";

type Props = {
  restaurants: Restaurant[];
};

export function ExploreSearch({ restaurants }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagFromUrl = searchParams.get("tag");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => findRestaurantByTagParam(restaurants, tagFromUrl),
    [restaurants, tagFromUrl],
  );

  const suggestions = useMemo(
    () => restaurantsMatchingQuery(restaurants, query),
    [restaurants, query],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function selectRestaurant(r: Restaurant) {
    setQuery("");
    setOpen(false);
    router.push(`/explore?tag=${encodeURIComponent(r.hashtag)}`);
  }

  function clearFilter() {
    setQuery("");
    router.push("/explore");
  }

  const q = query.trim();
  const showList = open && q.length > 0;
  const showSuggestions = showList && suggestions.length > 0;
  const showNoMatches = showList && suggestions.length === 0;

  return (
    <div ref={wrapRef} className="relative mb-5 md:mb-6">
      <label htmlFor="explore-search" className="sr-only">
        Search hashtags or restaurants
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden
        >
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          id="explore-search"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Search hashtags or restaurants"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-2xl border border-zinc-200/80 bg-white py-3 pl-10 pr-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200/80"
        />
      </div>

      {showSuggestions ? (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/[0.04]"
          role="listbox"
        >
          {suggestions.map((r) => (
            <li key={r.id} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition hover:bg-zinc-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectRestaurant(r)}
              >
                <span className="text-sm font-medium text-zinc-900">
                  #{r.hashtag}
                </span>
                <span className="text-xs text-zinc-500">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showNoMatches ? (
        <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-zinc-100 bg-white px-4 py-3 text-xs text-zinc-500 shadow-lg ring-1 ring-black/[0.04]">
          No matching restaurants or hashtags
        </p>
      ) : null}

      {selected ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs text-zinc-500">
            Showing posts for{" "}
            <span className="font-medium text-zinc-800">
              #{selected.hashtag}
            </span>
          </p>
          <button
            type="button"
            onClick={clearFilter}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Clear
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}
