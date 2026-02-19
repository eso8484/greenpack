import Link from "next/link";
import ShopCard from "@/components/browse/ShopCard";
import { getFeaturedShops } from "@/lib/utils";

export default function FeaturedShops() {
  const featured = getFeaturedShops();

  return (
    <section className="bg-white dark:bg-gray-900/50 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-sm fill-1">
              verified
            </span>{" "}
            Verified &amp; Trusted
          </div>
          <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            Featured Businesses
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl">
            Every business in this section has passed our 12-point community
            trust check.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {featured.slice(0, 6).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </div>
    </section>
  );
}
