import Image from "next/image";
import Badge from "@/components/ui/Badge";
import Rating from "@/components/ui/Rating";
import { BLUR_PLACEHOLDER } from "@/lib/utils";
import type { Shop } from "@/types";

interface ShopHeaderProps {
  shop: Shop;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export default function ShopHeader({ shop }: ShopHeaderProps) {
  const phone = normalizePhone(shop.contact.phone || "");
  const whatsapp = normalizePhone(shop.contact.whatsapp || "") || phone;
  const mapsUrl =
    shop.location.lat != null && shop.location.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${shop.location.lat},${shop.location.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [shop.location.address, shop.location.city, shop.location.state].filter(Boolean).join(", ")
        )}`;

  return (
    <div>
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
        <Image
          src={shop.images.banner}
          alt={shop.name}
          fill
          className="object-cover"
          unoptimized
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {shop.name}
            </h1>
            {shop.isVerified && <Badge variant="green">Verified</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{shop.categoryName}</Badge>
            <Rating
              value={shop.rating}
              reviewCount={shop.reviewCount}
              className="[&_span]:text-white"
            />
            <span className="text-sm text-white/80 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {shop.location.address}, {shop.location.city}
            </span>
          </div>
        </div>
      </div>

      {/* CTA bar — book, call, message, directions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="#services"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Book a Service
        </a>
        <a
          href="#products"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Shop Products
        </a>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
            title="Call shop"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call
          </a>
        )}
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:brightness-110 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-all"
            title="Chat on WhatsApp"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
            </svg>
            WhatsApp
          </a>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
          title="Get directions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Directions
        </a>
      </div>

      {/* Description */}
      <p className="mt-4 text-gray-600 dark:text-gray-400 leading-relaxed">{shop.description}</p>
    </div>
  );
}
