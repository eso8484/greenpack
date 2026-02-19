"use client";

import Link from "next/link";
import ShopCard from "@/components/browse/ShopCard";
import { getFeaturedShops } from "@/lib/utils";
import { motion } from "framer-motion";

export default function FeaturedShops() {
  const featured = getFeaturedShops();

  return (
    <section className="py-14 md:py-20 bg-white dark:bg-gray-900/50">
      <div className="section-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight"
            >
              Featured Shops
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-1 text-gray-500 dark:text-gray-400"
            >
              Handpicked businesses trusted by the community
            </motion.p>
          </div>
          <Link
            href="/browse"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {featured.slice(0, 6).map((shop, i) => (
            <motion.div
              key={shop.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <ShopCard shop={shop} />
            </motion.div>
          ))}
        </div>

        {/* Mobile view all link */}
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 dark:text-green-400"
          >
            View All Shops
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
