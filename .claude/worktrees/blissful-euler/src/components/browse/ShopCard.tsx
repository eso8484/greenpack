import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Rating from "@/components/ui/Rating";
import { truncateText, BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopCardProps {
  shop: Shop;
}

export default function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shop/${shop.id}`}>
      <Card className="h-full group">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <Image
            src={shop.images.thumbnail}
            alt={shop.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Video play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 shadow-lg">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <Badge variant="default" className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 shadow-sm">
              {shop.categoryName.split(" & ")[0]}
            </Badge>
            {shop.isVerified && (
              <Badge variant="green" dot className="bg-green-500/90 backdrop-blur-sm text-white ring-0 shadow-sm">
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 md:p-5">
          <h3 className="font-bold text-gray-900 dark:text-white leading-tight text-base">
            {shop.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 mb-3 leading-relaxed">
            {truncateText(shop.shortDescription, 80)}
          </p>
          <div className="flex items-center justify-between">
            <Rating value={shop.rating} reviewCount={shop.reviewCount} size="sm" />
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
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
              {shop.location.city}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
