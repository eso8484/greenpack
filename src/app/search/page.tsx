"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Rating from "@/components/ui/Rating";
import PriceTag from "@/components/ui/PriceTag";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import WishlistButton from "@/components/ui/WishlistButton";
import { shops } from "@/lib/data/shops";
import { services } from "@/lib/data/services";
import { products } from "@/lib/data/products";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import { Shop, Service, Product } from "@/types";
import { motion } from "framer-motion";

type SearchResultType = "shop" | "service" | "product";

interface SearchResult {
  id: string;
  type: SearchResultType;
  data: Shop | Service | Product;
  relevance: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<"all" | SearchResultType>("all");

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search shops
    shops.forEach((shop) => {
      let relevance = 0;
      if (shop.name.toLowerCase().includes(q)) relevance += 10;
      if (shop.description.toLowerCase().includes(q)) relevance += 5;
      if (shop.shortDescription.toLowerCase().includes(q)) relevance += 5;
      if (shop.categoryName.toLowerCase().includes(q)) relevance += 3;
      if (shop.tags.some((t) => t.toLowerCase().includes(q))) relevance += 7;
      if (shop.location.address.toLowerCase().includes(q)) relevance += 2;

      if (relevance > 0) {
        results.push({ id: shop.id, type: "shop", data: shop, relevance });
      }
    });

    // Search services
    services.forEach((service) => {
      let relevance = 0;
      if (service.name.toLowerCase().includes(q)) relevance += 10;
      if (service.description.toLowerCase().includes(q)) relevance += 5;

      if (relevance > 0) {
        results.push({
          id: service.id,
          type: "service",
          data: service,
          relevance,
        });
      }
    });

    // Search products
    products.forEach((product) => {
      let relevance = 0;
      if (product.name.toLowerCase().includes(q)) relevance += 10;
      if (product.description?.toLowerCase().includes(q)) relevance += 5;

      if (relevance > 0) {
        results.push({
          id: product.id,
          type: "product",
          data: product,
          relevance,
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }, [query]);

  const filteredResults =
    activeTab === "all"
      ? searchResults
      : searchResults.filter((r) => r.type === activeTab);

  const counts = {
    all: searchResults.length,
    shop: searchResults.filter((r) => r.type === "shop").length,
    service: searchResults.filter((r) => r.type === "service").length,
    product: searchResults.filter((r) => r.type === "product").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Search Results
          </h1>
          {query && (
            <p className="text-gray-600 dark:text-gray-400 mb-8">
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
          ) : filteredResults.length === 0 ? (
            <EmptyState
              title="No results found"
              description={`Try different keywords or browse all shops`}
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
        <Card className="h-full overflow-hidden hover:shadow-xl transition-all group">
          <div className="relative h-48 overflow-hidden">
            <Image
              src={shop.images.thumbnail}
              alt={shop.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
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
    const shop = shops.find((s) => s.id === service.shopId);
    return (
      <Link href={`/shop/${service.shopId}`}>
        <Card className="p-6 hover:shadow-xl transition-all">
          <div className="flex justify-between items-start mb-3">
            <Badge variant="green">Service</Badge>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {service.name}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {service.description}
          </p>
          {shop && (
            <p className="text-xs text-gray-400 mb-3">from {shop.name}</p>
          )}
          <PriceTag price={service.price} priceType={service.priceType} />
        </Card>
      </Link>
    );
  }

  if (result.type === "product") {
    const product = result.data as Product;
    const shop = shops.find((s) => s.id === product.shopId);
    return (
      <Link href={`/shop/${product.shopId}`}>
        <Card className="overflow-hidden hover:shadow-xl transition-all">
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
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
            {shop && (
              <p className="text-xs text-gray-400 mb-2">from {shop.name}</p>
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
