import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Rating from "@/components/ui/Rating";
import { truncateText, BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopCardProps {
  shop: Shop;
}

export default function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shop/${shop.id}`}>
      <Card className="h-full overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
        {/* Thumbnail */}
        <div className="relative h-36 md:h-56 overflow-hidden">
          <Image
            src={shop.images.thumbnail}
            alt={shop.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
          {/* Green Certified badge */}
          {shop.isVerified && (
            <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded-full flex items-center gap-1 shadow-sm">
              <span className="material-symbols-outlined text-green-500 text-xs md:text-sm fill-1">
                verified
              </span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                Certified
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 mb-1 md:mb-2">
            <h3 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
              {shop.name}
            </h3>
            <Rating value={shop.rating} reviewCount={shop.reviewCount} size="sm" />
          </div>
          <p className="hidden md:block text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
            {truncateText(shop.shortDescription, 100)}
          </p>
          <div className="flex items-center gap-1 text-gray-400 text-[10px] md:text-xs font-medium mb-3 md:mb-6">
            <span className="material-symbols-outlined text-xs md:text-sm">
              location_on
            </span>
            <span className="line-clamp-1">
              {shop.location.address}, {shop.location.city}
            </span>
          </div>
          <button className="w-full py-2 md:py-3 border-2 border-green-500 text-green-600 dark:text-green-400 font-bold rounded-lg md:rounded-xl hover:bg-green-500 hover:text-white transition-all text-xs md:text-sm cursor-pointer">
            View Services
          </button>
        </div>
      </Card>
    </Link>
  );
}
