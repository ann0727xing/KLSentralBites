import type { User, UserId } from "@/types";

const KEY = "klsentralbites_auth_v1";

export type PersistedAuth = {
  currentUserId: UserId | null;
  passwordHashes: Record<UserId, string>;
  extraUsers: User[];
  deletedUserIds: UserId[];
};

export function loadPersistedAuth(): PersistedAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return null;
  }
}

export function savePersistedAuth(data: PersistedAuth): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}
