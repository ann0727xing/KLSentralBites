import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-sm font-medium text-zinc-900">Page not found</p>
      <p className="mt-2 text-sm text-zinc-500">
        This link may be broken or the content was removed.
      </p>
      <Link
        href="/following"
        className="mt-8 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        Go to feed
      </Link>
    </div>
  );
}
