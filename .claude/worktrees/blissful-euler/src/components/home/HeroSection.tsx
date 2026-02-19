"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import SearchBar from "@/components/layout/SearchBar";
import { motion } from "framer-motion";

const stats = [
  { value: "500+", label: "Vendors" },
  { value: "50K+", label: "Customers" },
  { value: "4.8", label: "Avg Rating" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-800 dark:from-gray-950 dark:via-gray-900 dark:to-green-950">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-green-300/10 rounded-full blur-3xl animate-float" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative section-container py-16 md:py-24 lg:py-32">
        <div className="max-w-3xl">
          {/* Pill badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-6"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-green-100 font-medium">
              Trusted by 50,000+ Nigerians
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight"
          >
            Discover Amazing
            <br />
            <span className="text-gradient-hero">Local Businesses</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-5 text-lg md:text-xl text-green-100/80 leading-relaxed max-w-xl"
          >
            From barbers to restaurants, tech repair to fashion — find and
            connect with trusted service providers in your neighborhood.
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 max-w-lg"
          >
            <SearchBar
              size="lg"
              placeholder="What are you looking for?"
              className="[&_input]:bg-white/10 [&_input]:backdrop-blur-md [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/50 [&_input]:focus:border-green-400 [&_input]:focus:ring-green-400/20"
            />
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 flex flex-wrap gap-3"
          >
            <Link href="/browse">
              <Button
                size="lg"
                className="bg-white text-green-700 hover:bg-green-50 shadow-lg hover:shadow-xl from-white to-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Explore Shops
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10"
              >
                View Categories
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex gap-8 md:gap-12"
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-extrabold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-green-200/60 font-medium mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
