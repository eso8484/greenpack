"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";

const stats = [
  { label: "Local Shops", value: "500+" },
  { label: "Happy Customers", value: "10K+" },
  { label: "Verified Businesses", value: "350+" },
];

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 overflow-hidden min-h-[520px] flex items-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-green-300/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 w-full">
        <div
          className={`max-w-2xl transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* Label pill */}
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-white/90">
              Trusted by 10,000+ happy customers
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            Discover the
            <br />
            <span className="bg-gradient-to-r from-green-200 to-emerald-100 bg-clip-text text-transparent">
              best near you
            </span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-green-100/90 leading-relaxed max-w-lg">
            Connecting you with trusted local services and authentic shops in
            your neighborhood.
          </p>



          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/browse">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-green-700 hover:bg-green-50 active:bg-green-100 shadow-lg shadow-black/10 font-semibold"
              >
                Explore Shops
              </Button>
            </Link>
            <Link href="/browse">
              <Button
                variant="outline"
                size="lg"
                className="border-white/40 text-white hover:bg-white/10 backdrop-blur-sm"
              >
                Browse Categories
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 flex gap-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl md:text-3xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-sm text-green-200/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
