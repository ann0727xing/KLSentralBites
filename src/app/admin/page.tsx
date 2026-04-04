"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAppState } from "@/context/app-state";
import type { UserId } from "@/types";

function AdminContent() {
  const { state, adminResetPassword, supabaseMode } = useAppState();
  const [passwords, setPasswords] = useState<Record<UserId, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  async function reset(userId: UserId) {
    const pw = passwords[userId]?.trim();
    if (!pw || pw.length < 6) {
      setStatus("Use at least 6 characters.");
      return;
    }
    await adminResetPassword(userId, pw);
    setStatus(`Password reset for ${userId}`);
    setPasswords((p) => ({ ...p, [userId]: "" }));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/following"
        className="mb-8 inline-block text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← Back to app
      </Link>
      <h1 className="mb-2 text-base font-medium text-zinc-900">
        Admin · password reset
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-zinc-500">
        Internal use: set a new password for any account. No email is sent.
      </p>
      {supabaseMode ? (
        <p className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          Supabase mode: reset passwords in the dashboard (Authentication → Users)
          or via the Auth API. This page only applies to local (offline) accounts.
        </p>
      ) : null}
      {status ? (
        <p className="mb-6 text-xs text-zinc-500" role="status">
          {status}
        </p>
      ) : null}
      <ul className="space-y-6">
        {state.users.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-white p-4 sm:flex-row sm:items-end"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900">@{u.handle}</p>
              <p className="text-xs text-zinc-400">{u.displayName}</p>
              <p className="mt-1 font-mono text-[10px] text-zinc-400">{u.id}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-64">
              <input
                type="password"
                placeholder="New password"
                value={passwords[u.id] ?? ""}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, [u.id]: e.target.value }))
                }
                className="rounded-xl border-0 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => reset(u.id)}
                className="rounded-xl bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Set password
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminContent />
    </AuthGuard>
  );
}
