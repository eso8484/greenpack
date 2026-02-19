import Link from "next/link";
import ShopCard from "@/components/browse/ShopCard";
import { getFeaturedShops } from "@/lib/utils";

export default function FeaturedShops() {
  const featured = getFeaturedShops();

  return (
    <section className="py-14 bg-gray-50 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="inline-block text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
              Community Verified
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Featured Businesses
            </h2>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              Every business here has passed our 12-point community trust check.
            </p>
          </div>
          <Link
            href="/browse"
            className="hidden md:inline-flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors group"
          >
            View All
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {featured.slice(0, 6).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </div>
    </section>
  );
}
