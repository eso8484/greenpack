"use client";

import { shops } from "@/lib/data/shops";

const videoShops = shops.filter((s) => s.video?.url).slice(0, 4);

export default function VideoHighlights() {
    if (videoShops.length === 0) return null;

    return (
        <section className="py-24 overflow-hidden bg-[#f6f8f7] dark:bg-[#122017]">
            <div className="max-w-7xl mx-auto px-6 mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    See them in action
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Short video highlights from our community&apos;s favorite shops.
                </p>
            </div>

            {/* Horizontal scroll carousel */}
            <div className="flex gap-6 overflow-x-auto pb-8 px-6 no-scrollbar snap-x">
                {videoShops.map((shop) => (
                    <div
                        key={shop.id}
                        className="flex-none w-72 h-[480px] rounded-2xl overflow-hidden relative snap-start group shadow-lg cursor-pointer"
                    >
                        {/* Background - gradient placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-emerald-900">
                            <div className="absolute inset-0 flex items-center justify-center opacity-20">
                                <svg
                                    className="w-16 h-16 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </div>

                        {/* Dark overlay */}
                        <div className="absolute inset-0 bg-black/40 z-10" />

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-green-500 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                        {shop.name.charAt(0)}
                                    </span>
                                </div>
                                <span className="text-white font-bold text-sm">
                                    {shop.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-white/80 text-xs">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">
                                        visibility
                                    </span>{" "}
                                    {(Math.random() * 20 + 5).toFixed(1)}k
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">
                                        favorite
                                    </span>{" "}
                                    {Math.floor(Math.random() * 2000 + 200)}
                                </span>
                            </div>
                        </div>

                        {/* Play button on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                            <div className="w-16 h-16 rounded-full bg-green-500/80 flex items-center justify-center text-white backdrop-blur-sm">
                                <span className="material-symbols-outlined text-4xl fill-1">
                                    play_arrow
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
