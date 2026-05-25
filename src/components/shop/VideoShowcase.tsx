"use client";

import { useState } from "react";
import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface VideoShowcaseProps {
  shop: Shop;
}

export default function VideoShowcase({ shop }: VideoShowcaseProps) {
  const [showVideo, setShowVideo] = useState(false);
  const allImages = [shop.video.thumbnail, ...shop.images.gallery].filter(
    Boolean
  );
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div>
      {/* Main display */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
        {showVideo && shop.video.url ? (
          <video
            src={shop.video.url}
            controls
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <Image
              src={allImages[activeImage] || shop.images.thumbnail}
              alt={shop.name}
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
            {/* Play button overlay */}
            {shop.video.url && (
              <button
                onClick={() => setShowVideo(true)}
                aria-label="Play video"
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer group"
              >
                <span className="w-16 h-16 rounded-full bg-green-500/90 group-hover:bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30 backdrop-blur-sm group-hover:scale-110 transition-all">
                  <span className="material-symbols-outlined text-4xl fill-1">play_arrow</span>
                </span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Thumbnail gallery */}
      {allImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveImage(i);
                setShowVideo(false);
              }}
              className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors cursor-pointer ${
                activeImage === i ? "border-green-500" : "border-transparent"
              }`}
            >
              <Image
                src={img}
                alt={`Gallery ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
