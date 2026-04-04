"use client";

import { PostImageCarousel } from "@/components/post/post-image-carousel";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/context/app-state";
import { readFileAsDataUrl } from "@/lib/image-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadPostImageDataUrl } from "@/lib/supabase/storage";
import { MAX_POST_IMAGES } from "@/lib/post-images";
import { makePostId, makeRestaurantId, slugify } from "@/lib/slug";
import { nameToHashtag } from "@/lib/hashtag";
import type { Post, Restaurant } from "@/types";

const INPUT_ID = "create-photo-upload";

type RestaurantOption = { id: string; name: string };

function dedupeRestaurantsByName(
  rows: RestaurantOption[],
): RestaurantOption[] {
  return Array.from(new Map(rows.map((r) => [r.name, r])).values());
}

export default function CreatePage() {
  const router = useRouter();
  const { state, addPost, addRestaurant, currentUserId, refreshRemoteData } =
    useAppState();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RestaurantOption[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantOption | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);
  const restaurantSearchRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (!restaurantSearchRef.current?.contains(e.target as Node)) {
        setResults([]);
      }
    }
    const visible =
      dedupeRestaurantsByName(results).length > 0;
    if (visible) {
      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }
  }, [results]);

  useEffect(() => {
    if (isSupabaseConfigured()) return;
    const q = query.trim();
    if (!q || selectedRestaurant) {
      setResults([]);
      return;
    }
    setResults(
      dedupeRestaurantsByName(
        state.restaurants
          .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .map((r) => ({ id: r.id, name: r.name })),
      ),
    );
  }, [query, state.restaurants, selectedRestaurant]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const q = query.trim();
    if (!q || selectedRestaurant) {
      setResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    const t = window.setTimeout(() => {
      void (async () => {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          if (!cancelled) {
            setSearchLoading(false);
            setResults([]);
          }
          return;
        }
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name")
          .ilike("name", `%${q}%`)
          .limit(5);
        if (cancelled) return;
        setSearchLoading(false);
        if (error) {
          console.error("restaurant search:", error.message);
          setResults([]);
          return;
        }
        setResults(dedupeRestaurantsByName(data ?? []));
      })();
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, selectedRestaurant]);

  const previewRestaurant = useMemo((): Restaurant | null => {
    if (!selectedRestaurant) return null;
    return {
      id: selectedRestaurant.id,
      name: selectedRestaurant.name,
      slug: selectedRestaurant.id,
      hashtag: nameToHashtag(selectedRestaurant.name),
    };
  }, [selectedRestaurant]);

  async function handleCreateRestaurant() {
    const name = query.trim();
    if (!name || creatingRestaurant) return;

    if (!isSupabaseConfigured()) {
      const existingLocal = state.restaurants.find(
        (r) => r.name.toLowerCase() === name.toLowerCase(),
      );
      if (existingLocal) {
        setSelectedRestaurant({
          id: existingLocal.id,
          name: existingLocal.name,
        });
        setQuery(existingLocal.name);
        setResults([]);
        return;
      }
      const id = makeRestaurantId();
      const r: Restaurant = {
        id,
        name,
        slug: slugify(name) || id,
        hashtag: nameToHashtag(name) || "Place",
      };
      await addRestaurant(r);
      setSelectedRestaurant({ id, name });
      setQuery(name);
      setResults([]);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setCreatingRestaurant(true);
    try {
      const { data: existing } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("name", name)
        .maybeSingle();
      if (existing) {
        setSelectedRestaurant({ id: existing.id, name: existing.name });
        setQuery(existing.name);
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from("restaurants")
        .insert({ name })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: row } = await supabase
            .from("restaurants")
            .select("id, name")
            .eq("name", name)
            .maybeSingle();
          if (row) {
            setSelectedRestaurant({ id: row.id, name: row.name });
            setQuery(row.name);
            setResults([]);
            return;
          }
        }
        alert(error.message);
        return;
      }
      if (data) {
        setSelectedRestaurant({ id: data.id, name: data.name });
        setQuery(data.name);
        setResults([]);
      }
    } finally {
      setCreatingRestaurant(false);
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = "";
    if (files.length === 0) return;
    const room = MAX_POST_IMAGES - imageUrls.length;
    if (room <= 0) return;
    const slice = files.slice(0, room);
    try {
      const urls = await Promise.all(slice.map((f) => readFileAsDataUrl(f)));
      setImageUrls((prev) => [...prev, ...urls]);
    } catch {
      /* ignore */
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNextFromStep2() {
    if (!selectedRestaurant) return;
    setStep(3);
  }

  async function handlePublish() {
    if (imageUrls.length === 0) return;
    const r = previewRestaurant;
    if (!r) return;
    if (!currentUserId) return;

    let urls = [...imageUrls];
    const supabase = isSupabaseConfigured()
      ? getSupabaseBrowserClient()
      : null;

    if (supabase) {
      const nextUrls: string[] = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const { publicUrl, error } = await uploadPostImageDataUrl(
          supabase,
          currentUserId,
          imageUrls[i],
          i,
        );
        if (error || !publicUrl) {
          alert(error ?? "Could not upload images.");
          return;
        }
        nextUrls.push(publicUrl);
      }

      const restaurantId = selectedRestaurant?.id?.trim() || null;
      const insertRow = {
        caption: caption.trim() || null,
        image_url: nextUrls[0] ?? null,
        user_id: currentUserId,
        restaurant_id: restaurantId,
      };
      const { error } = await supabase.from("posts").insert(insertRow);
      if (error) {
        alert(error.message);
        return;
      }
      urls = nextUrls;
      await refreshRemoteData();
      router.push("/following");
      return;
    }

    const post: Post = {
      id: makePostId(),
      authorId: currentUserId,
      restaurantId: r.id,
      imageUrls: urls,
      caption: caption.trim() || undefined,
      isPublic,
      createdAt: new Date().toISOString(),
    };
    await addPost(post);
    await refreshRemoteData();
    router.push("/following");
  }

  const step2Enabled = Boolean(selectedRestaurant);
  const uniqueResults = useMemo(
    () => dedupeRestaurantsByName(results),
    [results],
  );
  const showAddNew =
    query.trim().length > 0 &&
    !selectedRestaurant &&
    !searchLoading &&
    uniqueResults.length === 0 &&
    !creatingRestaurant;
  const canAddMore = imageUrls.length < MAX_POST_IMAGES;

  return (
    <div className="mx-auto max-w-lg pb-8 pt-2 md:pt-0">
      <header className="mb-6 px-0.5">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Step {step} of 3
        </p>
        <h1 className="mt-1 text-base font-medium leading-tight tracking-tight text-zinc-900">
          New post
        </h1>
      </header>

      <input
        id={INPUT_ID}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFiles}
      />

      {step === 1 && (
        <div className="space-y-4">
          {imageUrls.length === 0 ? (
            <>
              <p className="text-sm text-zinc-500">Add photos</p>
              <label
                htmlFor={INPUT_ID}
                className="flex min-h-[min(48vh,20rem)] w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-2xl bg-zinc-50 px-8 transition hover:bg-zinc-100/90 active:bg-zinc-100"
              >
                <PhotoOutlineIcon className="h-14 w-14 text-zinc-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-800">
                    Upload photos
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-400">
                    Up to {MAX_POST_IMAGES} images · from your library
                  </p>
                </div>
              </label>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm text-zinc-500">Photos</p>
                <p className="text-xs tabular-nums text-zinc-400">
                  {imageUrls.length}/{MAX_POST_IMAGES}
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {imageUrls.map((url, index) => (
                  <div
                    key={`${index}-${url.slice(0, 32)}`}
                    className="relative shrink-0 overflow-hidden rounded-xl bg-zinc-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="block h-36 w-auto max-w-[200px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/55"
                      aria-label="Remove photo"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {canAddMore && (
                <label
                  htmlFor={INPUT_ID}
                  className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-3.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Add more
                </label>
              )}
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="create-restaurant-search"
              className="text-xs font-medium text-zinc-500"
            >
              Restaurant
            </label>
            <div className="relative" ref={restaurantSearchRef}>
              <input
                id="create-restaurant-search"
                type="text"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  if (!v.trim()) {
                    setSelectedRestaurant(null);
                    return;
                  }
                  if (
                    selectedRestaurant &&
                    v.trim() !== selectedRestaurant.name
                  ) {
                    setSelectedRestaurant(null);
                  }
                }}
                autoComplete="off"
                placeholder="Search restaurant…"
                className="w-full rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              {selectedRestaurant && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Selected:{" "}
                  <span className="font-medium text-zinc-700">
                    {selectedRestaurant.name}
                  </span>
                </p>
              )}
              {searchLoading &&
                query.trim().length > 0 &&
                !selectedRestaurant && (
                <p className="mt-2 text-xs text-zinc-400">Searching…</p>
              )}
              {uniqueResults.length > 0 && !selectedRestaurant && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
                  {uniqueResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className="flex w-full cursor-pointer px-4 py-2.5 text-left text-sm text-zinc-800 transition hover:bg-zinc-50 active:bg-zinc-100"
                      onClick={() => {
                        setSelectedRestaurant(r);
                        setQuery(r.name);
                        setResults([]);
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
              {showAddNew && (
                <div className="mt-2 rounded-xl border border-zinc-100 bg-white py-1 shadow-md ring-1 ring-black/[0.04]">
                  <button
                    type="button"
                    disabled={creatingRestaurant}
                    onClick={() => void handleCreateRestaurant()}
                    className="w-full cursor-pointer px-4 py-2.5 text-left text-sm font-medium text-blue-600 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingRestaurant
                      ? "Adding…"
                      : `+ Add "${query.trim()}"`}
                  </button>
                </div>
              )}
            </div>
            {!isSupabaseConfigured() &&
              state.restaurants.length === 0 &&
              !query.trim() && (
                <p className="text-xs text-zinc-400">
                  No restaurants yet — type a name to add one.
                </p>
              )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="w-full resize-none rounded-2xl border-0 bg-zinc-50 px-4 py-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3.5">
            <div>
              <p className="text-sm font-medium text-zinc-800">Visible to others</p>
              <p className="text-xs text-zinc-400">Turn off for a private note</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative h-7 w-12 rounded-full transition ${
                isPublic ? "bg-zinc-900" : "bg-zinc-200"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-2xl py-3.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!step2Enabled}
              onClick={handleNextFromStep2}
              className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && imageUrls.length > 0 && previewRestaurant && (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-zinc-100">
            <PostImageCarousel imageUrls={imageUrls} priority />
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-zinc-800">
              #{previewRestaurant.hashtag}
            </p>
            {caption ? (
              <p className="text-zinc-600">{caption}</p>
            ) : (
              <p className="text-zinc-400">No caption</p>
            )}
            <p className="text-xs text-zinc-400">{isPublic ? "Public" : "Private"}</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-2xl py-3.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handlePublish()}
              className="flex-1 rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.25}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008H12V8.25Z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
