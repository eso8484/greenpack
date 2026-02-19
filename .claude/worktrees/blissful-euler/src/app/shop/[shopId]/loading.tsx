import {
  ShopHeaderSkeleton,
  ServiceCardSkeleton,
  ProductCardSkeleton,
} from "@/components/ui/Skeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function ShopLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ShopHeaderSkeleton />

      <div className="mt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-8">
          {/* Video skeleton */}
          <Skeleton className="aspect-video w-full rounded-xl" />

          {/* Services skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Products skeleton */}
          <div>
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar skeleton */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
