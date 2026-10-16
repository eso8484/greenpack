import { Suspense } from "react";
import CategorySidebar from "@/components/browse/CategorySidebar";
import FilterBar from "@/components/browse/FilterBar";
import ShopGrid from "@/components/browse/ShopGrid";
import SearchBar from "@/components/layout/SearchBar";
import {
  categories,
  categoriesInGroup,
  getGroupBySlug,
} from "@/lib/data/categories";
import { dbGetShops } from "@/lib/db";

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    group?: string;
    city?: string;
    sort?: string;
    verified?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const categorySlug = params.category || "";
  const groupSlug = params.group || "";
  const city = params.city || "";
  const sortBy = params.sort || "relevance";
  const verifiedOnly = params.verified === "true";

  const category = categories.find((c) => c.slug === categorySlug);
  const group = groupSlug ? getGroupBySlug(groupSlug) : undefined;

  // A leaf is more specific than its group, so `?category=` wins when both are
  // present — a stale `?group=` beside a leaf must not quietly widen the result
  // set back out to the whole group. `scope` is whichever one actually filters,
  // and is what the header and sidebar must reflect; reading `category ?? group`
  // anywhere else would let the two disagree.
  const scope = category ?? group;
  const categoryIds = scope
    ? category
      ? [category.id]
      : categoriesInGroup(scope.id).map((c) => c.id)
    : null;

  const filteredShops = await dbGetShops({
    query,
    categoryIds,
    city,
    sortBy,
    verifiedOnly,
  });

  const pageTitle = query
    ? `Results for "${query}"${city ? ` in ${city}` : ""}`
    : city
      ? `Shops in ${city}`
      : scope
        ? scope.name
        : "Browse All Shops";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
      {/* Gradient header band */}
      <div className="relative overflow-hidden rounded-2xl bg-mesh-green px-6 py-7 md:px-10 md:py-9 mb-6">
        <div className="absolute inset-0 bg-grid-faint opacity-30" aria-hidden />
        <div
          className="absolute -top-16 right-10 w-64 h-64 rounded-full bg-accent-500/15 blur-3xl animate-float"
          aria-hidden
        />
        <div className="relative z-10">
          {/* `scope`, not `category` — the pill has to name whatever is
              actually filtering, or a group view would wear no pill at all
              and a leaf-beside-stale-group view would wear the wrong one. */}
          {scope && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3 py-1 text-xs font-semibold text-green-50 mb-3">
              <span className="text-sm leading-none">{scope.icon}</span>
              {scope.name}
            </span>
          )}
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-sm md:text-base text-green-50/80 mt-1">
            Discover verified local shops &amp; services near you.
          </p>
          <div className="mt-5 max-w-xl">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-8">
        {/* Sidebar - Desktop. Starts at `lg`, not `md`: the reveal needs
            `:hover`, so below `lg` the category navigation is the pill row in
            FilterBar instead — which is why that row is `lg:hidden`.
            No reserved width: the column is sized by the sidebar's own rail
            (13.5rem), and its subcategory panel is `absolute left-full`, out of
            flow, overlaying the grid rather than sitting in space held open for
            it. It used to reserve `w-[32rem]` — 512px of bordered empty box
            beside a 192px rail, handed back to the listing only when something
            was hovered. That box is the reported bug. */}
        <div className="hidden lg:block shrink-0">
          {/* `sticky` only — deliberately no `max-h` / `overflow-y-auto` here,
              and that is not an oversight. Any `overflow` other than `visible`
              on one axis computes the other axis to `auto` too, so this wrapper
              would clip the panel that now overflows it horizontally (and grow a
              stray scrollbar inside the sticky box). The cap itself is no longer
              needed: ten rail rows fit a normal window. A very short one can
              still overflow the *page*, which scrolls normally — the panel goes
              with it, since it is positioned against the sidebar rather than
              against the viewport. */}
          <div className="sticky top-24">
            {/* The group is passed only when no leaf is filtering, so the scope
                the sidebar marks is the one this page is actually displaying —
                `scope = category ?? group` above. Handing it both would let a
                leaf view highlight a stale `?group=`'s row alongside the active
                tile. Neither prop opens a panel: they are read for highlighting
                only, so no `/browse` state can reveal one on arrival. */}
            <CategorySidebar
              activeCategory={categorySlug}
              activeGroup={category ? undefined : group?.slug}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Suspense fallback={null}>
            <FilterBar totalResults={filteredShops.length} />
          </Suspense>
          <div className="mt-6">
            <ShopGrid shops={filteredShops} />
          </div>
        </div>
      </div>
    </div>
  );
}
