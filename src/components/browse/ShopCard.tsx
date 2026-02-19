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
        <div className="relative h-56 overflow-hidden">
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
            <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="material-symbols-outlined text-green-500 text-sm fill-1">
                verified
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                Green Certified
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {shop.name}
            </h3>
            <Rating value={shop.rating} reviewCount={shop.reviewCount} size="sm" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
            {truncateText(shop.shortDescription, 100)}
          </p>
          <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-6">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>{" "}
            {shop.location.address}, {shop.location.city}
          </div>
          <button className="w-full py-3 border-2 border-green-500 text-green-600 dark:text-green-400 font-bold rounded-xl hover:bg-green-500 hover:text-white transition-all text-sm cursor-pointer">
            View Services
          </button>
        </div>
      </Card>
    </Link>
  );
}
