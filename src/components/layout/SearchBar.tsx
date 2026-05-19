"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestions from "./SearchSuggestions";
import type { Suggestion } from "@/app/api/search/suggest/route";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

export default function SearchBar({
  className,
  placeholder = "Search shops, services...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { suggestions, isLoading } = useSearchSuggestions(query);

  // Reset highlight whenever the suggestion list changes. Derived during
  // render with a tracker state so we don't violate React 19's
  // `react-hooks/set-state-in-effect` rule.
  const [trackedSuggestions, setTrackedSuggestions] = useState(suggestions);
  if (trackedSuggestions !== suggestions) {
    setTrackedSuggestions(suggestions);
    setActiveIndex(-1);
  }

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  const submitFreeform = useCallback(
    (q: string) => {
      setOpen(false);
      router.push(`/browse?q=${encodeURIComponent(q.trim())}`);
    },
    [router]
  );

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      setOpen(false);
      setQuery("");
      router.push(suggestion.href);
    },
    [router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      handleSelect(suggestions[activeIndex]);
      return;
    }
    if (query.trim()) submitFreeform(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((idx) => Math.min(suggestions.length - 1, idx + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((idx) => Math.max(-1, idx - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="relative" ref={containerRef}>
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors"
        />
        {open && query.trim().length > 0 && (
          <SearchSuggestions
            query={query}
            suggestions={suggestions}
            isLoading={isLoading}
            activeIndex={activeIndex}
            onSelect={handleSelect}
            onSubmitFreeform={submitFreeform}
          />
        )}
      </div>
    </form>
  );
}
