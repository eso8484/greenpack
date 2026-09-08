import { NextResponse } from "next/server";
import { flutterwaveListBanks } from "@/lib/flutterwave";

// Cache the bank list for 24 hours — the list rarely changes.
export const revalidate = 86400;

export async function GET() {
  try {
    const banks = await flutterwaveListBanks();

    return NextResponse.json(
      { success: true, data: banks },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/banks", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load banks",
      },
      { status: 502 }
    );
  }
}
