import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocode";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET /api/geocode/reverse?lat=...&lng=...
 *
 * Server-side proxy for reverse geocoding. Used by:
 *   - Vendor shop form: when the seller clicks "Use My Location", we get
 *     browser coords and hit this endpoint to fill the address/city/state
 *     fields.
 *   - Customer registration: same pattern for filling delivery address.
 */
export async function GET(request: Request) {
  try {
    if (!(await rateLimit(`geocode-reverse:${clientIp(request)}`, 40, 60))) {
      return tooManyRequests();
    }
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, error: "lat and lng query parameters are required" },
        { status: 400 }
      );
    }

    const result = await reverseGeocode(lat, lng);
    if (!result) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/geocode/reverse", err);
    return NextResponse.json(
      { success: false, error: "Failed to reverse-geocode" },
      { status: 500 }
    );
  }
}
