import Link from "next/link";
import Image from "next/image";
import { truncateText, BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopCardProps {
  shop: Shop;
}

export default function ShopCard({ shop }: ShopCardProps) {
  const hasRating = shop.rating > 0;

  return (
    <Link
      href={`/shop/${shop.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/70 shadow-sm hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative h-36 md:h-52 overflow-hidden bg-gray-100 dark:bg-gray-900">
        <Image
          src={shop.images.thumbnail}
          alt={shop.name}
          fill
          sizes="(max-width: 768px) 50vw, 380px"
          className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          unoptimized
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {shop.isVerified && (
          <span className="absolute top-2 left-2 md:top-3 md:left-3 inline-flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 md:px-2.5 md:py-1 rounded-full shadow-sm">
            <span className="material-symbols-outlined text-green-500 text-xs md:text-sm fill-1">
              verified
            </span>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
              Certified
            </span>
          </span>
        )}

        {hasRating && (
          <span className="absolute top-2 right-2 md:top-3 md:right-3 inline-flex items-center gap-1 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-full text-white text-[11px] md:text-xs font-bold tabular-nums">
            <span className="material-symbols-outlined text-amber-300 text-[13px] md:text-[15px] fill-1">
              star
            </span>
            {shop.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3 md:p-5">
        {shop.categoryName && (
          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1 line-clamp-1">
            {shop.categoryName}
          </span>
        )}
        <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
          {shop.name}
        </h3>
        <p className="hidden md:block text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">
          {truncateText(shop.shortDescription || shop.description, 100)}
        </p>

        <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 text-[10px] md:text-xs font-medium mt-2 mb-3 md:mb-4">
          <span className="material-symbols-outlined text-xs md:text-sm">location_on</span>
          <span className="line-clamp-1">
            {[shop.location.address, shop.location.city].filter(Boolean).join(", ")}
          </span>
        </div>

        <span className="mt-auto block w-full py-2 md:py-2.5 text-center border-2 border-green-500 text-green-600 dark:text-green-400 font-bold rounded-lg md:rounded-xl group-hover:bg-green-500 group-hover:text-white transition-all text-xs md:text-sm">
          View shop
        </span>
      </div>
    </Link>
  );
}
