"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { motion } from "framer-motion";

export default function PromoBanner() {
  return (
    <section className="py-14 md:py-20">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-green-500 to-green-400 dark:from-green-700 dark:via-green-600 dark:to-green-500 p-8 md:p-12 lg:p-16"
        >
          {/* Decorative elements */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wide">
                For Business Owners
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                List Your Business
                <br />
                <span className="text-green-100">Reach Thousands of Customers</span>
              </h2>
              <p className="mt-3 text-green-100/80 max-w-lg leading-relaxed">
                Join hundreds of Nigerian businesses already growing with GreenPack.
                Showcase your services with video, connect with customers directly.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <Link href="/browse">
                  <Button
                    size="lg"
                    className="bg-white text-green-700 hover:bg-green-50 shadow-lg from-white to-white"
                  >
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/40 text-white hover:bg-white/10"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {[
                { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Instant Setup", value: "< 5 min" },
                { icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z", label: "Active Users", value: "50K+" },
                { icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", label: "Avg Rating", value: "4.8/5" },
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "Verified", value: "100%" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10"
                >
                  <svg className="w-5 h-5 text-white/80 mx-auto mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                  <div className="text-xl font-extrabold text-white">{item.value}</div>
                  <div className="text-[11px] text-green-100/70 font-medium mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
