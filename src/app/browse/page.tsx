import { Suspense } from "react";
import CategorySidebar from "@/components/browse/CategorySidebar";
import FilterBar from "@/components/browse/FilterBar";
import ShopGrid from "@/components/browse/ShopGrid";
import SearchBar from "@/components/layout/SearchBar";
import { categories } from "@/lib/data/categories";
import { dbGetShops } from "@/lib/db";

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    city?: string;
    sort?: string;
    verified?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const categorySlug = params.category || "";
  const city = params.city || "";
  const sortBy = params.sort || "relevance";
  const verifiedOnly = params.verified === "true";

  const category = categories.find((c) => c.slug === categorySlug);
  const categoryId = category?.id || null;

  const filteredShops = await dbGetShops({
    query,
    categoryId,
    city,
    sortBy,
    verifiedOnly,
  });

  const pageTitle = query
    ? `Results for "${query}"${city ? ` in ${city}` : ""}`
    : city
      ? `Shops in ${city}`
      : category
        ? category.name
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
          {category && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur px-3 py-1 text-xs font-semibold text-green-50 mb-3">
              <span className="text-sm leading-none">{category.icon}</span>
              {category.name}
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
        {/* Sidebar - Desktop */}
        <div className="hidden md:block w-64 shrink-0">
          <div className="sticky top-24">
            <CategorySidebar activeCategory={categorySlug} />
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
