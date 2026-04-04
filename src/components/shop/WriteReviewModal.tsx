"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopName: string;
  shopId?: string;
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  shopName,
  shopId,
}: WriteReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!reviewText.trim() || !reviewerName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    if (shopId) {
      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_id: shopId,
            rating,
            comment: reviewText.trim(),
            customer_name: reviewerName.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(
            typeof json.error === "string" ? json.error : "Failed to submit review"
          );
          setIsSubmitting(false);
          return;
        }
      } catch {
        toast.error("Network error. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    toast.success("Review submitted successfully!", {
      description: "Thank you for your feedback",
    });

    setRating(0);
    setReviewText("");
    setReviewerName("");
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Write a Review
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Share your experience with {shopName}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Rating *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        (hoverRating || rating) >= star
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                      />
                    </svg>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {rating} star{rating > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Reviewer Name */}
            <Input
              id="reviewer-name"
              label="Your Name *"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Enter your name"
              required
            />

            {/* Review Text */}
            <div>
              <label
                htmlFor="review-text"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Your Review *
              </label>
              <textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell us about your experience..."
                rows={5}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum 10 characters ({reviewText.length}/500)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
