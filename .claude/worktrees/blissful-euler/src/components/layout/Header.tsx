"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";
import MobileNav from "./MobileNav";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Header() {
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 glass-strong border-b border-gray-200/50 dark:border-gray-800/50 transition-colors">
        <div className="section-container">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <motion.div
                whileHover={{ rotate: 5, scale: 1.05 }}
                className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-green"
              >
                <span className="text-white font-bold text-sm">G</span>
              </motion.div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Green<span className="text-gradient">Pack</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all"
              >
                Home
              </Link>
              <Link
                href="/browse"
                className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all"
              >
                Browse
              </Link>
              <Link
                href="/browse?category=food"
                className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all"
              >
                Food
              </Link>
              <Link
                href="/browse?category=fashion"
                className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg transition-all"
              >
                Fashion
              </Link>
            </nav>

            {/* Search */}
            <SearchBar className="hidden md:block flex-1 max-w-md" />

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <ThemeToggle />

              {/* Cart */}
              <Link href="/cart">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-xl transition-all cursor-pointer"
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
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-green"
                    >
                      {itemCount}
                    </motion.span>
                  )}
                </motion.div>
              </Link>

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-xl transition-all cursor-pointer"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
