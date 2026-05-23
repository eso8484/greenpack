"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import type { Shop } from "@/types";

interface ShopContactInfoProps {
  shop: Shop;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ShopContactInfo({ shop }: ShopContactInfoProps) {
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const lat = shop.location.lat;
  const lng = shop.location.lng;
  const hasCoords = lat != null && lng != null;

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [shop.location.address, shop.location.city, shop.location.state]
          .filter(Boolean)
          .join(", ")
      )}`;

  const embedUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(
        [shop.location.address, shop.location.city, shop.location.state]
          .filter(Boolean)
          .join(", ")
      )}&z=14&output=embed`;

  useEffect(() => {
    if (!hasCoords || !("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDistanceKm(haversineKm(pos.coords.latitude, pos.coords.longitude, lat!, lng!));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 }
    );
  }, [hasCoords, lat, lng]);

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Contact &amp; Location</h3>
      <div className="space-y-4">
        {/* Phone */}
        {shop.contact.phone && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
              <a href={`tel:${shop.contact.phone}`} className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                {shop.contact.phone}
              </a>
            </div>
          </div>
        )}

        {/* Email */}
        {shop.contact.email && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <a href={`mailto:${shop.contact.email}`} className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 break-all">
                {shop.contact.email}
              </a>
            </div>
          </div>
        )}

        {/* Hours */}
        {(shop.hours.days || shop.hours.open || shop.hours.close) && (
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Business Hours</p>
              {shop.hours.days && (
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shop.hours.days}</p>
              )}
              {(shop.hours.open || shop.hours.close) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {shop.hours.open || "—"} - {shop.hours.close || "—"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Address + Distance */}
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test((shop.location.address || "").trim())
                ? "—"
                : shop.location.address || "—"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {[shop.location.city, shop.location.state].filter(Boolean).join(", ")}
            </p>
            {distanceKm != null && (
              <p className="mt-1 text-xs font-semibold text-green-700 dark:text-green-400">
                {distanceKm < 1
                  ? `${Math.round(distanceKm * 1000)} m from you`
                  : `${distanceKm.toFixed(1)} km from you`}
              </p>
            )}
            {locating && distanceKm == null && (
              <p className="mt-1 text-xs text-gray-400">Calculating distance…</p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video bg-gray-50 dark:bg-gray-800">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map of ${shop.name}`}
          />
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Get Directions
        </a>
      </div>
    </Card>
  );
}
