import Link from "next/link";
import Image from "next/image";
import { BLUR_PLACEHOLDER, truncateText } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopTileProps {
  shop: Shop;
  /** "rail" = fixed width for horizontal carousels; "grid" = fills its cell. */
  variant?: "rail" | "grid";
  /** Optional warm badge text shown top-right (e.g. "Top rated", "New"). */
  badge?: string;
}

/**
 * Compact, marketplace-style shop card. Presentational only — every value
 * comes from the real Shop record. Used by the Trending rail and Discovery wall.
 */
export default function ShopTile({ shop, variant = "grid", badge }: ShopTileProps) {
  const hasRating = shop.rating > 0;

  return (
    <Link
      href={`/shop/${shop.id}`}
      className={`group relative flex flex-col rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/70 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1 transition-all duration-300 ${
        variant === "rail" ? "w-[200px] md:w-[230px] shrink-0 snap-start" : "w-full"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-900">
        <Image
          src={shop.images.thumbnail}
          alt={shop.name}
          fill
          sizes="(max-width: 768px) 50vw, 230px"
          className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          unoptimized
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        {/* gradient scrim for legibility of overlaid chips */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {shop.isVerified && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm">
            <span className="material-symbols-outlined text-green-500 text-[13px] fill-1">
              verified
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
              Certified
            </span>
          </span>
        )}

        {badge && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-accent-500 text-white px-2 py-0.5 rounded-full shadow-sm text-[10px] font-bold uppercase tracking-wide">
            <span className="material-symbols-outlined text-[13px] fill-1">local_fire_department</span>
            {badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3">
        {shop.categoryName && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1 line-clamp-1">
            {shop.categoryName}
          </span>
        )}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
          {shop.name}
        </h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-snug min-h-[2rem]">
          {truncateText(shop.shortDescription || shop.description, 64)}
        </p>

        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
          {hasRating ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-900 dark:text-white tabular-nums">
              <span className="material-symbols-outlined text-amber-400 text-[15px] fill-1">
                star
              </span>
              {shop.rating.toFixed(1)}
              <span className="font-medium text-gray-400 dark:text-gray-500">
                ({shop.reviewCount})
              </span>
            </span>
          ) : (
            <span className="text-xs font-medium text-gray-400">New</span>
          )}

          {shop.location.city && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500 line-clamp-1 max-w-[55%]">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              <span className="truncate">{shop.location.city}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
