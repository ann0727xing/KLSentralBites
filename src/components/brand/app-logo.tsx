import Link from "next/link";
import { lobster } from "@/lib/fonts";

type Props = {
  className?: string;
};

/**
 * Handwritten wordmark (Lobster): full "KLSentralBites"; orange only on the "i" tittle.
 */
export function AppWordmark({ className }: Props) {
  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap text-zinc-900 antialiased ${className ?? ""}`}
    >
      <span
        className={`${lobster.className} text-[1.42rem] leading-[1.05] tracking-tight sm:text-[1.58rem]`}
      >
        <span className="inline">KLSentralB</span>
        <span className="relative inline-block text-current">
          {/* Latin dotless i — orange dot is the brand mark */}
          <span className="inline-block select-none">ı</span>
          <span
            className="pointer-events-none absolute left-[52%] top-[0.06em] h-[0.2em] min-h-[3px] w-[0.2em] min-w-[3px] -translate-x-1/2 rounded-full bg-brand"
            aria-hidden
          />
        </span>
        <span className="inline">tes</span>
      </span>
    </span>
  );
}

export function AppLogo({ className }: Props) {
  return (
    <Link
      href="/following"
      className={`inline-flex items-baseline ${className ?? ""}`}
      aria-label="KLSentralBites home"
    >
      <AppWordmark />
    </Link>
  );
}
