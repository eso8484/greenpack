"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ShopError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">🏪</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Shop Unavailable
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          This shop couldn&apos;t be loaded right now. It may be temporarily
          unavailable or the link may have changed.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Link href="/browse">
            <Button variant="outline">Browse Shops</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
