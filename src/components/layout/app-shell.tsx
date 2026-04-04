"use client";

import { AppLogo } from "@/components/brand/app-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

type TabItem = {
  href: "/following" | "/explore" | "/create" | "/notifications" | "/me";
  label: string;
  icon: ComponentType<{ className?: string }>;
  center?: boolean;
};

const tabs: TabItem[] = [
  { href: "/following", label: "Following", icon: HomeIcon },
  { href: "/explore", label: "Explore", icon: SearchIcon },
  { href: "/create", label: "Create", icon: PlusIcon, center: true },
  { href: "/notifications", label: "Notifications", icon: BellIcon },
  { href: "/me", label: "Me", icon: UserIcon },
];

/** Subtle lift from pure white + thin divider + light frosted blur */
const headerSurfaceClass =
  "border-b border-[#F0F0F0] bg-gradient-to-b from-[#FAFAFA] to-[#F3F3F3] backdrop-blur-md backdrop-saturate-150";

function isTabActive(t: TabItem, pathname: string): boolean {
  if (t.href === "/following") {
    return pathname === "/following" || pathname === "/";
  }
  if (t.href === "/me") {
    return (
      pathname === "/me" ||
      pathname.startsWith("/me/") ||
      pathname === "/settings" ||
      pathname === "/saved" ||
      pathname.startsWith("/profile/")
    );
  }
  return pathname === t.href || pathname.startsWith(`${t.href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-white text-zinc-900">
      {/* Mobile: sticky bar + safe area for notch / status bar */}
      <header
        className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] md:hidden ${headerSurfaceClass}`}
      >
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="min-w-0 flex-1 overflow-hidden">
            <AppLogo className="min-w-0" />
          </div>
          <Link
            href="/settings"
            className="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-600"
            aria-label="Settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <header className={`sticky top-0 z-40 hidden md:block ${headerSurfaceClass}`}>
        <div className="mx-auto flex h-14 max-w-6xl items-stretch justify-between px-6 lg:px-8">
          <div className="flex items-center">
            <AppLogo />
          </div>
          <nav className="flex items-stretch gap-0.5">
            {tabs.map((t) => {
              const active = isTabActive(t, pathname);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative flex items-center rounded-lg px-3 py-1.5 text-sm font-normal transition-colors ${
                    active
                      ? "bg-zinc-100/85 text-zinc-900 after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:h-[3px] after:w-7 after:-translate-x-1/2 after:rounded-full after:bg-brand"
                      : "text-zinc-500 hover:bg-zinc-100/50 hover:text-zinc-700"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Tab bar + FAB lift + home indicator — single env() so we don’t double-count safe area */}
      <main className="flex min-w-0 flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-1 md:pb-8 md:pt-6">
        <div className="mx-auto w-full min-w-0 max-w-6xl px-4 sm:px-5 lg:px-8">{children}</div>
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 overflow-visible border-t border-zinc-100/90 bg-white/95 backdrop-blur-sm md:hidden"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto max-w-lg px-2 pt-2">
          <div className="relative flex min-h-[52px] items-end justify-between gap-0.5 px-0.5 pb-0.5">
            {tabs.map((t) => {
              const active = isTabActive(t, pathname);
              const Icon = t.icon;
              if (t.center) {
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1 ${
                      active ? "text-zinc-900" : "text-zinc-400"
                    }`}
                    aria-label={t.label}
                  >
                    <span className="absolute left-1/2 top-0 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.12),0_12px_32px_-8px_rgba(0,0,0,0.28),0_2px_8px_-2px_rgba(0,0,0,0.08)] transition active:scale-[0.98]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] font-normal leading-tight sm:text-[11px]">
                      {t.label}
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-end gap-0.5 pb-1 ${
                    active ? "text-zinc-900" : "text-zinc-400"
                  }`}
                >
                  <span
                    className={`flex flex-col items-center gap-0.5 rounded-2xl px-1.5 pt-0.5 transition-colors ${
                      active ? "bg-zinc-100/90" : ""
                    }`}
                  >
                  <Icon className="h-[22px] w-[22px] shrink-0" />
                  <span className="max-w-[4.25rem] text-center text-[10px] font-normal leading-tight sm:max-w-[4.5rem] sm:text-[11px]">
                    {t.label}
                  </span>
                  {active ? (
                    <span
                      className="mt-0.5 h-1 w-1 rounded-full bg-brand"
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-0.5 h-1 w-1 shrink-0 opacity-0" aria-hidden />
                  )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.73 21a2 2 0 01-3.46 0"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.37-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
