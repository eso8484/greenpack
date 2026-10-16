"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SupportWidget from "@/components/support/SupportWidget";

// Which routes wear the storefront Header/Footer.
//
// The primary gate is the host, not the path: everything on the vendor host, the
// courier hub, and the admin console renders bare (see the `onVendorHost` /
// `onCourierHost` / `onAdminHost` props below), which is what makes each feel like
// its own product. The path lists underneath are for the *customer* host, where
// the /seller/*, /courier/*, and /admin/* routes still resolve directly and must
// not be wrapped in storefront chrome there either.
//
// Paths that render their own chrome and must not inherit the storefront
// Header/Footer on the *customer* host.
const STANDALONE_PREFIXES = ["/seller", "/courier", "/admin"];

// `/seller/*`, `/courier/*`, and `/admin/*` still resolve directly on the customer
// host (every internal link depends on that), so the prefix list above covers all
// three. `/admin` is listed as the whole console rather than its one originally
// chrome-less page: the console now carries a shell of its own on all five pages,
// so the invariant is "the admin console never wears storefront chrome" regardless
// of host. On the customer host `/admin*` never reaches a render anyway — the
// middleware hands it to the admin host — so this is the belt to the host gate's
// braces, and it costs nothing.
//
// `/vendor/register` is the one exact path here. It is not rewritten and renders
// at its own path, so it can be reached on either host — including by someone
// typing it on the customer site. It is a full-screen form with its own logo and
// background, and the storefront Header sitting above it is actively misleading:
// on the vendor host it advertised "Become a Vendor" and "Sign Up" to someone
// already registering. It brings its own branding, so suppressing chrome here is
// safe on the main site too.
//
// `/courier/register` needs no entry for the same reason it needs none on the
// vendor host — it is under the `/courier` prefix above. It is likewise a
// full-screen form with its own logo, and the courier layout renders it bare.
//
// The clean host URLs (/dashboard, /shop, …) are deliberately NOT listed. They
// only exist through a host's rewrite, and everything on those hosts renders bare
// via the props below — so listing them would be dead configuration that looks
// load-bearing. They fail together with host detection too: if the host is ever
// misread, middleware stops rewriting /dashboard as well, and the path never
// renders at all.
const STANDALONE_EXACT = ["/vendor/register"];

export default function AppChrome({
  children,
  onVendorHost = false,
  onCourierHost = false,
  onAdminHost = false,
}: {
  children: React.ReactNode;
  /**
   * Resolved on the server in src/app/layout.tsx from the request's `host`.
   * Default to false so the component still behaves if rendered without them.
   */
  onVendorHost?: boolean;
  onCourierHost?: boolean;
  onAdminHost?: boolean;
}) {
  const pathname = usePathname() || "";
  const isStandalone =
    // Each subdomain is a different product, not a corner of the storefront.
    // Nothing on them should wear the customer Header — which advertised "Become
    // a Vendor" and "Become a Courier" to people who were already vendors and
    // couriers — and they render their own navigation instead (the seller
    // sidebar, the courier shell, the admin shell).
    onVendorHost ||
    onCourierHost ||
    onAdminHost ||
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
