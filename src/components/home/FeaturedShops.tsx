import Link from "next/link";
import ShopCard from "@/components/browse/ShopCard";
import type { Shop } from "@/types";

interface FeaturedShopsProps {
  shops: Shop[];
}

export default function FeaturedShops({ shops }: FeaturedShopsProps) {
  if (!shops.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-20">
      <div className="flex items-end justify-between mb-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px] fill-1">workspace_premium</span>
            Featured
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Featured businesses
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            Hand-picked shops that passed our community trust check.
          </p>
        </div>
        <Link
          href="/browse?verified=true"
          className="hidden md:inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-bold group shrink-0"
        >
          See all
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {shops.slice(0, 6).map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    </section>
  );
}
