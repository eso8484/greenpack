import Link from "next/link";
import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface VideoHighlightsProps {
  /** Real shops that have a video, pre-filtered in page.tsx. */
  shops: Shop[];
}

export default function VideoHighlights({ shops }: VideoHighlightsProps) {
  if (!shops.length) return null;

  return (
    <section className="pt-14 md:pt-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-7">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 text-accent-600 dark:text-accent-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-2">
          <span className="material-symbols-outlined text-[14px] fill-1">play_circle</span>
          Watch
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          See them in action
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Short video highlights from our community&apos;s shops.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 px-4 md:px-6 no-scrollbar snap-x max-w-7xl mx-auto">
        {shops.map((shop) => (
          <Link
            key={shop.id}
            href={`/shop/${shop.id}`}
            className="flex-none w-60 md:w-64 aspect-[9/16] rounded-3xl overflow-hidden relative snap-start group shadow-lg hover:shadow-2xl hover:shadow-green-500/20 transition-shadow"
          >
            {/* Background — real video thumbnail when available, brand gradient otherwise */}
            {shop.video?.thumbnail ? (
              <Image
                src={shop.video.thumbnail}
                alt={`${shop.name} video`}
                fill
                sizes="256px"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-green-700 via-emerald-800 to-green-950" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

            {/* Verified pill */}
            {shop.isVerified && (
              <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-green-500 text-[13px] fill-1">verified</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-800 dark:text-gray-200">Certified</span>
              </span>
            )}

            {/* Play affordance */}
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <span className="w-14 h-14 rounded-full bg-green-500/85 group-hover:bg-green-500 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-3xl fill-1">play_arrow</span>
              </span>
            </div>

            {/* Bottom info — real data only */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
              {shop.categoryName && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green-300">
                  {shop.categoryName}
                </span>
              )}
              <h3 className="text-white font-bold text-sm leading-tight line-clamp-1 mt-0.5">
                {shop.name}
              </h3>
              <div className="mt-1.5 flex items-center gap-3 text-white/85 text-xs">
                {shop.rating > 0 && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <span className="material-symbols-outlined text-amber-400 text-[14px] fill-1">star</span>
                    {shop.rating.toFixed(1)}
                  </span>
                )}
                {shop.location.city && (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span className="truncate max-w-[8rem]">{shop.location.city}</span>
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
