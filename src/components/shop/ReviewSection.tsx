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
    <section className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px] fill-1">reviews</span>
            Reviews
          </span>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Customer reviews
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 px-3 py-2">
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
