import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Rating from "@/components/ui/Rating";
import { truncateText } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopCardProps {
  shop: Shop;
}

export default function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link href={`/shop/${shop.id}`}>
      <Card className="h-full hover:border-green-300 transition-colors">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] bg-gray-100">
          <Image
            src={shop.images.thumbnail}
            alt={shop.name}
            fill
            className="object-cover"
            unoptimized
          />
          {/* Video play icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
              <svg
                className="w-5 h-5 text-green-600 ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {/* Verified badge */}
          {shop.isVerified && (
            <div className="absolute top-2 right-2">
              <Badge variant="green">Verified</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 leading-tight">
              {shop.name}
            </h3>
          </div>
          <Badge className="mb-2">{shop.categoryName}</Badge>
          <p className="text-sm text-gray-500 mb-3 leading-relaxed">
            {truncateText(shop.shortDescription, 80)}
          </p>
          <div className="flex items-center justify-between">
            <Rating value={shop.rating} reviewCount={shop.reviewCount} size="sm" />
            <span className="text-xs text-gray-400 flex items-center gap-1">
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
