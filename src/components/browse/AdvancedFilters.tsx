"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface AdvancedFiltersProps {
  onApply: (filters: FilterState) => void;
}

export interface FilterState {
  priceRange: [number, number];
  distance: number;
  openNow: boolean;
  verifiedOnly: boolean;
  rating: number;
}

export default function AdvancedFilters({ onApply }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 50000],
    distance: 10,
    openNow: false,
    verifiedOnly: false,
    rating: 0,
  });

  const handleApply = () => {
    onApply(filters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultFilters: FilterState = {
      priceRange: [0, 50000],
      distance: 10,
      openNow: false,
      verifiedOnly: false,
      rating: 0,
    };
    setFilters(defaultFilters);
    onApply(defaultFilters);
  };

  return (
    <div className="relative">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Advanced Filters
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 z-20 w-80"
          >
            <Card className="p-6 shadow-xl">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                Filters
              </h3>

              <div className="space-y-6">
                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Price Range
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={filters.priceRange[0]}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          priceRange: [Number(e.target.value), filters.priceRange[1]],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Min"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      value={filters.priceRange[1]}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          priceRange: [filters.priceRange[0], Number(e.target.value)],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Max"
                    />
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Distance: {filters.distance}km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={filters.distance}
                    onChange={(e) =>
                      setFilters({ ...filters, distance: Number(e.target.value) })
                    }
                    className="w-full accent-green-500"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Minimum Rating
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFilters({ ...filters, rating })}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filters.rating === rating
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                      >
                        {rating === 0 ? "All" : `${rating}+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.openNow}
                      onChange={(e) =>
                        setFilters({ ...filters, openNow: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Open Now
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) =>
                        setFilters({ ...filters, verifiedOnly: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Verified Only
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="secondary" size="sm" onClick={handleReset} className="flex-1">
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleApply} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
