import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateReviewSchema = z.object({
  shop_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000),
  customer_name: z.string().min(1),
  customer_avatar: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get("shopId");

    if (!shopId) {
      return NextResponse.json({ success: false, error: "shopId required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/reviews", err);
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Prevent duplicate reviews from same user for same shop
    const { data: existing } = await supabase
      .from("reviews")
      .select("id")
      .eq("shop_id", parsed.data.shop_id)
      .eq("customer_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "You have already reviewed this shop" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("reviews")
      .insert({ ...parsed.data, customer_id: user.id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("POST /api/reviews", err);
    return NextResponse.json({ success: false, error: "Failed to create review" }, { status: 500 });
  }
}
