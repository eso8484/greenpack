import Link from "next/link";
import ShopTile from "@/components/home/ShopTile";
import type { Shop } from "@/types";

interface DiscoveryWallProps {
  shops: Shop[];
}

/** Dense "more to love" grid of real shops (the marketplace discovery wall). */
export default function DiscoveryWall({ shops }: DiscoveryWallProps) {
  if (!shops.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-20">
      <div className="flex items-center gap-3 mb-7">
        <span className="material-symbols-outlined text-accent-500 text-3xl fill-1">
          favorite
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          More to love
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {shops.map((shop) => (
          <ShopTile key={shop.id} shop={shop} variant="grid" />
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 px-8 py-3 text-sm font-bold hover:bg-green-500 hover:text-white transition-all"
        >
          Browse all shops
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Link>
      </div>
    </section>
  );
}
