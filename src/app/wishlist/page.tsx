"use client";

import { useWishlist } from "@/hooks/useWishlist";
import Link from "next/link";
import Image from "next/image";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Rating from "@/components/ui/Rating";
import PriceTag from "@/components/ui/PriceTag";
import WishlistButton from "@/components/ui/WishlistButton";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import { Shop, Product } from "@/types";
import { motion } from "framer-motion";

export default function WishlistPage() {
  const { items, wishlistCount } = useWishlist();

  const shopItems = items.filter((item) => item.type === "shop");
  const productItems = items.filter((item) => item.type === "product");

  if (wishlistCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            My Wishlist
          </h1>
          <EmptyState
            title="Your wishlist is empty"
            description="Start exploring and save your favorite shops and products"
            actionLabel="Browse Shops"
            actionHref="/browse"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                My Wishlist
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved
              </p>
            </div>
          </div>

          {/* Saved Shops */}
          {shopItems.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Shops ({shopItems.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopItems.map((item) => {
                  const shop = item.data as Shop;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Link href={`/shop/${shop.id}`}>
                        <Card className="h-full overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
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
                                  Certified
                                </span>
                              </div>
                            )}
                            <div className="absolute top-4 right-4 z-10">
                              <WishlistButton
                                id={shop.id}
                                type="shop"
                                data={shop}
                                size="sm"
                              />
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
                            <div className="flex items-center gap-1 text-gray-400 text-xs mb-4">
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
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Products */}
          {productItems.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Products ({productItems.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productItems.map((item) => {
                  const product = item.data as Product;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <Card>
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
                          <div className="absolute top-2 right-2 z-10">
                            <WishlistButton
                              id={product.id}
                              type="product"
                              data={product}
                              size="sm"
                            />
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1 leading-tight line-clamp-2">
                            {product.name}
                          </h4>
                          <PriceTag
                            price={product.price}
                            originalPrice={product.originalPrice}
                            className="mb-2"
                          />
                          <Link href={`/shop/${product.shopId}`}>
                            <Button size="sm" className="w-full">
                              View Shop
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
