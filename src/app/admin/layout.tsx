import type { ReactNode } from "react";
import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Console - GreenPack",
};

/**
 * `/admin/*` wears the console's own chrome, not the storefront's.
 *
 * The layout stays a Server Component so it can export `metadata` — a
 * `"use client"` module cannot — while the shell it renders is the Client
 * Component that reads `usePathname()` to mark the current tab. Same split as
 * `src/app/courier/layout.tsx`, for the same reason.
 *
 * Unlike the courier pair there is nothing to render bare here, so the shell
 * applies uniformly to all four pages.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
