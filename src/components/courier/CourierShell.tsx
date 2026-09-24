"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/hosts";

// Routes under /courier that bring their own chrome and must render bare.
//
// `/courier/register` is a full-screen application form with its own logo and
// background — a second wordmark above it is actively wrong, the same reason
// the storefront keeps it out of the storefront Header. The comparison is
// exact and safe: only `/` and `/dashboard` are rewritten on the courier host,
// so this path is never aliased and usePathname() reports it verbatim. The
// rewritten `/dashboard` simply fails the equality and gets the shell, which
// is correct.
const STANDALONE_PATHS = ["/courier/register"];

/**
 * The courier hub's chrome.
 *
 * This exists because the courier surface has no chrome of its own otherwise:
 * `/courier/dashboard` is a single client page that used to inherit the
 * storefront Header, and that Header was where its sign-out came from. Once
 * AppChrome renders the hub bare — which is what makes it feel like its own
 * product rather than a corner of the shop — a shell has to replace it, or the
 * dashboard becomes a page with no way to sign out.
 *
 * Much smaller than the seller shell by design: the courier dashboard is one
 * page with its own tab bar, so there is no sidebar and no nav list here.
 *
 * It lives in its own file rather than directly in `src/app/courier/layout.tsx`
 * because it has to be a Client Component (`usePathname`), and a `"use client"`
 * module cannot export `metadata`. Keeping the layout as a Server Component
 * lets it keep the section's page title — the seller layout, which is a client
 * component, simply lost its.
 */
export default function CourierShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            // Local scope, never global. The hub runs on its own hostname with
            // its own host-only session cookie, so a courier logout must not
            // revoke the refresh token server-side — that would also sign the
            // same person out of the customer site. The split is a side effect
            // here rather than the point (a courier's account *is* their
            // customer account), but the coupling is just as unwanted.
            await supabase.auth.signOut({ scope: "local" });
            if (typeof window !== "undefined") {
                try {
                    const purge = (storage: Storage) => {
                        const keys: string[] = [];
                        for (let i = 0; i < storage.length; i++) {
                            const key = storage.key(i);
                            if (key && (key.startsWith("sb-") || key.startsWith("supabase."))) {
                                keys.push(key);
                            }
                        }
                        keys.forEach((key) => storage.removeItem(key));
                    };
                    purge(window.localStorage);
                    purge(window.sessionStorage);
                } catch {
                    // ignore storage edge cases
                }
            }
        } catch (err) {
            console.error("Logout failed:", err);
        }
        // No `mode` — unlike the vendor centre there is no courier login lane
        // to select. Couriers have no split identity: their courier account is
        // the ordinary account, so `/login` here is the plain customer lane and
        // already correct.
        router.replace("/login");
        router.refresh();
    };

    if (STANDALONE_PATHS.includes(pathname ?? "")) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#f6f8f7] dark:bg-gray-900">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between h-16 px-4 lg:px-8">
                    <div className="flex items-center gap-4">
                        {/* Points at `/`, which on the hub is the pitch (the `/`
                            rewrite) and on the customer host is the storefront.
                            Both are valid destinations for a logo. */}
                        <Link href="/" className="flex items-center gap-2">
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
                            Courier Hub
                        </span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        {/* A deliberate divergence from the vendor centre, which
                            has no link back to the customer site at all. A
                            vendor's shopping session is a *different account*,
                            so sending them to the storefront is a dead end. A
                            courier's is the same account — stranding them would
                            be gratuitous. Absolute, so it resolves to the
                            customer host from either one. */}
                        <Link
                            href={siteUrl("/")}
                            aria-label="Back to GreenPack"
                            title="Back to GreenPack"
                            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span className="hidden sm:inline">Back to GreenPack</span>
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 font-medium transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* The dashboard page carries its own max-width and padding, so the
                shell adds none — it only supplies the page background. */}
            <main>{children}</main>
        </div>
    );
}
