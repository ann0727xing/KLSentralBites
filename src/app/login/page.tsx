"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GuestGuard } from "@/components/auth/guest-guard";
import { PasswordField } from "@/components/auth/password-field";
import { AppWordmark } from "@/components/brand/app-logo";
import { useAppState } from "@/context/app-state";
import { handleToEmail } from "@/lib/supabase/config";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, supabaseMode } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await login(email.trim(), password);
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    const next = searchParams.get("next");
    router.replace(next && next.startsWith("/") ? next : "/following");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-16">
      <div className="mb-12">
        <AppWordmark />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-base font-medium leading-tight text-[#111]">
          Log in
        </h1>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-medium text-zinc-500"
            >
              Email
            </label>
            <input
              id="login-email"
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
              className="w-full rounded-2xl border-0 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="you@example.com"
            />
          </div>
          <PasswordField
            label="Password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
            autoComplete="current-password"
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
            {pending ? "…" : "Log in"}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-zinc-500">
          No account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-800 underline-offset-2 hover:underline"
          >
            Create account
          </Link>
        </p>
        {!supabaseMode ? (
          <p className="mt-4 text-center text-xs text-zinc-400">
            Demo: email{" "}
            <span className="font-mono text-zinc-500">{handleToEmail("you")}</span>{" "}
            · password{" "}
            <span className="font-mono text-zinc-500">demo123</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <GuestGuard>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </GuestGuard>
  );
}
