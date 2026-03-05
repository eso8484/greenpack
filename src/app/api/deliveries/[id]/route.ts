import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  notifyCustomerCourierAssigned,
  notifyVendorItemArrived,
  notifyCustomerDeliveryComplete,
} from "@/lib/termii";

const VALID_STATUSES = [
  "pending",
  "assigned",
  "picking_up",
  "at_shop",
  "returning",
  "delivered",
  "cancelled",
];

// PUT /api/deliveries/[id] — update delivery status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "delivered") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        orders (
          id,
          customer_info,
          order_items (shop_id, shops (contact))
        )
      `)
      .single();

    if (error) throw error;

    // Trigger SMS notifications
    try {
      const order = delivery.orders as Record<string, unknown> | null;
      const customerPhone = (order?.customer_info as Record<string, string>)?.phone;
      const orderRef = (order?.id as string)?.slice(0, 8).toUpperCase() ?? id.slice(0, 8).toUpperCase();

      if (status === "assigned" && customerPhone) {
        const courierProfile = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();
        if (courierProfile.data) {
          await notifyCustomerCourierAssigned(
            customerPhone,
            courierProfile.data.full_name ?? "Your courier",
            courierProfile.data.phone ?? ""
          );
        }
      }

      if (status === "at_shop") {
        // Notify vendor
        const items = (order?.order_items as Array<{ shops: { contact: { phone: string } } }>) ?? [];
        const vendorPhone = items[0]?.shops?.contact?.phone;
        if (vendorPhone) {
          await notifyVendorItemArrived(vendorPhone, orderRef);
        }
      }

      if (status === "delivered" && customerPhone) {
        await notifyCustomerDeliveryComplete(customerPhone, orderRef);

        // Increment courier total_deliveries
        try {
          await supabase.rpc("increment_courier_deliveries", { courier_id: user.id });
        } catch {
          // RPC may not exist yet — safe to ignore
        }
      }
    } catch (smsErr) {
      console.error("SMS notification failed:", smsErr);
      // Don't fail the request for SMS errors
    }

    return NextResponse.json({ success: true, data: delivery });
  } catch (err) {
    console.error("PUT /api/deliveries/[id]", err);
    return NextResponse.json({ success: false, error: "Failed to update delivery" }, { status: 500 });
  }
}

// POST /api/deliveries/[id]/accept — courier accepts a job
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify this delivery is still pending
    const { data: existing } = await supabase
      .from("deliveries")
      .select("status, courier_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Delivery not found" }, { status: 404 });
    }

    if (existing.status !== "pending" || existing.courier_id) {
      return NextResponse.json(
        { success: false, error: "This job is no longer available" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("deliveries")
      .update({
        courier_id: user.id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/deliveries/[id]/accept", err);
    return NextResponse.json({ success: false, error: "Failed to accept job" }, { status: 500 });
  }
}
