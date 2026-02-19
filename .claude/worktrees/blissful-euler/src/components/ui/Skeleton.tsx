import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gray-200/60 dark:bg-gray-800/60",
        className
      )}
    />
  );
}

export function ShopCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/4 rounded-lg" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between pt-2">
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
      <Skeleton className="h-48 md:h-64 w-full rounded-2xl mb-4" />
      <Skeleton className="h-6 w-full max-w-2xl" />
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="p-5 border border-gray-100 dark:border-gray-800 rounded-2xl">
      <Skeleton className="h-5 w-1/3 mb-2" />
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-5 w-24" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
