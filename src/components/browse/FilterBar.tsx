"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { categories, getGroupBySlug } from "@/lib/data/categories";

interface FilterBarProps {
  totalResults: number;
}

export default function FilterBar({ totalResults }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "relevance";
  const currentCategory = searchParams.get("category") || "";
  const currentGroup = searchParams.get("group") || "";
  const group = currentGroup ? getGroupBySlug(currentGroup) : undefined;

  // What the collapsed disclosure names, so closing it does not also hide *where
  // you are*. The group wins over the leaf for the same reason browse/page.tsx's
  // `scope` does — they are two views of one filter. Both shapes carry `icon` and
  // `name`, so the union reads the same either way.
  const activeScope =
    group ?? categories.find((cat) => cat.slug === currentCategory);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/browse?${params.toString()}`);
  };

  // The group and the leaf are two views of one scope, so "All" has to drop
  // both — clearing only `category` would leave a stale `?group=` filtering
  // the results while the pill reads "All".
  const clearScope = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    params.delete("group");
    router.push(`/browse?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <span className="font-black text-green-600 dark:text-green-400 tabular-nums">{totalResults}</span>{" "}
        {totalResults === 1 ? "shop" : "shops"} found
      </p>

      {/* Mobile category pills — now behind a disclosure, for the same reason
          `/browse`'s sidebar panel is: 45 pills rendered on arrival is the
          user's reported complaint, and below `lg` there is no hover to reveal
          anything with, so the honest equivalent is "closed until asked".

          A native `<details>`, matching the drawer `MobileNav` already uses, so
          there is no state and no JS — `FilterBar` is a Client Component only
          because it reads the search params. The browser owns open/closed.

          Still all 45 leaves inside. The group stays a way *in* rather than a
          replacement: there is no room to nest three levels on a phone, so the
          group appears as one extra chip at the head.

          Hidden at `lg`, matching the sidebar's own breakpoint — and the reason
          is hover, not width. The sidebar could fit at `md` now that it is only
          216px, but its reveal is `:hover` only, and a 768px viewport is a
          tablet: a rail there would show nine group links with no way to reach
          the 45 leaves, so the pills have to stay the leaf navigation below
          `lg`. At 640–1023px these pills are therefore the *only* category
          navigation, which is why the cutoff is `lg` rather than `sm`.

          The scope badge in the summary is the whole point of the label: a
          collapsed control that hides *what is currently filtered* would trade
          one confusion for another. */}
      <details className="group lg:hidden">
        <summary className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:border-green-500/60">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-gray-400">
            category
          </span>
          <span>Categories</span>
          {activeScope && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
              <span aria-hidden="true">{activeScope.icon}</span>
              {activeScope.name}
            </span>
          )}
          <span
            aria-hidden="true"
            className="material-symbols-outlined ml-auto text-[18px] text-gray-400 transition-transform group-open:rotate-180"
          >
            expand_more
          </span>
        </summary>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={clearScope}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              !currentCategory && !currentGroup
                ? "bg-green-500 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            All
          </button>
          {group && (
            <button
              onClick={() => updateParam("group", "")}
              aria-label={`Stop showing all of ${group.name}`}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                !currentCategory
                  ? "bg-green-500 text-white"
                  : "bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 border border-green-500/40"
              }`}
            >
              {group.icon} {group.name}
              <span className="ml-1.5 opacity-70">✕</span>
            </button>
          )}
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
      </details>

      {/* Sort dropdown */}
      <select
        value={currentSort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 focus:outline-none cursor-pointer"
      >
        <option value="relevance">Sort: Relevance</option>
        <option value="rating">Sort: Highest Rated</option>
        <option value="newest">Sort: Newest</option>
      </select>
    </div>
  );
}
