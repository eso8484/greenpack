import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocode";

/**
 * GET /api/geocode/forward?address=...&city=...&state=...
 *
 * Server-side proxy for forward geocoding — converts a free-form address into
 * coordinates + canonical address components. Used by the vendor shop form
 * (Verify Address button) and by the seller/shop POST/PATCH endpoints when
 * coords are missing but an address was provided.
 *
 * Returns null data on no match (200, success: true, data: null) rather than
 * 404 so the caller can distinguish a network failure from an unknown
 * address.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get("address") ?? "").trim();
    const city = (searchParams.get("city") ?? "").trim();
    const state = (searchParams.get("state") ?? "").trim();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "address query parameter is required" },
        { status: 400 }
      );
    }

    const result = await geocodeAddress(address, city || undefined, state || undefined);

    if (!result) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/geocode/forward", err);
    return NextResponse.json(
      { success: false, error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
