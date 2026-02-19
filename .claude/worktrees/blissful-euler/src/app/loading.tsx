import { ShopCardSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-green-600 to-green-400 rounded-xl h-64 mb-12 animate-pulse" />

      {/* Featured shops skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShopCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
