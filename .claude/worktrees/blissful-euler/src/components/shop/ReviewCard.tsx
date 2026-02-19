import Rating from "@/components/ui/Rating";
import type { Review } from "@/types";

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {review.customerName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {review.customerName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(review.date).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <Rating value={review.rating} size="sm" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>
    </div>
  );
}
