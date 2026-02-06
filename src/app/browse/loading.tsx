import { ShopCardSkeleton } from "@/components/ui/Skeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function BrowseLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />

      <div className="flex gap-8">
        {/* Sidebar skeleton */}
        <div className="hidden md:block w-64 shrink-0 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-10 w-full mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
