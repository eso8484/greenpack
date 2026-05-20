"use client";

/**
 * Attaches Google Places Autocomplete to an <input>, so typing an address shows
 * real suggestions and selecting one yields a precise lat/lng (far more accurate
 * than reverse-geocoding a coarse browser GPS fix).
 *
 * No-ops when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY isn't set, leaving the input as a
 * plain manual-entry field — so this is always safe to attach.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

export interface ResolvedAddress {
  address: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
}

function pick(components: any[], type: string): string | undefined {
  const c = components?.find((x) => Array.isArray(x.types) && x.types.includes(type));
  return c?.long_name;
}

export function useAddressAutocomplete(
  inputRef: React.RefObject<HTMLInputElement | null>,
  onResolved: (r: ResolvedAddress) => void
): { enabled: boolean } {
  // Keep the latest callback in a ref so the effect runs once, not on every
  // parent re-render.
  const cbRef = useRef(onResolved);
  cbRef.current = onResolved;

  const enabled = typeof window !== "undefined" && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    const promise = loadGoogleMaps();
    if (!promise) return; // no key → manual entry only

    let cancelled = false;
    let autocomplete: any;

    promise
      .then((maps: any) => {
        if (cancelled || !inputRef.current) return;
        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          fields: ["address_components", "formatted_address", "geometry", "name"],
          componentRestrictions: { country: "ng" },
          types: ["geocode"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const loc = place?.geometry?.location;
          if (!loc) return;
          const comps = place.address_components ?? [];
          cbRef.current({
            address: place.formatted_address || place.name || "",
            city: pick(comps, "locality") || pick(comps, "administrative_area_level_2"),
            state: pick(comps, "administrative_area_level_1"),
            lat: typeof loc.lat === "function" ? loc.lat() : loc.lat,
            lng: typeof loc.lng === "function" ? loc.lng() : loc.lng,
          });
        });
      })
      .catch(() => {
        /* SDK failed to load — stay on manual entry */
      });

    return () => {
      cancelled = true;
      try {
        (window as any).google?.maps?.event?.clearInstanceListeners?.(autocomplete);
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { enabled };
}
