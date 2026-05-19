"use client";

import Link from "next/link";
import Image from "next/image";
import type { Suggestion } from "@/app/api/search/suggest/route";

interface SearchSuggestionsProps {
  query: string;
  suggestions: Suggestion[];
  isLoading: boolean;
  activeIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  className?: string;
  /** When set, clicking "Search for X" submits the freeform query. */
  onSubmitFreeform?: (query: string) => void;
}

const typeIcons: Record<Suggestion["type"], string> = {
  shop: "storefront",
  service: "design_services",
  product: "shopping_bag",
  category: "category",
};

const typeLabels: Record<Suggestion["type"], string> = {
  shop: "Shop",
  service: "Service",
  product: "Product",
  category: "Category",
};

/**
 * Renders the autocomplete dropdown shown under the search input.
 * Pure presentation — caller owns the query, fetch state, and selection logic.
 */
export default function SearchSuggestions({
  query,
  suggestions,
  isLoading,
  activeIndex,
  onSelect,
  onSubmitFreeform,
  className = "",
}: SearchSuggestionsProps) {
  const trimmed = query.trim();
  if (trimmed.length === 0) return null;

  const hasResults = suggestions.length > 0;

  return (
    <div
      className={`absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 ${className}`}
      role="listbox"
    >
      {isLoading && !hasResults && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <span className="material-symbols-outlined animate-spin text-base align-middle mr-2">
            progress_activity
          </span>
          Searching...
        </div>
      )}

      {!isLoading && !hasResults && (
        <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
            No matches for &ldquo;{trimmed}&rdquo;
          </p>
          <p className="text-xs text-gray-400">
            Try a different spelling, or hit Enter to browse all shops.
          </p>
        </div>
      )}

      {hasResults && (
        <ul className="py-1 max-h-96 overflow-y-auto">
          {suggestions.map((suggestion, idx) => {
            const isActive = idx === activeIndex;
            return (
              <li key={`${suggestion.type}-${suggestion.label}-${idx}`} role="option" aria-selected={isActive}>
                <Link
                  href={suggestion.href}
                  prefetch={false}
                  onMouseDown={(e) => {
                    // mousedown fires before blur — prevents the dropdown from
                    // closing before the click registers
                    e.preventDefault();
                    onSelect(suggestion);
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  {suggestion.image ? (
                    <span className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                      <Image
                        src={suggestion.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="36px"
                        className="object-cover"
                      />
                    </span>
                  ) : suggestion.icon ? (
                    <span className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-lg shrink-0">
                      {suggestion.icon}
                    </span>
                  ) : (
                    <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-500 text-lg">
                        {typeIcons[suggestion.type]}
                      </span>
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {highlight(suggestion.label, trimmed)}
                    </div>
                    {suggestion.sublabel && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {suggestion.sublabel}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0">
                    {typeLabels[suggestion.type]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {onSubmitFreeform && trimmed.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSubmitFreeform(trimmed);
          }}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-sm font-semibold text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="truncate">
            Search all results for &ldquo;{trimmed}&rdquo;
          </span>
          <span className="material-symbols-outlined text-base shrink-0">
            arrow_forward
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Bold the matching portion of a label. Case-insensitive, first-match only.
 * Returns a fragment so React renders the highlighted span inline.
 */
function highlight(label: string, query: string): React.ReactNode {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return label;
  const before = label.slice(0, idx);
  const match = label.slice(idx, idx + query.length);
  const after = label.slice(idx + query.length);
  return (
    <>
      {before}
      <span className="font-bold text-green-600 dark:text-green-400">{match}</span>
      {after}
    </>
  );
}
