import { Suspense } from "react";
import CategorySidebar from "@/components/browse/CategorySidebar";
import FilterBar from "@/components/browse/FilterBar";
import ShopGrid from "@/components/browse/ShopGrid";
import SearchBar from "@/components/layout/SearchBar";
import { shops } from "@/lib/data/shops";
import { categories } from "@/lib/data/categories";
import { filterShops } from "@/lib/utils";

interface BrowsePageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const categorySlug = params.category || "";
  const sortBy = params.sort || "relevance";

  const category = categories.find((c) => c.slug === categorySlug);
  const categoryId = category?.id || null;

  const filteredShops = filterShops(shops, {
    query,
    categoryId,
    sortBy,
  });

  const pageTitle = query
    ? `Results for "${query}"`
    : category
      ? category.name
      : "Browse All Shops";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{pageTitle}</h1>
        {/* Mobile search */}
        <div className="md:hidden mb-4">
          <SearchBar />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-8">
        {/* Sidebar - Desktop */}
        <div className="hidden md:block w-64 shrink-0">
          <CategorySidebar activeCategory={categorySlug} />
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
