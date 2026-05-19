import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // Verify ownership: user must be the customer who placed the order
    if (data.customer_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/orders/[orderId]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
  }
}

// Customers may only cancel their own pending order. Vendors of the order's
// shop and admins may move it through the fulfillment lifecycle.
const CUSTOMER_ALLOWED = new Set(["cancelled"]);
const VENDOR_ALLOWED = new Set([
  "confirmed",
  "processing",
  "ready",
  "completed",
  "cancelled",
]);
const VALID_STATUSES = new Set([
  "pending",
  "confirmed",
  "processing",
  "ready",
  "completed",
  "cancelled",
]);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();
    if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const [{ data: profile }, { data: order, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("orders")
        .select("id, customer_id, status")
        .eq("id", orderId)
        .single(),
    ]);

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const isAdmin = profile?.role === "admin";
    const isCustomer = order.customer_id === user.id;

    let isVendorOfOrder = false;
    if (!isAdmin && !isCustomer) {
      const { data: ownership } = await supabase
        .from("order_items")
        .select("shop_id, shops!inner(owner_id)")
        .eq("order_id", orderId)
        .eq("shops.owner_id", user.id)
        .limit(1);
      isVendorOfOrder = (ownership?.length ?? 0) > 0;
    }

    if (!isAdmin && !isCustomer && !isVendorOfOrder) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin) {
      const allowed = isVendorOfOrder ? VENDOR_ALLOWED : CUSTOMER_ALLOWED;
      if (!allowed.has(status)) {
        return NextResponse.json(
          { success: false, error: `Not permitted to set status to '${status}'` },
          { status: 403 }
        );
      }
      if (isCustomer && !isVendorOfOrder && order.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "Order can no longer be cancelled" },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("PUT /api/orders/[orderId]", err);
    return NextResponse.json({ success: false, error: "Failed to update order" }, { status: 500 });
  }
}
