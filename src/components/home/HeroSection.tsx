"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import SearchSuggestions from "@/components/layout/SearchSuggestions";
import { categories } from "@/lib/data/categories";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Suggestion } from "@/app/api/search/suggest/route";

export type HeroDeal = {
  id: string;
  name: string;
  href: string;
  image: string;
  category: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  /** Real "% off" computed from product originalPrice vs price (when available). */
  discountPct?: number;
};

const AUTO_ADVANCE_MS = 5500;

/** Truthful promo badge for a deal slide (no fabricated numbers). */
function dealBadge(deal: HeroDeal): { label: string; icon: string } {
  if (deal.discountPct && deal.discountPct > 0) {
    return { label: `Up to ${deal.discountPct}% off`, icon: "sell" };
  }
  if (deal.isFeatured) return { label: "Featured deal", icon: "workspace_premium" };
  if (deal.rating >= 4.5) return { label: "Top rated", icon: "star" };
  if (deal.isVerified) return { label: "Verified shop", icon: "verified" };
  return { label: "Discover", icon: "local_fire_department" };
}

/** Truthful one-line marketing tagline derived from real attributes. */
function dealTagline(deal: HeroDeal): string {
  if (deal.discountPct && deal.discountPct > 0) {
    return "Limited-time savings on real products — shop before they're gone.";
  }
  if (deal.rating >= 4.5) {
    return `Loved by the community${deal.category ? ` for ${deal.category.toLowerCase()}` : ""}.`;
  }
  if (deal.isVerified) {
    return "A certified local business you can trust.";
  }
  return "Discover what this local shop has to offer.";
}

export default function HeroSection({ deals = [] }: { deals?: HeroDeal[] }) {
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

  // ─── Full-screen carousel ──────────────────────────────────────────────
  // Slide 0 is the brand/search slide; the rest are real shop deals.
  const slideCount = 1 + deals.length;
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const brandActive = slide === 0;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const goTo = useCallback(
    (n: number) => setSlide(((n % slideCount) + slideCount) % slideCount),
    [slideCount]
  );

  // Pause auto-advance on hover, when the search is engaged, or reduced-motion.
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const halt = paused || open || reduced || slideCount <= 1;
  useEffect(() => {
    if (halt) return;
    const id = setInterval(() => goTo(slideRef.current + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [halt, goTo]);

  // Content reveal transition per slide.
  const reveal = (on: boolean) =>
    `transition-all duration-700 ease-out ${
      on ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
    }`;

  return (
    <section
      // Raised z-index so the search dropdown can overflow and overlay the
      // section below; no overflow-hidden here (would clip the dropdown).
      className="relative z-20 w-full h-[600px] md:h-[680px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured highlights and deals"
    >
      {/* ── Slide 0 — brand + search (original hero image) ── */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          brandActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
        }`}
        aria-hidden={!brandActive}
        inert={!brandActive}
      >
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-grid-faint opacity-30" aria-hidden />

        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className={`w-full max-w-4xl text-center ${reveal(brandActive)}`}>
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
              Connecting you with trusted local services and authentic shops in
              your neighborhood — all in one place.
            </p>

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
                    tabIndex={brandActive ? 0 : -1}
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
                tabIndex={brandActive ? 0 : -1}
                className="bg-green-500 hover:bg-green-400 text-white px-6 md:px-10 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm cursor-pointer shrink-0 shadow-lg shadow-green-500/30"
              >
                <span className="material-symbols-outlined text-[18px] md:hidden">
                  search
                </span>
                <span className="hidden md:inline">Search Now</span>
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-green-50/70">Popular:</span>
              {categories.slice(0, 5).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/browse?category=${cat.slug}`}
                  tabIndex={brandActive ? 0 : -1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                >
                  <span className="text-sm leading-none">{cat.icon}</span>
                  {cat.name.split(" ")[0]}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Deal slides — real shops on their own images ── */}
      {deals.map((deal, i) => {
        const idx = i + 1;
        const active = slide === idx;
        const badge = dealBadge(deal);
        return (
          <div
            key={deal.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
            aria-hidden={!active}
            inert={!active}
          >
            <Image
              src={deal.image}
              alt=""
              fill
              sizes="100vw"
              className={`object-cover transition-transform ease-out duration-[6000ms] ${
                active && !reduced ? "scale-110" : "scale-100"
              }`}
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
            {/* legibility + brand tint */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
            <div className="absolute inset-0 bg-green-950/30" />
            <div className="absolute inset-0 bg-grid-faint opacity-20" aria-hidden />

            <div className="absolute inset-0 flex items-center justify-center px-6">
              <div className={`w-full max-w-3xl text-center ${reveal(active)}`}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg shadow-accent-500/30">
                  <span className="material-symbols-outlined text-[15px] fill-1">
                    {badge.icon}
                  </span>
                  {badge.label}
                </span>

                {deal.category && (
                  <p className="mt-4 text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-green-300">
                    {deal.category}
                  </p>
                )}

                <h2 className="mt-2 text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight">
                  {deal.name}
                </h2>

                <p className="mt-4 text-base md:text-lg text-green-50/85 max-w-xl mx-auto">
                  {dealTagline(deal)}
                </p>

                <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/90">
                  {deal.rating > 0 && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <span className="material-symbols-outlined text-amber-300 text-[18px] fill-1">
                        star
                      </span>
                      {deal.rating.toFixed(1)}
                      <span className="text-white/60">({deal.reviewCount})</span>
                    </span>
                  )}
                  {deal.isVerified && (
                    <span className="inline-flex items-center gap-1 text-green-300">
                      <span className="material-symbols-outlined text-[18px] fill-1">
                        verified
                      </span>
                      Certified
                    </span>
                  )}
                </div>

                <Link
                  href={deal.href}
                  tabIndex={active ? 0 : -1}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-500/30 transition-colors"
                >
                  Shop now
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Controls ── */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(slide - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(slide + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 md:flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={i === 0 ? "Go to intro slide" : `Go to deal ${i}`}
                aria-current={i === slide}
                className={`h-2 rounded-full transition-all ${
                  i === slide ? "w-7 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
