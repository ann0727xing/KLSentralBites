import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware intentionally does NOT use Supabase (`createServerClient`, `getSession`, or `getUser`).
 * That avoids refreshing/writing auth cookies on every navigation — a common cause of
 * `REQUEST_HEADER_TOO_LARGE` and repeated calls to `/auth/v1/user`.
 *
 * Session protection for app routes is handled client-side by `AuthGuard` (see `(tabs)/layout.tsx`).
 * Public routes: `/login`, `/signup`, etc.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/following", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|icons/|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
