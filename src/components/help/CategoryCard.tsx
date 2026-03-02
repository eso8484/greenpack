"use client";

import { motion } from "framer-motion";
import { FAQCategory } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: FAQCategory;
  onClick: () => void;
  className?: string;
}

export default function CategoryCard({
  category,
  onClick,
  className,
}: CategoryCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-all hover:shadow-lg dark:hover:shadow-green-500/10 focus:outline-none focus:ring-2 focus:ring-green-400 dark:focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-2xl shrink-0">
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white mb-1 text-lg">
            {category.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {category.description}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0 mt-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </motion.button>
  );
}
