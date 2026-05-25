"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Rating from "@/components/ui/Rating";
import PriceTag from "@/components/ui/PriceTag";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import WishlistButton from "@/components/ui/WishlistButton";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import { Shop, Service, Product } from "@/types";
import { motion } from "framer-motion";

type SearchResultType = "shop" | "service" | "product";

interface SearchResult {
  id: string;
  type: SearchResultType;
  data: Shop | Service | Product;
  relevance: number;
  shopName?: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeTab, setActiveTab] = useState<"all" | SearchResultType>("all");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    let isCancelled = false;

    const loadResults = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const payload = (await response.json()) as {
          success?: boolean;
          data?: SearchResult[];
        };

        if (!isCancelled && response.ok && payload.success && Array.isArray(payload.data)) {
          setSearchResults(payload.data);
        } else if (!isCancelled) {
          setSearchResults([]);
        }
      } catch {
        if (!isCancelled) setSearchResults([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadResults();
    return () => {
      isCancelled = true;
    };
  }, [query]);

  const filteredResults =
    activeTab === "all"
      ? searchResults
      : searchResults.filter((result) => result.type === activeTab);

  const counts = useMemo(
    () => ({
      all: searchResults.length,
      shop: searchResults.filter((result) => result.type === "shop").length,
      service: searchResults.filter((result) => result.type === "service").length,
      product: searchResults.filter((result) => result.type === "product").length,
    }),
    [searchResults]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 shrink-0">
              <span className="material-symbols-outlined">search</span>
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Search results
            </h1>
          </div>
          {query && (
            <p className="text-gray-600 dark:text-gray-400 mb-8 ml-[3.7rem] -mt-1">
              Showing results for &quot;{query}&quot;
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "all"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab("shop")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "shop"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Shops ({counts.shop})
            </button>
            <button
              onClick={() => setActiveTab("service")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "service"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Services ({counts.service})
            </button>
            <button
              onClick={() => setActiveTab("product")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "product"
                  ? "border-green-500 text-green-600 dark:text-green-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Products ({counts.product})
            </button>
          </div>

          {/* Results */}
          {!query.trim() ? (
            <EmptyState
              title="Start searching"
              description="Enter a keyword to search shops, services, and products"
            />
          ) : loading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              Loading results...
            </div>
          ) : filteredResults.length === 0 ? (
            <EmptyState
              title="No results found"
              description="Try different keywords or browse all shops"
              actionLabel="Browse All"
              actionHref="/browse"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResults.map((result) => (
                <ResultCard key={`${result.type}-${result.id}`} result={result} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  if (result.type === "shop") {
    const shop = result.data as Shop;
    return (
      <Link href={`/shop/${shop.id}`}>
        <Card className="h-full rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-green-500/10 transition-all group">
          <div className="relative h-48 overflow-hidden">
            <Image
              src={shop.images.thumbnail}
              alt={shop.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
            {shop.isVerified && (
              <div className="absolute top-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-green-500 text-sm fill-1">
                  verified
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">
                  Shop
                </span>
              </div>
            )}
            <div className="absolute top-4 right-4 z-10">
              <WishlistButton id={shop.id} type="shop" data={shop} size="sm" />
            </div>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start gap-2 mb-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                {shop.name}
              </h3>
              <Rating
                value={shop.rating}
                reviewCount={shop.reviewCount}
                size="sm"
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
              {shop.shortDescription}
            </p>
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <span className="material-symbols-outlined text-sm">
                location_on
              </span>
              <span className="line-clamp-1">
                {shop.location.address}, {shop.location.city}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  if (result.type === "service") {
    const service = result.data as Service;
    return (
      <Link href={`/shop/${service.shopId}`}>
        <Card className="p-6 rounded-2xl hover:shadow-xl hover:shadow-green-500/10 transition-all">
          <div className="flex justify-between items-start mb-3">
            <Badge variant="green">Service</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {service.name}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {service.description}
          </p>
          {result.shopName && (
            <p className="text-xs text-gray-400 mb-3">from {result.shopName}</p>
          )}
          <PriceTag price={service.price} priceType={service.priceType} />
        </Card>
      </Link>
    );
  }

  if (result.type === "product") {
    const product = result.data as Product;
    return (
      <Link href={`/shop/${product.shopId}`}>
        <Card className="rounded-2xl group overflow-hidden hover:shadow-xl hover:shadow-green-500/10 transition-all">
          <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
            <div className="absolute top-2 left-2">
              <Badge variant="default">Product</Badge>
            </div>
            <div className="absolute top-2 right-2 z-10">
              <WishlistButton
                id={product.id}
                type="product"
                data={product}
                size="sm"
              />
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
              {product.name}
            </h3>
            {result.shopName && (
              <p className="text-xs text-gray-400 mb-2">from {result.shopName}</p>
            )}
            <PriceTag
              price={product.price}
              originalPrice={product.originalPrice}
            />
          </div>
        </Card>
      </Link>
    );
  }

  return null;
}
