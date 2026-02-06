import Link from "next/link";
import ShopCard from "@/components/browse/ShopCard";
import { getFeaturedShops } from "@/lib/utils";

export default function FeaturedShops() {
  const featured = getFeaturedShops();

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Shops</h2>
          <Link
            href="/browse"
            className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            View All &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.slice(0, 6).map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      </div>
    </section>
  );
}
