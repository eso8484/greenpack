"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";
import { categories } from "@/lib/data/categories";
import { useAuth } from "@/hooks/useAuth";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const { user, profile, signOut } = useAuth();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute top-0 left-0 w-80 max-w-[85vw] h-full bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            Green<span className="text-green-500">Pack</span>
          </span>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Auth Section */}
        {user && profile ? (
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                {profile.full_name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {profile.full_name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {profile.role}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full py-2.5 text-sm font-bold rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="p-4 flex gap-3 border-b border-gray-100 dark:border-gray-800">
            <Link
              href="/login"
              onClick={onClose}
              className="flex-1 text-center py-2.5 text-sm font-bold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              onClick={onClose}
              className="flex-1 text-center py-2.5 text-sm font-bold rounded-lg bg-green-500 text-white shadow-sm hover:bg-green-600 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}

        {/* Search */}
        <div className="p-4">
          <SearchBar />
        </div>

        {/* Nav Links */}
        <nav className="px-4 pb-4 space-y-1">
          <Link
            href="/"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            Home
          </Link>
          <Link
            href="/browse"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            Browse All
          </Link>
          <Link
            href="/help"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            Help Center
          </Link>
          <Link
            href="/wishlist"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            Wishlist
          </Link>
          <Link
            href="/cart"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            Cart
          </Link>
          <Link
            href="/profile"
            onClick={onClose}
            className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
          >
            My Profile
          </Link>
        </nav>

        {/* Become a Vendor CTA */}
        <div className="px-4 pb-4">
          <Link
            href="/sell"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-500/20 text-green-700 dark:text-green-400 rounded-xl font-semibold text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              storefront
            </span>
            Become a Vendor
          </Link>
        </div>

        {/* Categories */}
        <div className="px-4 pb-6">
          <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            Categories
          </h3>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/browse?category=${cat.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
              >
                <span className="text-lg">{cat.icon}</span>
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
