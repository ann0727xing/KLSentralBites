"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/context/app-state";
import { readFileAsDataUrl } from "@/lib/image-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  handleValidationMessage,
  normalizeHandle,
} from "@/lib/validate-handle";
import type { User } from "@/types";
import { UserAvatar } from "@/components/profile/user-avatar";

const AVATAR_INPUT_ID = "edit-profile-avatar";

type Props = {
  user: User;
  open: boolean;
  onClose: () => void;
};

export function EditProfileDialog({ user, open, onClose }: Props) {
  const { updateProfile, currentUserId } = useAppState();
  const [handleInput, setHandleInput] = useState(user.handle);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const [handleError, setHandleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setHandleInput(user.handle);
    setBio(user.bio ?? "");
    setAvatarUrl(user.avatarUrl);
    setHandleError(null);
  }, [open, user]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = Array.from(e.target.files ?? []).find((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = "";
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      setAvatarUrl(url);
    } catch {
      /* ignore */
    }
  }

  async function handleSave() {
    if (!currentUserId) return;
    setHandleError(null);
    const hv = handleValidationMessage(handleInput);
    if (hv) {
      setHandleError(hv);
      return;
    }
    const handleNormalized = normalizeHandle(handleInput);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.auth.updateUser({
          data: {
            handle: handleNormalized,
          },
        });
        if (error) {
          console.error("updateUser error:", error);
          setHandleError(error.message);
          return;
        }
        console.log("updateUser success:", data);
      } catch (e) {
        console.error("updateUser error:", e);
        setHandleError(
          e instanceof Error ? e.message : "Could not save handle.",
        );
        return;
      }
    }

    await updateProfile({
      handle: handleNormalized,
      bio: bio.trim(),
      avatarUrl: avatarUrl ?? null,
    });
    onClose();
  }

  if (!open) return null;

  const previewUser = {
    handle: handleInput.trim().replace(/^@/, "") || user.handle,
    avatarUrl,
  };

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
        aria-labelledby="edit-profile-title"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2
            id="edit-profile-title"
            className="text-base font-medium leading-tight text-zinc-900"
          >
            Edit profile
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">Handle, bio, photo</p>
        </div>
        <div className="space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-col items-center gap-3">
            <UserAvatar user={previewUser} size={96} />
            <input
              id={AVATAR_INPUT_ID}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onPickAvatar}
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor={AVATAR_INPUT_ID}
                className="cursor-pointer text-sm font-medium text-zinc-600 underline-offset-2 hover:underline"
              >
                Change photo
              </label>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-sm font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500" htmlFor="ep-handle">
              Handle
            </label>
            <input
              id="ep-handle"
              value={handleInput}
              onChange={(e) => {
                setHandleInput(e.target.value.replace(/\s/g, ""));
                setHandleError(null);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              placeholder="3–15 letters or numbers"
              className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
            />
            {handleError ? (
              <p className="text-xs text-red-600" role="alert">
                {handleError}
              </p>
            ) : (
              <p className="text-xs text-zinc-400">Letters and numbers only</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500" htmlFor="ep-bio">
              Bio
            </label>
            <textarea
              id="ep-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Short description"
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
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-zinc-900 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
