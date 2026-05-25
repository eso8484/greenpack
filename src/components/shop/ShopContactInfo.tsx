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

  const IconTile = ({ icon }: { icon: string }) => (
    <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </span>
  );

  return (
    <Card className="p-5 rounded-2xl">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">Contact &amp; location</h3>
      <div className="space-y-4">
        {/* Phone */}
        {shop.contact.phone && (
          <div className="flex items-start gap-3">
            <IconTile icon="call" />
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
            <IconTile icon="mail" />
            <div className="min-w-0">
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
            <IconTile icon="schedule" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Business hours</p>
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
          <IconTile icon="location_on" />
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
        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video bg-gray-50 dark:bg-gray-800">
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
          className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-lg shadow-green-500/25 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">directions</span>
          Get Directions
        </a>
      </div>
    </Card>
  );
}
