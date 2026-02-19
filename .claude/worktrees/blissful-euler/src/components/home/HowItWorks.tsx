"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Browse",
    description:
      "Explore shops and services by category or search for exactly what you need.",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    color: "from-green-400 to-green-500",
  },
  {
    number: "02",
    title: "Select",
    description:
      "View profiles, watch videos, check reviews, and compare services.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "from-green-500 to-green-600",
  },
  {
    number: "03",
    title: "Connect",
    description:
      "Reach out directly via phone, WhatsApp, or send an inquiry.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "from-green-600 to-green-700",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-14 md:py-24 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/[0.03] rounded-full blur-3xl" />
      </div>

      <div className="relative section-container">
        <div className="text-center mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight"
          >
            How It Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto"
          >
            Find and connect with local businesses in 3 simple steps
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative group"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-8 text-center hover:shadow-card-hover transition-all duration-300">
                {/* Step number */}
                <div className="text-[64px] font-black text-gray-100 dark:text-gray-800/50 leading-none mb-4 select-none group-hover:text-green-100 dark:group-hover:text-green-900/30 transition-colors">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto -mt-12 mb-5 shadow-green group-hover:scale-110 transition-transform`}>
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={step.icon}
                    />
                  </svg>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>

              {/* Connector arrow (hidden on last item and mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <svg className="w-8 h-8 text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
