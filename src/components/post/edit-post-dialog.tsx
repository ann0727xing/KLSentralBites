"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/context/app-state";
import { makeRestaurantId, slugify } from "@/lib/slug";
import { nameToHashtag } from "@/lib/hashtag";
import type { Post, Restaurant } from "@/types";

type Props = {
  post: Post;
  open: boolean;
  onClose: () => void;
};

export function EditPostDialog({ post, open, onClose }: Props) {
  const { state, getRestaurant, addRestaurant, updatePost } = useAppState();
  const [caption, setCaption] = useState(post.caption ?? "");
  const [restaurantQuery, setRestaurantQuery] = useState("");
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    const r = getRestaurant(post.restaurantId);
    setCaption(post.caption ?? "");
    setRestaurantQuery(r?.name ?? "");
    setSelectedRestaurantId(post.restaurantId);
  }, [open, post, getRestaurant]);

  const filtered = useMemo(() => {
    const q = restaurantQuery.trim().toLowerCase();
    if (!q) return state.restaurants.slice(0, 8);
    return state.restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.hashtag.toLowerCase().includes(q),
    );
  }, [state.restaurants, restaurantQuery]);

  function resolveRestaurant(): Restaurant | null {
    if (selectedRestaurantId) {
      const sel = getRestaurant(selectedRestaurantId);
      if (sel) return sel;
    }
    const name = restaurantQuery.trim();
    if (name.length < 2) return null;
    const existing = state.restaurants.find(
      (r) => r.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const id = makeRestaurantId();
    const slug = `${slugify(name) || "place"}-${id.slice(-4)}`;
    return {
      id,
      name,
      slug,
      hashtag: nameToHashtag(name),
    };
  }

  function handleSave() {
    const r = resolveRestaurant();
    if (!r) return;
    if (!state.restaurants.some((x) => x.id === r.id)) {
      addRestaurant(r);
    }
    const cap = caption.trim();
    updatePost({
      postId: post.id,
      caption: cap || undefined,
      restaurantId: r.id,
    });
    onClose();
  }

  const canSave = Boolean(resolveRestaurant());

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.08)] sm:rounded-2xl sm:shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-post-title"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 id="edit-post-title" className="text-base font-medium leading-tight text-zinc-900">
            Edit post
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">Caption and restaurant</p>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Restaurant</label>
            <input
              value={restaurantQuery}
              onChange={(e) => {
                setRestaurantQuery(e.target.value);
                setSelectedRestaurantId(null);
              }}
              placeholder="Search or type a place"
              className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-2xl bg-zinc-50/80 p-2">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRestaurantId(r.id);
                      setRestaurantQuery(r.name);
                    }}
                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition ${
                      selectedRestaurantId === r.id
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:bg-white/80"
                    }`}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-zinc-400">#{r.hashtag}</span>
                  </button>
                </li>
              ))}
            </ul>
            {restaurantQuery.trim().length >= 2 &&
              !state.restaurants.some(
                (r) =>
                  r.name.toLowerCase() === restaurantQuery.trim().toLowerCase(),
              ) &&
              !selectedRestaurantId && (
                <p className="text-xs text-zinc-400">
                  New place → #{nameToHashtag(restaurantQuery.trim())}
                </p>
              )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              placeholder="Optional"
              className="w-full resize-none rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>
        <div className="flex gap-3 border-t border-zinc-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-zinc-900 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
