"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SupportWidget from "@/components/support/SupportWidget";

// Which routes wear the storefront Header/Footer.
//
// The primary gate is the host, not the path: everything on the vendor host
// renders bare (see the `onVendorHost` prop below), which is what makes the
// vendor centre feel like its own product. The path lists underneath are for the
// *customer* host, where the /seller/* routes still resolve directly and must
// not be wrapped in storefront chrome there either.
//
// Paths that render their own chrome and must not inherit the storefront
// Header/Footer on the *customer* host.
const STANDALONE_PREFIXES = ["/seller", "/admin/support"];

// `/seller/*` still resolves directly on the customer host (every internal link
// depends on that), so the prefix list above covers it. `/admin/support` is the
// internal agent console.
//
// `/vendor/register` is the one exact path here. It is not rewritten and renders
// at its own path, so it can be reached on either host — including by someone
// typing it on the customer site. It is a full-screen form with its own logo and
// background, and the storefront Header sitting above it is actively misleading:
// on the vendor host it advertised "Become a Vendor" and "Sign Up" to someone
// already registering. It brings its own branding, so suppressing chrome here is
// safe on the main site too.
//
// The clean vendor URLs (/dashboard, /shop, …) are deliberately NOT listed. They
// only exist through the vendor host's rewrite, and everything on that host
// renders bare via the `onVendorHost` prop below — so listing them would be dead
// configuration that looks load-bearing. They fail together with host detection
// too: if the host is ever misread, middleware stops rewriting /dashboard as
// well, and the path never renders at all.
const STANDALONE_EXACT = ["/vendor/register"];

export default function AppChrome({
  children,
  onVendorHost = false,
}: {
  children: React.ReactNode;
  /**
   * Resolved on the server in src/app/layout.tsx from the request's `host`.
   * Defaults to false so the component still behaves if rendered without it.
   */
  onVendorHost?: boolean;
}) {
  const pathname = usePathname() || "";
  const isStandalone =
    // The vendor centre is a different product, not a corner of the storefront.
    // Nothing on it should wear the customer Header — which advertised "Become a
    // Vendor" and "Sign Up" to people who were already vendors — and there must
    // be no path back to the shopping site from inside it.
    onVendorHost ||
    STANDALONE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    STANDALONE_EXACT.includes(pathname);

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900">{children}</main>
      <Footer />
      {/* Global floating support launcher — hides itself on dashboard routes. */}
      <SupportWidget />
    </>
  );
}
