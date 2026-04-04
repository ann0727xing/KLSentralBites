"use client";

import { notFound, useParams } from "next/navigation";
import { PostDetail } from "@/components/post/post-detail";

export default function PostPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-white px-4 pb-10 pt-3 sm:px-5 md:mx-auto md:max-w-3xl md:px-6 md:pt-8">
      <PostDetail postId={id} />
    </div>
  );
}
