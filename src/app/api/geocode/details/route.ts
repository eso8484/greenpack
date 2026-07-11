import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/geocode";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/geocode/details?placeId=...&token=...
 *
 * Resolves a Google Places prediction id (from /api/geocode/suggest) into exact
 * coordinates + canonical address components. Called only when the user SELECTS
 * a suggestion, so autocomplete stays cheap (one details call per address, not
 * per keystroke). `token` is the Places session token from the suggest calls.
 *
 * Returns 200 with `data: null` when the place can't be resolved (or no Google
 * key is configured) so the caller can fall back to manual entry.
 */
export async function GET(request: Request) {
  try {
    if (!(await rateLimit(`geocode-details:${clientIp(request)}`, 40, 60))) {
      return tooManyRequests();
    }
    const { searchParams } = new URL(request.url);
    const placeId = (searchParams.get("placeId") ?? "").trim();
    const token = searchParams.get("token") ?? undefined;

    if (!placeId) {
      return NextResponse.json(
        { success: false, error: "placeId query parameter is required" },
        { status: 400 }
      );
    }

    const result = await getPlaceDetails(placeId, token);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/geocode/details", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
