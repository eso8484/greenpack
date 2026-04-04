"use client";

import { useWishlist } from "@/hooks/useWishlist";
import { WishlistItemType } from "@/context/WishlistContext";
import { Shop, Product } from "@/types";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface WishlistButtonProps {
  id: string;
  type: WishlistItemType;
  data: Shop | Product;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function WishlistButton({
  id,
  type,
  data,
  className = "",
  size = "md",
}: WishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(id, type);

  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id, type, data);

    if (!inWishlist) {
      toast.success(
        `Added to wishlist`,
        {
          description: type === "shop"
            ? `${(data as Shop).name}`
            : `${(data as Product).name}`,
        }
      );
    } else {
      toast.info("Removed from wishlist");
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className={`${sizes[size]} rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:scale-110 transition-transform shadow-sm ${className}`}
      whileTap={{ scale: 0.9 }}
      aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
    >
      {inWishlist ? (
        <svg
          className={`${iconSizes[size]} text-red-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg
          className={`${iconSizes[size]} text-gray-400 dark:text-gray-500`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </motion.button>
  );
}
