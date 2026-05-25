import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopHeaderProps {
  shop: Shop;
}

export default function ShopHeader({ shop }: ShopHeaderProps) {
  const addressIsCoords = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(
    (shop.location.address || "").trim()
  );
  const locationLabel = addressIsCoords
    ? shop.location.city
    : [shop.location.address, shop.location.city].filter(Boolean).join(", ");

  return (
    <div>
      {/* Banner */}
      <div className="relative h-52 md:h-72 rounded-2xl md:rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Image
          src={shop.images.banner}
          alt={shop.name}
          fill
          sizes="100vw"
          className="object-cover"
          unoptimized
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {shop.categoryName && (
              <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold text-white border border-white/15">
                {shop.categoryName}
              </span>
            )}
            {shop.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/90 backdrop-blur px-3 py-1 text-xs font-bold text-white">
                <span className="material-symbols-outlined text-[14px] fill-1">verified</span>
                Certified
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            {shop.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/85">
            {shop.rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                <span className="material-symbols-outlined text-amber-300 text-[18px] fill-1">star</span>
                {shop.rating.toFixed(1)}
                <span className="font-normal text-white/60">({shop.reviewCount})</span>
              </span>
            )}
            {locationLabel && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
                {locationLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <a
          href="#services"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-green-500/25 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">design_services</span>
          View Services
        </a>
        <a
          href="#products"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-bold text-sm px-6 py-3 rounded-xl shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
          Shop Products
        </a>
      </div>

      {/* Description */}
      {shop.description && (
        <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">
          {shop.description}
        </p>
      )}
    </div>
  );
}
