"use client";

import Link from "next/link";
import { useState } from "react";
import { GuestGuard } from "@/components/auth/guest-guard";
import { PasswordField } from "@/components/auth/password-field";
import { AppWordmark } from "@/components/brand/app-logo";
import { useAppState } from "@/context/app-state";
import { handleValidationMessage } from "@/lib/validate-handle";

export default function SignupPage() {
  const { signup } = useAppState();
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    const hv = handleValidationMessage(handle);
    if (hv) {
      setError(hv);
      return;
    }
    setPending(true);
    const res = await signup(handle.trim(), email.trim(), password);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not create account.");
      return;
    }
    // Success: signup() redirects via window.location.href — no client redirect here.
  }

  return (
    <GuestGuard>
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-16">
        <div className="mb-12">
          <AppWordmark />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="mb-8 text-center text-base font-medium leading-tight text-[#111]">
            Create account
          </h1>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="signup-handle"
                className="block text-xs font-medium text-zinc-500"
              >
                Handle
              </label>
              <input
                id="signup-handle"
                value={handle}
                onChange={(e) => {
                  setHandle(e.target.value.replace(/\s/g, ""));
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="3–15 letters or numbers"
              />
              <p className="text-xs text-zinc-400">Letters and numbers only</p>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="signup-email"
                className="block text-xs font-medium text-zinc-500"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                placeholder="test@test.com"
                className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
              />
            </div>
            <PasswordField
              id="signup-password"
              label="Password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError(null);
              }}
              autoComplete="new-password"
            />
            <PasswordField
              id="signup-confirm"
              label="Confirm password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                setError(null);
              }}
              autoComplete="new-password"
            />
            {error ? (
              <p className="text-center text-xs text-zinc-500" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? "…" : "Create account"}
            </button>
          </form>
          <p className="mt-8 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-zinc-800 underline-offset-2 hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </GuestGuard>
  );
}
