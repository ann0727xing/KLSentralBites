import type { SupabaseClient } from "@supabase/supabase-js";

/** Must match a public bucket in Supabase (see `supabase/migrations/*storage*`). */
export const POST_IMAGES_BUCKET = "post-images";

/**
 * Upload a browser data URL to Supabase Storage; returns public URL.
 * Bucket must be public so `getPublicUrl` URLs work for all clients.
 */
export async function uploadPostImageDataUrl(
  supabase: SupabaseClient,
  userId: string,
  dataUrl: string,
  index: number,
): Promise<{ publicUrl: string; error?: string }> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext =
    blob.type === "image/png"
      ? "png"
      : blob.type === "image/webp"
        ? "webp"
        : blob.type === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${userId}/${crypto.randomUUID()}-${index}.${ext}`;

  console.log("[Supabase storage] upload bucket:", POST_IMAGES_BUCKET);

  const { error } = await supabase
    .storage.from(POST_IMAGES_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: false,
    });
  if (error) {
    return { publicUrl: "", error: error.message };
  }
  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}
