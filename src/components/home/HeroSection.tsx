"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestions from "@/components/layout/SearchSuggestions";
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
    <section
      className="relative w-full flex items-center justify-center px-6 overflow-hidden hero-gradient"
      style={{ height: 640 }}
    >
      <div className="absolute inset-0 bg-green-500/10" />

      <div className="relative z-10 max-w-4xl w-full text-center transition-all duration-1000 opacity-100 translate-y-0">
        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6 tracking-tight">
          Discover the best <br />
          <span className="text-green-400">near you</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-100/90 mb-10 max-w-2xl mx-auto font-medium">
          Connecting you with trusted local services and authentic shops in your
          neighborhood.
        </p>

        <form
          onSubmit={handleSearch}
          className="bg-white dark:bg-gray-900 p-2 md:p-3 rounded-2xl shadow-2xl flex items-center gap-2 max-w-2xl mx-auto border border-white/20"
        >
          <div ref={containerRef} className="flex-1 relative">
            <div className="flex items-center px-4 gap-3">
              <span className="material-symbols-outlined text-gray-400 pointer-events-none">
                search
              </span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-400 py-4 text-sm"
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
            className="bg-green-500 text-white px-8 md:px-10 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all text-sm cursor-pointer shrink-0"
          >
            Search Now
          </button>
        </form>
      </div>
    </section>
  );
}
