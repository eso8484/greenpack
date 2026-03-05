import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/deliveries — courier's own jobs
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

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

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    console.error("GET /api/deliveries", err);
    return NextResponse.json({ success: false, error: "Failed to fetch deliveries" }, { status: 500 });
  }
}
