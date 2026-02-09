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
        <span className="font-medium text-gray-900 dark:text-white">{totalResults}</span>{" "}
        {totalResults === 1 ? "shop" : "shops"} found
      </p>

      {/* Mobile category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 sm:hidden scrollbar-hide">
        <button
          onClick={() => updateParam("category", "")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            !currentCategory
              ? "bg-green-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => updateParam("category", cat.slug)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              currentCategory === cat.slug
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 focus:outline-none cursor-pointer"
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="rating">Sort: Highest Rated</option>
        <option value="newest">Sort: Newest</option>
      </select>
    </div>
  );
}
