"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

/**
 * Vendor registration entry point. The "Register Your Business" buttons on
 * /sell point here so that the path is clearly separate from the customer
 * registration flow at /register.
 *
 * Routing:
 *   - Unauthenticated → /signup?role=vendor&redirect=/seller/shop
 *   - Authenticated (customer/vendor) → /seller/shop (which is the shop form;
 *     POST flips role to vendor on first save)
 *   - Authenticated vendor with role already vendor → /seller/shop too — the
 *     form decides whether it's create or edit based on the existing row.
 */
export default function SellerOnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/signup?role=vendor&redirect=/seller/shop");
      return;
    }

    router.replace("/seller/shop");
  }, [isLoading, user, router]);

  return (
    <div className="min-h-screen bg-[#f6f8f7] dark:bg-[#122017] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Starting Vendor Registration...
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          We&apos;re setting up your business onboarding.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Taking too long?{" "}
          <Link
            href="/signup?role=vendor&redirect=/seller/shop"
            className="text-green-600 dark:text-green-400 font-semibold hover:underline"
          >
            Continue manually →
          </Link>
        </p>
      </div>
    </div>
  );
}
