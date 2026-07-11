import { NextResponse } from "next/server";
import { suggestAddresses } from "@/lib/geocode";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/geocode/suggest?q=...&limit=5&token=...
 *
 * Server-side proxy for address type-ahead, backed by Google Places
 * Autocomplete (New) when GOOGLE_MAPS_API_KEY is set, else OSM (Photon →
 * Nominatim). Google predictions carry a `placeId` (coords resolved later via
 * /api/geocode/details); OSM results carry coords inline. `token` is an
 * optional Places session token grouping keystrokes + the details call into
 * one billing session.
 *
 * Always 200 with `data: []` on no match so the caller can distinguish an
 * empty result set from a network/parse error.
 */
export async function GET(request: Request) {
  try {
    if (!(await rateLimit(`geocode-suggest:${clientIp(request)}`, 60, 60))) {
      return tooManyRequests();
    }
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const limitParamRaw = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParamRaw) && limitParamRaw > 0 ? limitParamRaw : 5;
    const token = searchParams.get("token") ?? undefined;

    // Avoid hammering the geocoder on the first couple of keystrokes — short
    // fragments produce noisy, useless matches anyway.
    if (q.length < 3) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await suggestAddresses(q, limit, token);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /api/geocode/suggest", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch address suggestions" },
      { status: 500 }
    );
  }
}
