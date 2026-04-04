import Link from "next/link";

type Props = {
  /** e.g. "/me" or "/u/minaal" */
  basePath: string;
};

export function ProfileSubtleLinks({ basePath }: Props) {
  const root = basePath.replace(/\/$/, "");
  return (
    <nav className="mt-5 flex justify-center gap-10 text-xs font-medium text-zinc-400">
      <Link href={`${root}/followers`} className="transition hover:text-zinc-600">
        Followers
      </Link>
      <Link href={`${root}/following`} className="transition hover:text-zinc-600">
        Following
      </Link>
    </nav>
  );
}
