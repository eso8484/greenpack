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
// Photon is OSM data served by an engine built for type-ahead — it does fuzzy
// prefix matching (so "master" matches mid-word) and ranks by a location bias,
// unlike Nominatim's full-text search which returns nothing for partial local
// names. We use it as the primary suggestion source.
const PHOTON_BASE = "https://photon.komoot.io";
const USER_AGENT = "GreenPackDelight/1.0 (https://greenpack.ng)";

// Bias suggestions toward Abuja (the platform's delivery area) so local
// estates/streets rank first instead of same-named places elsewhere.
const BIAS_LAT = 9.0765;
const BIAS_LON = 7.3986;

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

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
  };
}

/** Photon GeoJSON feature → app GeocodeResult with a readable one-line label. */
function photonToResult(f: PhotonFeature): GeocodeResult | null {
  const coords = f?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]); // GeoJSON order is [lon, lat]
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const p = f.properties ?? {};
  const streetLine =
    p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street;
  const city = p.city || p.suburb || p.district;
  // Most-specific → least-specific, dropping blanks and adjacent duplicates so
  // labels like "Patnasonic Estate, Abuja, Federal Capital Territory, Nigeria"
  // read cleanly.
  const parts = [p.name, streetLine, p.district, city, p.state, p.country].filter(
    (v): v is string => Boolean(v)
  );
  const label = parts
    .filter((v, i) => i === 0 || v.toLowerCase() !== parts[i - 1].toLowerCase())
    .join(", ");

  return {
    lat,
    lng,
    formatted: label,
    address: label,
    city,
    state: p.state,
    country: p.country,
  };
}

/**
 * Address text → up to `limit` candidate matches, for type-ahead suggestions.
 * Order of preference: Google (if a key is set) → Photon (OSM data served by an
 * autocomplete engine, Abuja-biased) → Nominatim (last-resort fallback).
 * Photon is primary because Nominatim's full-text search returns nothing for
 * partial local names (e.g. "master"), while Photon fuzzy-matches and ranks by
 * the Abuja location bias. Always returns an array (empty on no match / error).
 */
export async function searchAddresses(
  query: string,
  limit = 5,
  country = "Nigeria"
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (!q) return [];
  const boundedLimit = Math.min(Math.max(limit, 1), 10);

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        `${q}, ${country}`
      )}&region=ng&key=${googleKey}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        const mapped = results
          .slice(0, boundedLimit)
          .map((top: Record<string, unknown>): GeocodeResult | null => {
            const geometry = top.geometry as { location?: { lat?: number; lng?: number } } | undefined;
            const loc = geometry?.location;
            if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;
            const components = top.address_components as unknown[] | undefined;
            return {
              lat: loc.lat,
              lng: loc.lng,
              formatted: top.formatted_address as string | undefined,
              address: top.formatted_address as string | undefined,
              city: pickComponent(components, ["locality", "administrative_area_level_2"]),
              state: pickComponent(components, ["administrative_area_level_1"]),
              country: pickComponent(components, ["country"]),
            };
          })
          .filter((r: GeocodeResult | null): r is GeocodeResult => r !== null);
        if (mapped.length > 0) return mapped;
      }
    } catch (err) {
      console.warn("Google address search failed, falling back:", err);
    }
  }

  // Primary free provider: Photon. Type-ahead engine + Abuja bias.
  try {
    const url =
      `${PHOTON_BASE}/api/?q=${encodeURIComponent(q)}` +
      `&limit=${boundedLimit}&lang=en&lat=${BIAS_LAT}&lon=${BIAS_LON}`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = (await res.json()) as { features?: PhotonFeature[] };
      const feats = Array.isArray(data?.features) ? data.features : [];
      const mapped = feats
        .map(photonToResult)
        .filter((r): r is GeocodeResult => r !== null);
      // Nigeria-only platform: keep just NG hits so we never suggest a
      // same-named place abroad (e.g. "Nast, Colorado"). If none match, fall
      // through to Nominatim, then to an empty list (the UI shows a hint).
      const ng = mapped.filter((r) => r.country === "Nigeria");
      if (ng.length > 0) return ng.slice(0, boundedLimit);
    }
  } catch (err) {
    console.warn("Photon address search failed, falling back to Nominatim:", err);
  }

  // Last-resort fallback: Nominatim.
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
      q
    )}&format=json&addressdetails=1&limit=${boundedLimit}&countrycodes=ng`;
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      address?: Record<string, string | undefined>;
    }>;
    return rows
      .map((row): GeocodeResult | null => {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return {
          lat,
          lng,
          formatted: row.display_name,
          address: row.display_name,
          city:
            row.address?.city ||
            row.address?.town ||
            row.address?.village ||
            row.address?.suburb,
          state: row.address?.state,
          country: row.address?.country,
        };
      })
      .filter((r): r is GeocodeResult => r !== null);
  } catch (err) {
    console.error("Nominatim address search failed:", err);
    return [];
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
