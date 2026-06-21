import { NextResponse } from "next/server";
import { searchAddresses } from "@/lib/geocode";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/geocode/suggest?q=...&limit=5
 *
 * Server-side proxy for address type-ahead. Returns multiple candidate matches
 * (each with coords + canonical components) so the client can render a
 * suggestion dropdown. Backed by Nominatim (no key) or Google when
 * GOOGLE_MAPS_API_KEY is set — same stack as /api/geocode/forward.
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

    // Avoid hammering the geocoder on the first couple of keystrokes — short
    // fragments produce noisy, useless matches anyway.
    if (q.length < 3) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await searchAddresses(q, limit);
    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error("GET /api/geocode/suggest", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch address suggestions" },
      { status: 500 }
    );
  }
}
