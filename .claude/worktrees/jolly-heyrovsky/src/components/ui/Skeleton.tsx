import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ShopHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-48 md:h-64 w-full rounded-xl mb-4" />
      <Skeleton className="h-6 w-full max-w-2xl" />
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
      <Skeleton className="h-5 w-1/3 mb-2" />
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
