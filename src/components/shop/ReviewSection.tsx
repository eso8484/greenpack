import ReviewCard from "./ReviewCard";
import Rating from "@/components/ui/Rating";
import { calculateAverageRating } from "@/lib/utils";
import type { Review } from "@/types";

interface ReviewSectionProps {
  reviews: Review[];
}

export default function ReviewSection({ reviews }: ReviewSectionProps) {
  if (reviews.length === 0) return null;

  const avgRating = calculateAverageRating(reviews);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Reviews</h2>
        <div className="flex items-center gap-2">
          <Rating value={avgRating} />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}
