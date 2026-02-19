"use client";

import Link from "next/link";
import Image from "next/image";
import MobileNav from "./MobileNav";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";

export default function Header() {
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-[#122017]/80 backdrop-blur-md border-b border-green-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="bg-green-500 p-1.5 rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Green Pack Delight Logo"
                  width={28}
                  height={28}
                  className="rounded"
                  unoptimized
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Green Pack Delight
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-10">
              <Link
                href="/"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/browse"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Browse
              </Link>
              <Link
                href="/browse"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                Shops
              </Link>
              <Link
                href="/sell"
                className="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
              >
                Sell on GreenPack
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <ThemeToggle />

              {/* Cart */}
              <Link
                href="/cart"
                className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
                  />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Login — for general users/buyers */}
              <Link
                href="/login"
                className="hidden md:block text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
              >
                Login
              </Link>

              {/* Sign Up — for general users/buyers */}
              <Link
                href="/signup"
                className="hidden md:block bg-green-500 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Sign Up
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden p-2 text-gray-600 hover:text-green-600 transition-colors cursor-pointer"
              >
                <svg
                  className="w-6 h-6"
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
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
