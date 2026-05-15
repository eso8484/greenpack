/**
 * Address → lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Falls back to Google Maps Geocoding API if `GOOGLE_MAPS_API_KEY` is set.
 *
 * Nominatim usage policy: <=1 req/sec, identifying User-Agent required.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  country = "Nigeria"
): Promise<GeoPoint | null> {
  const query = [address, city, state, country].filter(Boolean).join(", ");
  if (!query.trim()) return null;

  // Try Google first if key is configured (more accurate for Nigeria)
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleKey}`;
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (res.ok) {
        const data = await res.json();
        const loc = data?.results?.[0]?.geometry?.location;
        if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
          return { lat: loc.lat, lng: loc.lng };
        }
      }
    } catch (err) {
      console.warn("Google geocode failed, falling back to Nominatim:", err);
    }
  }

  // Nominatim fallback (free)
  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ng`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GreenPackDelight/1.0 (https://greenpack.ng)",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.error("Nominatim geocode failed:", err);
    return null;
  }
}
