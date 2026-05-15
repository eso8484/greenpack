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

export function getShopsByCategory(categoryId: string): Shop[] {
  return shops.filter((s) => s.categoryId === categoryId);
}

export function getFeaturedShops(): Shop[] {
  return shops.filter((s) => s.isFeatured);
}

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
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.categoryName.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function filterShops(
  allShops: Shop[],
  {
    query,
    categoryId,
    sortBy,
    verifiedOnly,
  }: {
    query?: string;
    categoryId?: string | null;
    sortBy?: string;
    verifiedOnly?: boolean;
  }
): Shop[] {
  let filtered = [...allShops];

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

  if (categoryId) {
    filtered = filtered.filter((s) => s.categoryId === categoryId);
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

// Paystack works in kobo (1 NGN = 100 kobo)
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

// Tiny green-tinted SVG blur placeholder for Next.js Image blurDataURL
export const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#d1fae5"/><rect width="40" height="30" fill="#22c55e" opacity="0.15"/></svg>'
  ).toString("base64");
