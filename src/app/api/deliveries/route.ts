import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = [
  "pending",
  "assigned",
  "picking_up",
  "at_shop",
  "returning",
  "delivered",
  "cancelled",
] as const;

// GET /api/deliveries — courier's own jobs
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["courier", "admin"].includes(profile.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (profile.role === "courier") {
      const { data: courier } = await supabase
        .from("couriers")
        .select("application_status")
        .eq("id", user.id)
        .single();

      if (!courier || courier.application_status !== "approved") {
        return NextResponse.json(
          { success: false, error: "Courier profile is not approved yet" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "";
    const statusList = status
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is (typeof VALID_STATUSES)[number] =>
        (VALID_STATUSES as readonly string[]).includes(value)
      );

    let query = supabase
      .from("deliveries")
      .select(`
        *,
        orders (
          id,
          total_amount,
          customer_info,
          order_items (name, quantity, image)
        )
      `)
      .eq("courier_id", user.id)
      .order("created_at", { ascending: false });

    if (statusList.length === 1) {
      query = query.eq("status", statusList[0]);
    } else if (statusList.length > 1) {
      query = query.in("status", statusList);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/deliveries", err);
    return NextResponse.json({ success: false, error: "Failed to fetch deliveries" }, { status: 500 });
  }
}
