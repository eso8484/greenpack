"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// The vendor host rewrites its clean URLs (`/products`) onto these `/seller/*`
// routes, so the same page can report either form from usePathname(). Compare
// with the prefix stripped so the active-link highlight survives both.
const normalizePath = (path: string) => path.replace(/^\/seller/, "") || "/";

// `shortLabel` is what the mobile bottom nav renders. Six items at `px-3` with
// "Payout Account" and "Elite Partner" as written would wrap or overflow on a
// 360px screen; the desktop sidebar has room for the full names, the tab bar
// does not. Every entry carries one so the array stays a single shape.
const sidebarLinks = [
    {
        label: "Dashboard",
        shortLabel: "Home",
        href: "/seller/dashboard",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        label: "My Shop",
        shortLabel: "Shop",
        href: "/seller/shop",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        label: "Services",
        shortLabel: "Services",
        href: "/seller/services",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        ),
    },
    {
        label: "Products",
        shortLabel: "Products",
        href: "/seller/products",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        ),
    },
    {
        label: "Payout Account",
        shortLabel: "Payout",
        href: "/seller/payout",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm11 8h2" />
            </svg>
        ),
    },
    {
        // Visible to every vendor, elite or not. The entry point has to be
        // here for the tier to read as open rather than invitation-only.
        label: "Elite Partner",
        shortLabel: "Elite",
        href: "/seller/elite",
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
            </svg>
        ),
    },
];

export default function SellerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const handleLogout = async () => {
        try {
            const supabase = createClient();
            // Local scope, never global. The vendor center runs on its own
            // hostname with its own host-only session cookie, so a vendor
            // logout must not revoke the refresh token server-side — that would
            // also sign the same person out of the customer site, which is
            // exactly the coupling the subdomain split exists to remove.
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
        // Vendor sign-out belongs on the vendor sign-in screen, not the customer
        // one. ?mode=vendor puts the login page in its vendor lane.
        router.replace("/login?mode=vendor");
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-[#eef1f5] dark:bg-gray-900">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between h-16 px-4 lg:px-8">
                    <div className="flex items-center gap-4">
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
                            Seller Dashboard
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            S
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="hidden md:flex md:w-60 lg:w-64 flex-col fixed top-16 bottom-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                    <nav className="flex-1 px-3 py-6 space-y-1">
                        {sidebarLinks.map((link) => {
                            const isActive = normalizePath(pathname) === normalizePath(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                                    )}
                                >
                                    {link.icon}
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
                </aside>

                {/* Mobile Bottom Nav */}
                {/*
                  Six tabs on a 360px screen is 60px each, which `justify-around`
                  with per-item `px-3` cannot fit — "Payout Account" and "Elite
                  Partner" would wrap to two lines and push the bar taller. So
                  the row is `flex-1` per item (an even six-way split, no
                  rounding slack), the padding drops to `px-1`, and each label
                  renders its `shortLabel` inside a truncating span. The
                  truncation is a backstop, not the mechanism: the short labels
                  are chosen to fit, so nothing should actually ellipsise.
                */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="flex py-2">
                        {sidebarLinks.map((link) => {
                            const isActive = normalizePath(pathname) === normalizePath(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    title={link.label}
                                    className={cn(
                                        "flex flex-1 min-w-0 flex-col items-center gap-1 px-1 py-1 text-xs font-medium transition-colors",
                                        isActive
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    )}
                                >
                                    {link.icon}
                                    <span className="w-full truncate text-center">
                                        {link.shortLabel}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 md:ml-60 lg:ml-64 p-4 lg:p-8 pb-20 md:pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
