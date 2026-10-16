"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * The admin console's chrome.
 *
 * It exists for the same reason `CourierShell` does, one host later: AppChrome
 * renders the whole admin host bare, and the storefront Header — which is where
 * every admin page's sign-out came from — does not come along. Without a shell,
 * five pages would have no way out.
 *
 * That gap is not hypothetical, and it is already live on one page:
 * `/admin/support` is inside AppChrome's `STANDALONE_PREFIXES`, so it renders
 * bare on the *customer* host today and an agent there already has no sign-out.
 * Widening the suppression to the whole host would have made the other four
 * pages match it.
 *
 * Three deliberate differences from `CourierShell`:
 *
 *   - **It has nav.** The courier hub is one dashboard with its own tab bar and
 *     needs none; the console is five pages that link to each other, and the
 *     only existing route between them is the three-card chooser at `/admin`.
 *   - **No `STANDALONE_PATHS`.** `CourierShell` needs one because
 *     `/courier/register` is a full-screen form that renders bare under its own
 *     layout. Nothing under `/admin` does, so this shell is uniform.
 *   - **Sign-out reuses `useAuth().signOut`** rather than copying the inline
 *     block, because this component is inside `AuthProvider` (mounted in
 *     `src/app/layout.tsx`) and that function is already the correct one — it
 *     calls `signOut({ scope: "local" })` and purges the `sb-` storage keys.
 *     Scope is local on purpose and must stay that way: global would revoke the
 *     refresh token for the whole user and sign them out of every host.
 *
 * There is **no link back to the storefront** — the vendor centre's rule 4, not
 * the courier hub's divergence from it. An admin signs in with an ordinary
 * account, but every other path on this host redirects away, so a link to
 * `siteUrl("/")` would be the one way to leak the storefront into an admin tab.
 * The logo points at `/admin` instead.
 *
 * The file split (this + `src/app/admin/layout.tsx`) is forced: a `"use client"`
 * module cannot export `metadata`, and this one needs `usePathname()`.
 */
const NAV = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/vendors", label: "Elite" },
  { href: "/admin/couriers", label: "Couriers" },
  { href: "/admin/outreach", label: "Outreach" },
  { href: "/admin/support", label: "Support" },
];

/** Is `href` the current page? `/admin` is a prefix of the other four, so it is
 *  matched exactly and the rest by prefix — otherwise the Admin tab would light
 *  up on every page. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    // `/login` — the plain customer lane. There is no admin lane to select, and
    // this is the sanctioned way back in: the host has no front door, so `/`
    // would only 404.
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Points at `/admin`, not `/` — there is no `/` on this host. */}
            <Link href="/admin" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Green Pack Delight"
                width={32}
                height={32}
                className="rounded-full"
                unoptimized
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Green<span className="text-green-500">Pack</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full">
              Admin Console
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* The five pages, in one row. Scrolls rather than wraps on a narrow
            screen: a wrapped nav would push the page content down by a whole
            line on the device an admin is most likely to check a queue from. */}
        <nav className="flex items-center gap-1 px-4 lg:px-8 overflow-x-auto">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`whitespace-nowrap text-sm font-medium px-3 py-2.5 -mb-px border-b-2 transition-colors ${
                isActive(pathname, href)
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Each page carries its own max-width and padding, so the shell adds
          none — it only supplies the background and the bar. */}
      <main>{children}</main>
    </div>
  );
}
