"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  imageUrls: string[];
  priority?: boolean;
};

export function PostImageCarousel({ imageUrls, priority }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const updateActiveFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || imageUrls.length === 0) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setActive(Math.min(Math.max(0, i), imageUrls.length - 1));
  }, [imageUrls.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateActiveFromScroll();
    el.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateActiveFromScroll);
  }, [updateActiveFromScroll]);

  useEffect(() => {
    const onResize = () => updateActiveFromScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateActiveFromScroll]);

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: i * w, behavior: "smooth" });
  }, []);

  if (imageUrls.length === 0) return null;

  return (
    <div className="w-full">
      <div
        ref={scrollerRef}
        className="scrollbar-none flex w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {imageUrls.map((url, i) => (
          <div
            key={`${url.slice(0, 64)}-${i}`}
            className="flex w-full min-w-full shrink-0 snap-center snap-always items-center justify-center bg-zinc-100"
          >
            {/* Native img: variable aspect ratios, no crop (object-contain) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-auto max-h-[min(85vh,880px)] w-full object-contain"
              loading={priority && i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        ))}
      </div>
      {imageUrls.length > 1 && (
        <div
          className="flex justify-center gap-1.5 pt-4"
          role="tablist"
          aria-label="Photos"
        >
          {imageUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Photo ${i + 1} of ${imageUrls.length}`}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 rounded-full transition-[width,background-color] ${
                i === active
                  ? "w-5 bg-zinc-800"
                  : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
