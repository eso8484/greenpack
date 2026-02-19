"use client";

import { useState } from "react";
import { shops } from "@/lib/data/shops";

const videoShops = shops.filter((s) => s.video?.url).slice(0, 4);

export default function VideoHighlights() {
    const [activeIdx, setActiveIdx] = useState(0);

    if (videoShops.length === 0) return null;

    return (
        <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto px-4">
                {/* Section Header */}
                <div className="text-center mb-10">
                    <span className="inline-block text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                        Live From The Community
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        See them in action
                    </h2>
                    <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Short video highlights from our community&apos;s favorite shops.
                    </p>
                </div>

                {/* Video Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {videoShops.map((shop, idx) => (
                        <button
                            key={shop.id}
                            onClick={() => setActiveIdx(idx)}
                            className={`group relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${activeIdx === idx
                                ? "ring-3 ring-green-500 ring-offset-2 dark:ring-offset-gray-900 scale-[1.02]"
                                : "hover:scale-[1.01]"
                                }`}
                        >
                            {/* Placeholder / thumbnail */}
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/30 to-transparent z-10" />
                            <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-900">
                                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Play button */}
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${activeIdx === idx
                                    ? "bg-green-500 scale-110"
                                    : "bg-white/20 backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110"
                                    }`}>
                                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                                <p className="text-white font-semibold text-sm leading-tight">
                                    {shop.name}
                                </p>
                                <p className="text-green-300 text-xs mt-1">
                                    {shop.categoryName}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
