import Rating from "@/components/ui/Rating";
import type { Review } from "@/types";

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="p-4 md:p-5 rounded-2xl bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/70">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-sm">
            <span className="text-sm font-bold">
              {review.customerName.charAt(0).toUpperCase()}
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
