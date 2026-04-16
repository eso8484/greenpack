"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type SupportMode = "assistant" | "agent";

type PreviewMessage = {
  id: string;
  sender: "user" | "assistant" | "agent";
  text: string;
  time: string;
};

const quickTopics = [
  "Track my order",
  "Payment issue",
  "Vendor complaint",
  "Account verification",
  "Speak to an agent",
];

const sampleMessages: PreviewMessage[] = [
  {
    id: "1",
    sender: "assistant",
    text: "Hi, I am GreenPack Assistant. Tell me what happened and I will help right away.",
    time: "09:04",
  },
  {
    id: "2",
    sender: "user",
    text: "My order has been stuck on rider assigned since yesterday.",
    time: "09:05",
  },
  {
    id: "3",
    sender: "assistant",
    text: "I found your order and flagged it for dispatch follow-up. Do you want me to connect a support agent now?",
    time: "09:05",
  },
  {
    id: "4",
    sender: "agent",
    text: "Support agent joined. We are contacting the rider and will update you in 5 minutes.",
    time: "09:06",
  },
];

export default function ContactSupportRedesignPreviewPage() {
  const [activeMode, setActiveMode] = useState<SupportMode>("assistant");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div className="relative min-h-screen bg-[#f9fafb] dark:bg-gray-900">
      <section className="relative overflow-hidden border-b border-gray-200 dark:border-gray-800 bg-gradient-to-b from-green-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(220,252,231,0.5),transparent_62%)] dark:bg-none" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="inline-flex items-center rounded-full border border-green-200 bg-green-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-green-800 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200">
              Preview Build
            </div>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              Contact Support
            </h1>
            <p className="mt-4 max-w-2xl text-base md:text-lg text-gray-600 dark:text-gray-400">
              Tell us what happened. Start with Smart Assistant and move to live support when needed.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/help?chat=1"
                className="inline-flex items-center rounded-lg bg-white text-gray-900 border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
              >
                Back to current page
              </Link>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Preview route: <span className="font-semibold">/contact-support-redesign</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4 md:px-6 md:py-5">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                Smart assistant conversation
              </h2>
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                {(["assistant", "agent"] as SupportMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                      activeMode === mode
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {mode === "assistant" ? "Smart Assistant" : "Live Agent"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    selectedTopic === topic
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  )}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="space-y-3">
              {sampleMessages
                .filter((entry) => activeMode === "agent" || entry.sender !== "agent")
                .map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "max-w-[92%] rounded-2xl px-4 py-3 border",
                      entry.sender === "user" &&
                        "ml-auto bg-green-600 text-white border-green-600",
                      entry.sender === "assistant" &&
                        "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200",
                      entry.sender === "agent" &&
                        "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        entry.sender === "user"
                          ? "text-green-100"
                          : "text-gray-500 dark:text-gray-400"
                      )}
                    >
                      {entry.time}
                    </p>
                  </div>
                ))}

              <div className="mt-5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between gap-3">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    selectedTopic
                      ? `Message about ${selectedTopic}...`
                      : "Type your support message..."
                  }
                  className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none"
                />
                <button className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-green-700 transition-colors">
                  Send
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{activeMode === "assistant" ? "Assistant handling" : "Agent connected"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Channel</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">In-app chat</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Response</p>
                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">Usually under 2 mins</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed right-5 bottom-5 z-20 rounded-full border border-green-200 bg-white/95 dark:bg-gray-800/95 dark:border-green-800 px-4 py-2 shadow-lg backdrop-blur">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">We get it. We are here.</p>
      </div>
    </div>
  );
}
