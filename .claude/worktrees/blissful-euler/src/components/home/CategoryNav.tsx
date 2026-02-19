"use client";

import Link from "next/link";
import { categories } from "@/lib/data/categories";
import { motion } from "framer-motion";

export default function CategoryNav() {
  return (
    <section className="py-14 md:py-20">
      <div className="section-container">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight"
          >
            Browse by Category
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-gray-500 dark:text-gray-400"
          >
            Find exactly what you need
          </motion.p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/browse?category=${cat.slug}`}
                className="group flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-800 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-2xl">{cat.icon}</span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors block">
                    {cat.name.split(" & ")[0]}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                    {cat.shopCount} shops
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
