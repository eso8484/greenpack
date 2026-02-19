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
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
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
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
              >
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                  <svg
                    className="w-7 h-7 text-green-600 ml-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
            {!shop.video.url && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="bg-white/80 dark:bg-gray-800/80 rounded-lg px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Shop Preview
                </div>
              </div>
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
