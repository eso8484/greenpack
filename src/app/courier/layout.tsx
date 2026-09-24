import type { ReactNode } from "react";
import type { Metadata } from "next";
import CourierShell from "@/components/courier/CourierShell";

export const metadata: Metadata = {
  title: "Courier Dashboard - GreenPack",
};

/**
 * `/courier/*` wears the courier hub's own chrome, not the storefront's.
 *
 * The layout stays a Server Component so it can export `metadata`; the shell it
 * renders is the Client Component that reads `usePathname()` and renders
 * `/courier/register` bare. See `src/components/courier/CourierShell.tsx`.
 */
export default function CourierLayout({ children }: { children: ReactNode }) {
  return <CourierShell>{children}</CourierShell>;
}
