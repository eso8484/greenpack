import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_DELIVERY_STATE_ALIASES } from "@/lib/constants";
import { calculateDeliveryFee, haversineKm } from "@/lib/utils";

const BodySchema = z.object({
  shopId: z.string().min(1),
  customerLat: z.number().finite(),
  customerLng: z.number().finite(),
  customerState: z.string().optional(),
});

function normaliseState(state: string | undefined | null): string {
  return (state ?? "").toString().trim().toLowerCase();
}

function isAllowedState(state: string): boolean {
  const s = normaliseState(state);
  return ALLOWED_DELIVERY_STATE_ALIASES.includes(s);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { shopId, customerLat, customerLng, customerState } = parsed.data;

    const supabase = await createClient();
    let { data: shop, error } = await supabase
      .from("shops")
      .select("id, lat, lng, location")
      .eq("id", shopId)
      .maybeSingle();

    if (!shop && !error) {
      ({ data: shop, error } = await supabase
        .from("shops")
        .select("id, lat, lng, location")
        .eq("slug", shopId)
        .maybeSingle());
    }

    if (error) throw error;
    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    const shopState = (shop.location as { state?: string } | null)?.state ?? "";

    // Cross-state guard: customer state must match the shop state (both must be in Abuja alias set)
    if (customerState && shopState) {
      const customerOk = isAllowedState(customerState);
      const shopOk = isAllowedState(shopState);
      const sameState = normaliseState(customerState) === normaliseState(shopState);
      if (!sameState && !(customerOk && shopOk)) {
        return NextResponse.json({
          success: true,
          data: {
            distanceKm: 0,
            fee: 0,
            blocked: true,
            reason: "Delivery only available within Abuja for now",
          },
        });
      }
    }

    if (shop.lat == null || shop.lng == null) {
      return NextResponse.json({
        success: true,
        data: {
          distanceKm: 0,
          fee: 0,
          blocked: true,
          reason: "Shop has not set its location",
        },
      });
    }

    const distanceKm = haversineKm(
      Number(shop.lat),
      Number(shop.lng),
      customerLat,
      customerLng
    );
    const fee = calculateDeliveryFee(distanceKm);

    return NextResponse.json({
      success: true,
      data: {
        distanceKm: Math.round(distanceKm * 100) / 100,
        fee,
      },
    });
  } catch (err) {
    console.error("POST /api/delivery-fee", err);
    return NextResponse.json(
      { success: false, error: "Failed to compute delivery fee" },
      { status: 500 }
    );
  }
}
