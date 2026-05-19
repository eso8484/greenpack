/**
 * Address ↔ lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Falls back to Google Maps Geocoding API if `GOOGLE_MAPS_API_KEY` is set.
 *
 * Nominatim usage policy: <=1 req/sec, identifying User-Agent required.
 * Both helpers are server-only — they MUST be called from API routes or
 * server components so the User-Agent header can be set and rate-limits
 * are not exposed to the public IP. Browser code should hit
 * `/api/geocode/forward` and `/api/geocode/reverse` instead.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodeResult extends GeoPoint {
  formatted?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "GreenPackDelight/1.0 (https://greenpack.ng)";

/** Address → coordinates. Tries Google first if a key is set, then Nominatim. */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  country = "Nigeria"
): Promise<GeocodeResult | null> {
  const query = [address, city, state, country].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleKey}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        const top = data?.results?.[0];
        const loc = top?.geometry?.location;
        if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
          return {
            lat: loc.lat,
            lng: loc.lng,
            formatted: top.formatted_address,
            address: top.formatted_address,
            city: pickComponent(top.address_components, ["locality", "administrative_area_level_2"]),
            state: pickComponent(top.address_components, ["administrative_area_level_1"]),
            country: pickComponent(top.address_components, ["country"]),
          };
        }
      }
    } catch (err) {
      console.warn("Google geocode failed, falling back to Nominatim:", err);
    }
  }

  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=1&countrycodes=ng`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      address?: Record<string, string | undefined>;
    }>;
    if (!rows.length) return null;
    const row = rows[0];
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return {
      lat,
      lng,
      formatted: row.display_name,
      address: row.display_name,
      city: row.address?.city || row.address?.town || row.address?.village || row.address?.suburb,
      state: row.address?.state,
      country: row.address?.country,
    };
  } catch (err) {
    console.error("Nominatim geocode failed:", err);
    return null;
  }
}

/** Coordinates → address details. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        const top = data?.results?.[0];
        if (top) {
          return {
            lat,
            lng,
            formatted: top.formatted_address,
            address: top.formatted_address,
            city: pickComponent(top.address_components, ["locality", "administrative_area_level_2"]),
            state: pickComponent(top.address_components, ["administrative_area_level_1"]),
            country: pickComponent(top.address_components, ["country"]),
          };
        }
      }
    } catch (err) {
      console.warn("Google reverse-geocode failed, falling back to Nominatim:", err);
    }
  }

  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    return {
      lat,
      lng,
      formatted: data.display_name,
      address: data.display_name,
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.suburb,
      state: data.address?.state,
      country: data.address?.country,
    };
  } catch (err) {
    console.error("Nominatim reverse-geocode failed:", err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickComponent(components: any[] | undefined, types: string[]): string | undefined {
  if (!Array.isArray(components)) return undefined;
  for (const component of components) {
    if (Array.isArray(component.types) && component.types.some((t: string) => types.includes(t))) {
      return component.long_name;
    }
  }
  return undefined;
}
