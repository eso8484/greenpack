import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Rating from "@/components/ui/Rating";
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
            <Rating
              value={shop.rating}
              reviewCount={shop.reviewCount}
              className="[&_span]:text-white"
            />
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
              {shop.location.address}, {shop.location.city}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{shop.description}</p>
    </div>
  );
}
