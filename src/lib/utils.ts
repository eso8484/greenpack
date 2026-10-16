import { CURRENCY_SYMBOL } from "./constants";
import type { Shop, Service, Product, Review } from "@/types";
import { shops } from "./data/shops";
import { services } from "./data/services";
import { products } from "./data/products";
import { reviews } from "./data/reviews";

export function formatPrice(price: number): string {
  return `${CURRENCY_SYMBOL}${price.toLocaleString()}`;
}

export function formatPriceType(
  price: number,
  type: Service["priceType"]
): string {
  switch (type) {
    case "fixed":
      return formatPrice(price);
    case "starting_from":
      return `From ${formatPrice(price)}`;
    case "per_hour":
      return `${formatPrice(price)}/hr`;
    case "negotiable":
      return "Negotiable";
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * A shop is displayable only with a thumbnail, a banner, and at least one
 * gallery image — the platform's image rule, in one place.
 *
 * It accepts a raw `shops.images` row, a mapped `Shop["images"]`, or the shop
 * editor's form fields, because all three share a shape on purpose: the rule is
 * asked at the display boundary, in the mock readers, and in the save handler,
 * and three shapes would mean three subtly different predicates.
 *
 * It is the JS twin of the `shops.images_complete` generated column in
 * migration 021. The two must agree. The SQL is what the Supabase path filters
 * on (a `.eq("images_complete", true)`, so the rule runs before `.limit()` and
 * `.range()` rather than after them); this is what the mock path filters on, so
 * behaviour does not change when `NEXT_PUBLIC_SUPABASE_URL` is unset.
 */
export function shopImagesComplete(
  images?: {
    thumbnail?: string | null;
    banner?: string | null;
    gallery?: unknown;
  } | null
): boolean {
  return Boolean(
    images?.thumbnail?.trim() &&
      images?.banner?.trim() &&
      Array.isArray(images.gallery) &&
      images.gallery.length >= 1
  );
}

export function getShopsByCategory(categoryId: string): Shop[] {
  return shops.filter(
    (s) => s.categoryId === categoryId && shopImagesComplete(s.images)
  );
}

export function getFeaturedShops(): Shop[] {
  return shops.filter((s) => s.isFeatured && shopImagesComplete(s.images));
}

/**
 * Identity lookup, deliberately **not** filtered by the image rule.
 *
 * The rule is a *display* rule, so it is applied where shops are listed. This
 * function answers "what is shop X", and an identity lookup that refused to
 * answer for an incomplete shop would be the wrong shape: the shop is saved and
 * real, and the vendor editing it needs to read back what they saved.
 *
 * ⚠️ The consequence, stated plainly because it is easy to assume otherwise:
 * **an incomplete shop is still reachable at `/shop/[shopId]` by anyone holding
 * the URL.** `src/app/shop/[shopId]/page.tsx` calls this and then `notFound()`
 * on null alone — there is no completeness check and no ownership test on that
 * page, so an unlisted shop renders (with `mapShop`'s placehold.co fallbacks
 * standing in for the missing images) to a stranger who guesses the slug. It is
 * unlisted in the sense that decides discovery — browse, search, category, and
 * the homepage all exclude it — not in the sense of being unreachable.
 *
 * That is the current behaviour, not an endorsement. Gating it is a small change,
 * not a refactor: the owner is already on the mapped row as `shop.owner`
 * (`mapShop` sets it from `owner_id`), so the page can compare it against the
 * session user and weigh ownership against completeness. That comparison is the
 * only place the two can be weighed against each other.
 */
export function getShopById(shopId: string): Shop | undefined {
  return shops.find((s) => s.id === shopId);
}

export function getServicesByShopId(shopId: string): Service[] {
  return services.filter((s) => s.shopId === shopId);
}

export function getProductsByShopId(shopId: string): Product[] {
  return products.filter((p) => p.shopId === shopId);
}

export function getReviewsByShopId(shopId: string): Review[] {
  return reviews.filter((r) => r.shopId === shopId);
}

export function calculateAverageRating(shopReviews: Review[]): number {
  if (shopReviews.length === 0) return 0;
  const sum = shopReviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / shopReviews.length) * 10) / 10;
}

export function searchShops(query: string): Shop[] {
  const q = query.toLowerCase();
  return shops.filter(
    (s) =>
      shopImagesComplete(s.images) &&
      (s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)))
  );
}

export function filterShops(
  allShops: Shop[],
  {
    query,
    categoryIds,
    sortBy,
    verifiedOnly,
  }: {
    query?: string;
    categoryIds?: string[] | null;
    sortBy?: string;
    verifiedOnly?: boolean;
  }
): Shop[] {
  // The image rule comes first, so everything below narrows an already-legal set.
  // It is not redundant with the Supabase path's `.eq("images_complete", true)`
  // for the same reason the elite-first sort below is not redundant with the
  // chained `.order("is_elite", …)`: this is the mock path's half of one rule, and
  // the two must agree or behaviour diverges the moment NEXT_PUBLIC_SUPABASE_URL
  // is unset. (Note `allShops` can also arrive already-filtered on the Supabase
  // path, where dbGetShops() has done it in SQL — re-asking is cheap and keeps
  // the invariant local.)
  let filtered = allShops.filter((s) => shopImagesComplete(s.images));

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (categoryIds?.length) {
    filtered = filtered.filter((s) => categoryIds.includes(s.categoryId));
  }

  if (verifiedOnly) {
    filtered = filtered.filter((s) => s.isVerified);
  }

  switch (sortBy) {
    case "rating":
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;
    default:
      break;
  }

  // Elite first, as the outer key — and deliberately applied *after* the switch,
  // not before. `Array.prototype.sort` is stable (ES2019), so returning 0 within a
  // tier preserves the rating/newest order just applied. Sorted before it, the
  // later sort would be stable in the other direction: elite would only win ties,
  // and a 4.9 non-elite would still jump a 3.0 elite.
  //
  // This is the mock path's half of the same rule `dbGetShops()` applies with a
  // chained `.order("is_elite", ...)`; the two must agree or behaviour diverges the
  // moment NEXT_PUBLIC_SUPABASE_URL is unset.
  filtered.sort((a, b) => Number(b.isElite) - Number(a.isElite));

  return filtered;
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  DELIVERY_BASE_FEE,
  DELIVERY_MAX_FEE,
  DELIVERY_MIN_FEE,
  DELIVERY_RATE_PER_KM,
  PLATFORM_FEE_PERCENT,
  VENDOR_PAYOUT_PERCENT,
} from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// === GEO / DISTANCE ===
// Haversine: great-circle distance between two lat/lng points (kilometres).
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// === FEE CALCULATIONS ===
export function calculateDeliveryFee(distanceKm: number): number {
  const raw = DELIVERY_BASE_FEE + distanceKm * DELIVERY_RATE_PER_KM;
  const clamped = Math.max(DELIVERY_MIN_FEE, Math.min(DELIVERY_MAX_FEE, raw));
  return Math.round(clamped);
}

export interface FeeBreakdown {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  vendorPayout: number;
  courierPayout: number;
  total: number;
}

export function calculateFeeBreakdown(
  subtotal: number,
  deliveryFee = 0
): FeeBreakdown {
  const platformFee = Math.round((subtotal * PLATFORM_FEE_PERCENT) / 100);
  const vendorPayout = Math.round((subtotal * VENDOR_PAYOUT_PERCENT) / 100);
  const courierPayout = deliveryFee;
  return {
    subtotal,
    deliveryFee,
    platformFee,
    vendorPayout,
    courierPayout,
    total: subtotal + deliveryFee,
  };
}

// Tiny green-tinted SVG blur placeholder for Next.js Image blurDataURL
export const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#d1fae5"/><rect width="40" height="30" fill="#22c55e" opacity="0.15"/></svg>'
  ).toString("base64");
