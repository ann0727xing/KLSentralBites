import { AuthGuard } from "@/components/auth/auth-guard";
import type { ReactNode } from "react";

export default function PostLayout({ children }: { children: ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
