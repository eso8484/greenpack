"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestions from "@/components/layout/SearchSuggestions";
import { categories } from "@/lib/data/categories";
import type { Suggestion } from "@/app/api/search/suggest/route";

export default function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { suggestions, isLoading } = useSearchSuggestions(query);

  // Derived-during-render reset to satisfy `react-hooks/set-state-in-effect`.
  const [trackedSuggestions, setTrackedSuggestions] = useState(suggestions);
  if (trackedSuggestions !== suggestions) {
    setTrackedSuggestions(suggestions);
    setActiveIndex(-1);
  }

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

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      handleSelect(suggestions[activeIndex]);
      return;
    }
    if (query.trim()) submitFreeform(query);
    else router.push("/browse");
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
    <section className="relative w-full overflow-hidden bg-mesh-green">
      {/* Decorative layers */}
      <div className="absolute inset-0 bg-grid-faint opacity-60" aria-hidden />
      <div
        className="absolute -top-24 -left-20 w-[34rem] h-[34rem] rounded-full bg-green-500/25 blur-3xl animate-float-slow"
        aria-hidden
      />
      <div
        className="absolute -bottom-32 -right-16 w-[30rem] h-[30rem] rounded-full bg-accent-500/15 blur-3xl animate-float"
        aria-hidden
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-16 md:pt-32 md:pb-24 text-center">
        {/* Eyebrow */}
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-semibold text-green-50 mb-6">
          <span className="material-symbols-outlined text-[15px] fill-1 text-green-300">
            verified
          </span>
          Verified local shops &amp; services
        </span>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight">
          Discover the best <br className="hidden sm:block" />
          <span className="text-gradient-green">near you</span>
        </h1>
        <p className="mt-5 text-base md:text-xl text-green-50/85 max-w-2xl mx-auto font-medium">
          Connecting you with trusted local services and authentic shops in your
          neighborhood — all in one place.
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="mt-9 bg-white/95 dark:bg-gray-900/90 backdrop-blur-md p-2 md:p-2.5 rounded-2xl shadow-2xl shadow-black/30 ring-1 ring-white/30 flex items-center gap-2 max-w-2xl mx-auto"
        >
          <div ref={containerRef} className="flex-1 relative">
            <div className="flex items-center px-4 gap-3">
              <span className="material-symbols-outlined text-gray-400 pointer-events-none">
                search
              </span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 py-3.5 text-sm md:text-base"
                placeholder="Search shops, services, products..."
                type="text"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                aria-label="Search shops, services and products"
                aria-autocomplete="list"
                aria-expanded={open}
              />
            </div>
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
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-400 text-white px-6 md:px-10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm cursor-pointer shrink-0 shadow-lg shadow-green-500/30"
          >
            <span className="material-symbols-outlined text-[18px] md:hidden">search</span>
            <span className="hidden md:inline">Search Now</span>
          </button>
        </form>

        {/* Quick category chips — real categories */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-green-50/70">Popular:</span>
          {categories.slice(0, 5).map((cat) => (
            <Link
              key={cat.id}
              href={`/browse?category=${cat.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              <span className="text-sm leading-none">{cat.icon}</span>
              {cat.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
