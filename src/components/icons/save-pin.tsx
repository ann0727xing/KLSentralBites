/**
 * Pinterest-style save: outline map pin, subtle fill when saved (not a bookmark ribbon).
 */

export function SavePinIcon({
  filled,
  className = "h-6 w-6",
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M19.5 10.5c0 6.75-7.5 11.25-7.5 11.25S4.5 17.25 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
        fill={filled ? "currentColor" : "none"}
        fillOpacity={filled ? 0.22 : undefined}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}
