import Link from "next/link";
import ShopTile from "@/components/home/ShopTile";
import type { Shop } from "@/types";

interface TrendingShopsProps {
  shops: Shop[];
}

/**
 * Horizontal "deals" rail of top-rated shops. Presentational — receives an
 * already-sorted list of real shops from the page. The "Top rated" badge is
 * applied to the highest-rated entries only (and only when they actually have
 * a rating), so nothing is fabricated.
 */
export default function TrendingShops({ shops }: TrendingShopsProps) {
  if (!shops.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-20">
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px] fill-1">local_fire_department</span>
            Trending now
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Top rated near you
          </h2>
        </div>
        <Link
          href="/browse?sort=rating"
          className="hidden md:inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-bold group shrink-0"
        >
          See all
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar snap-x pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        {shops.map((shop, i) => (
          <ShopTile
            key={shop.id}
            shop={shop}
            variant="rail"
            badge={i < 3 && shop.rating >= 4.5 ? "Top rated" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
