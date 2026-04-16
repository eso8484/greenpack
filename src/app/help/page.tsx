"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import CategoryCard from "@/components/help/CategoryCard";
import FAQAccordion from "@/components/help/FAQAccordion";
import EmptyState from "@/components/ui/EmptyState";
import { faqCategories, faqItems } from "@/lib/data/faqs";
import { FAQCategory } from "@/types";

const quickActions = [
  {
    title: "Track my delivery",
    description:
      "Get real-time rider updates and estimated arrival windows for active orders.",
  },
  {
    title: "Manage returns",
    description:
      "Start a return request and monitor pickup and refund progress in one place.",
  },
  {
    title: "Contact live agent",
    description:
      "Escalate complex issues instantly when you need one-on-one support.",
  },
];

const supportChannels = [
  { label: "Live chat", value: "Average wait: 2 minutes" },
  { label: "WhatsApp", value: "+234 801 234 5678" },
  { label: "Phone", value: "Mon - Sat, 8:00 - 20:00" },
];

export default function HelpCenterPage() {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | null>(
    null
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  useEffect(() => {
    if (searchParams.get("chat") === "1") {
      setChatOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const onSupportWidgetMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const messageType = event.data?.type;
      if (messageType === "GREENPACK_CLOSE_SUPPORT_CHAT") {
        setChatOpen(false);
      }

      if (messageType === "GREENPACK_TOGGLE_SUPPORT_CHAT_SIZE") {
        setChatExpanded((prev) => !prev);
      }
    };

    window.addEventListener("message", onSupportWidgetMessage);
    return () => {
      window.removeEventListener("message", onSupportWidgetMessage);
    };
  }, []);

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
    <div className="min-h-screen bg-[#f9fafb] dark:bg-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-gradient-to-b from-green-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,252,231,0.55),transparent_62%)] dark:bg-none" />
        <div className="relative max-w-5xl mx-auto px-4 py-12 md:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-800 dark:border-green-800/50 dark:bg-green-900/20 dark:text-green-200">
              GreenPack Support
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How can we help you today?
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg md:text-xl max-w-3xl mx-auto">
              Search guides, track your orders, and connect with support in minutes.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-3xl mx-auto">
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
                placeholder="Try: refund timeline, delivery issue, account verification"
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 dark:focus:ring-green-900 transition-colors shadow-sm text-lg"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {!searchQuery && !selectedCategory && (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <div
                  key={action.title}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

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

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
              {supportChannels.map((channel) => (
                <div
                  key={channel.label}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5"
                >
                  <p className="text-sm uppercase tracking-wide text-green-700 dark:text-green-400 font-semibold">
                    {channel.label}
                  </p>
                  <p className="mt-1 text-gray-800 dark:text-gray-200 font-medium">
                    {channel.value}
                  </p>
                </div>
              ))}
            </div>
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
              href="/help?chat=1"
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

      <div className="fixed right-4 bottom-4 z-[70] flex flex-col items-end gap-2">
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="rounded-full border border-green-200 dark:border-green-800 bg-white/95 dark:bg-gray-800/95 px-4 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 shadow-lg"
        >
          We get it. We are here.
        </button>

        {chatOpen && (
          <div
            className={`relative overflow-hidden rounded-3xl border border-green-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl transition-[width,height] duration-300 ${
              chatExpanded
                ? "h-[min(440px,calc(100dvh-7rem))] w-[min(740px,calc(100vw-1.5rem))]"
                : "h-[min(650px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-1.5rem))]"
            }`}
          >
            <iframe
              title="GreenPack support chat"
              src="/contact-support?chatOnly=1"
              className="h-full w-full border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}
