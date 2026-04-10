"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import CategoryCard from "@/components/help/CategoryCard";
import FAQAccordion from "@/components/help/FAQAccordion";
import EmptyState from "@/components/ui/EmptyState";
import { faqCategories, faqItems } from "@/lib/data/faqs";
import { FAQCategory } from "@/types";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(
    null
  );

  // Filter FAQs based on search query and selected category
  const filteredFAQs = useMemo(() => {
    let filtered = faqItems;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (faq) => faq.categoryId === selectedCategory.id
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.keywords.some((keyword) => keyword.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handleCategoryClick = (category: FAQCategory) => {
    setSelectedCategory(category);
    setSearchQuery("");
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How can we help you?
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Find answers to frequently asked questions about using GreenPack
            </p>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help..."
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors shadow-sm text-lg"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Button (when category is selected) */}
        {selectedCategory && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 mb-6 font-medium transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to all categories
          </motion.button>
        )}

        {/* Category Selection (when no search and no category selected) */}
        {!searchQuery && !selectedCategory && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Browse by category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {faqCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onClick={() => handleCategoryClick(category)}
                />
              ))}
            </div>
          </div>
        )}

        {/* FAQ Results */}
        {(searchQuery || selectedCategory) && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedCategory
                ? selectedCategory.name
                : `Search results for "${searchQuery}"`}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filteredFAQs.length === 1
                ? "1 article found"
                : `${filteredFAQs.length} articles found`}
            </p>

            {filteredFAQs.length > 0 ? (
              <FAQAccordion items={filteredFAQs} />
            ) : (
              <EmptyState
                title="No results found"
                description="Try adjusting your search or browse our categories above"
                actionLabel="Clear search"
                actionHref="#"
              />
            )}
          </div>
        )}

        {/* Popular Questions (when no search and no category) */}
        {!searchQuery && !selectedCategory && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Popular questions
            </h2>
            <FAQAccordion items={faqItems.slice(0, 8)} />
          </div>
        )}
      </div>

      {/* Contact Support CTA */}
      <div className="bg-gradient-to-b from-white to-green-50 dark:from-gray-900 dark:to-green-950/20 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Still need help?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Our support team is ready to assist you
            </p>
            <Link
              href="/contact-support"
              className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-8 py-3 rounded-lg shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Contact Support
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
