"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories } from "@/lib/data/categories";

interface FilterBarProps {
  totalResults: number;
}

export default function FilterBar({ totalResults }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "relevance";
  const currentCategory = searchParams.get("category") || "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-bold text-gray-900 dark:text-white">{totalResults}</span>{" "}
        {totalResults === 1 ? "shop" : "shops"} found
      </p>

      {/* Mobile category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden scrollbar-hide">
        <button
          onClick={() => updateParam("category", "")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            !currentCategory
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green"
              : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam("category", cat.slug)}
            className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              currentCategory === cat.slug
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <select
        value={currentSort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 focus:outline-none cursor-pointer font-medium"
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="rating">Sort: Highest Rated</option>
        <option value="newest">Sort: Newest</option>
      </select>
    </div>
  );
}
