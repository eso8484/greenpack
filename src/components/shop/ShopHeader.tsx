import Image from "next/image";
import Badge from "@/components/ui/Badge";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopHeaderProps {
  shop: Shop;
}

export default function ShopHeader({ shop }: ShopHeaderProps) {

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
        <Image
          src={shop.images.banner}
          alt={shop.name}
          fill
          className="object-cover"
          unoptimized
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {shop.name}
            </h1>
            {shop.isVerified && <Badge variant="green">Verified</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{shop.categoryName}</Badge>
            <span className="text-sm text-white/80 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test((shop.location.address || "").trim())
                ? shop.location.city
                : [shop.location.address, shop.location.city].filter(Boolean).join(", ")}
            </span>
          </div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="#services"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          View Services
        </a>
        <a
          href="#products"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Shop Products
        </a>
      </div>

      {/* Description */}
      <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{shop.description}</p>
    </div>
  );
}
