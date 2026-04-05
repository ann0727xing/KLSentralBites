"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PasswordField } from "@/components/auth/password-field";
import { useAppState } from "@/context/app-state";
import { useUserHandleFromDb } from "@/hooks/use-user-handle-from-db";
import { supabaseAuthToAppUser } from "@/lib/supabase-auth-user";
import { handleValidationMessage } from "@/lib/validate-handle";
import type { User } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const {
    state,
    getUser,
    getUserByHandle,
    updateProfile,
    setNotificationsEnabled,
    logout,
    deleteAccount,
    changePassword,
    currentUserId,
    currentUser,
    supabaseMode,
  } = useAppState();

  const { handle: dbHandle, loading: handleLoading } =
    useUserHandleFromDb(currentUserId);

  const user = useMemo((): User | undefined => {
    if (!currentUserId) return undefined;
    const fromState = getUser(currentUserId);
    if (fromState) return fromState;
    if (supabaseMode && currentUser) {
      if (handleLoading) return undefined;
      if (dbHandle == null) return undefined;
      return {
        ...supabaseAuthToAppUser(currentUser),
        handle: dbHandle,
      } satisfies User;
    }
    return undefined;
  }, [currentUserId, getUser, supabaseMode, currentUser, dbHandle, handleLoading]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console -- debug aid for profile / auth timing
      console.log("[settings] currentUserId:", currentUserId);
      // eslint-disable-next-line no-console
      console.log("[settings] user:", user);
    }
  }, [currentUserId, user]);

  const [handleDraft, setHandleDraft] = useState("");
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleSaved, setHandleSaved] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  if (!currentUserId) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-12 pt-8 text-center">
        <p className="text-sm text-zinc-500">Loading user…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-12 pt-8 text-center">
        <p className="text-sm text-zinc-500">Loading profile…</p>
      </div>
    );
  }

  const enabled = Boolean(state.settings?.notificationsEnabled);

  async function saveHandle() {
    if (!user || !currentUserId) return;
    setHandleError(null);
    setHandleSaved(false);
    const raw = handleDraft || user.handle;
    const msg = handleValidationMessage(raw);
    if (msg) {
      setHandleError(msg);
      return;
    }
    const h = raw.trim().toLowerCase();
    if (h === user.handle) {
      setHandleSaved(true);
      return;
    }
    const taken = getUserByHandle(h);
    if (taken && taken.id !== currentUserId) {
      setHandleError("That handle is already taken.");
      return;
    }
    await updateProfile({ handle: h });
    setHandleDraft("");
    setHandleSaved(true);
  }

  async function savePassword() {
    setPwError(null);
    setPwOk(false);
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    if (newPw.length < 6) {
      setPwError("Use at least 6 characters.");
      return;
    }
    const res = await changePassword(curPw, newPw);
    if (!res.ok) {
      setPwError(res.error ?? "Could not update password.");
      return;
    }
    setPwOk(true);
    setCurPw("");
    setNewPw("");
    setConfirmPw("");
  }

  async function handleLogout() {
    if (!confirm("Sign out?")) return;
    await logout();
    router.replace("/login");
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account? This cannot be undone.")) return;
    if (!confirm("This will remove your access. Continue?")) return;
    await deleteAccount();
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-lg pb-12 pt-2 md:pt-0">
      <header className="mb-8 flex items-center gap-3 px-0.5">
        <Link
          href="/me"
          className="rounded-xl px-2 py-1.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          ← Back
        </Link>
      </header>

      <h1 className="mb-8 text-base font-medium leading-tight tracking-tight text-zinc-900">
        Settings
      </h1>

      <section className="mb-10 space-y-6">
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Change handle
          </h2>
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <label className="text-xs font-medium text-zinc-500" htmlFor="h">
              Handle
            </label>
            <input
              id="h"
              value={handleDraft || user?.handle || ""}
              onChange={(e) => {
                setHandleDraft(e.target.value.replace(/\s/g, ""));
                setHandleError(null);
                setHandleSaved(false);
              }}
              onFocus={() => {
                if (!handleDraft && user?.handle) setHandleDraft(user.handle);
              }}
              className="mt-1 w-full rounded-xl border-0 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {handleError ? (
              <p className="mt-2 text-xs text-zinc-500">{handleError}</p>
            ) : null}
            {handleSaved && !handleError ? (
              <p className="mt-2 text-xs text-zinc-400">Saved</p>
            ) : null}
            <button
              type="button"
              onClick={saveHandle}
              className="mt-3 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Update handle
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Change password
          </h2>
          <div className="space-y-4 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <PasswordField
              label="Current password"
              value={curPw}
              onChange={(v) => {
                setCurPw(v);
                setPwError(null);
              }}
              autoComplete="current-password"
            />
            <PasswordField
              id="new-pw"
              label="New password"
              value={newPw}
              onChange={(v) => {
                setNewPw(v);
                setPwError(null);
              }}
              autoComplete="new-password"
            />
            <PasswordField
              id="confirm-pw"
              label="Confirm new password"
              value={confirmPw}
              onChange={(v) => {
                setConfirmPw(v);
                setPwError(null);
              }}
              autoComplete="new-password"
            />
            {pwError ? (
              <p className="text-xs text-zinc-500">{pwError}</p>
            ) : null}
            {pwOk ? (
              <p className="text-xs text-zinc-400">Password updated</p>
            ) : null}
            <button
              type="button"
              onClick={savePassword}
              className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Update password
            </button>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-100 bg-zinc-50/50 p-1">
        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3.5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-zinc-800">Notifications</p>
            <p className="text-xs text-zinc-400">Alerts for likes and comments</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setNotificationsEnabled(!enabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              enabled ? "bg-zinc-900" : "bg-zinc-200"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Account
        </h2>
        <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Handle</p>
          <p className="mt-1 text-sm text-zinc-900">
            {user?.handle ? `@${user.handle}` : "—"}
          </p>
        </div>
      </section>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
        >
          Log out
        </button>
      </div>

      <div className="mt-10 border-t border-zinc-100 pt-8">
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="w-full rounded-2xl border border-red-200 bg-red-50/80 py-3.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
