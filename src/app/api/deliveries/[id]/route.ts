import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paystackInitiateTransfer } from "@/lib/paystack";
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
] as const;

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["cancelled"],
  assigned: ["picking_up", "cancelled"],
  picking_up: ["at_shop", "cancelled"],
  at_shop: ["returning", "cancelled"],
  returning: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

type DeliveryStatus = (typeof VALID_STATUSES)[number];

async function getActorContext(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = profile?.role ?? null;
  const isAdmin = role === "admin";

  let isApprovedCourier = false;
  if (role === "courier") {
    const { data: courier } = await supabase
      .from("couriers")
      .select("application_status")
      .eq("id", userId)
      .single();
    isApprovedCourier = courier?.application_status === "approved";
  }

  return { role, isAdmin, isApprovedCourier };
}

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
    const status = body?.status as DeliveryStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const { role, isAdmin, isApprovedCourier } = await getActorContext(supabase, user.id);
    if (!role) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { data: currentDelivery, error: currentDeliveryError } = await supabase
      .from("deliveries")
      .select("id, status, courier_id")
      .eq("id", id)
      .single();

    if (currentDeliveryError || !currentDelivery) {
      return NextResponse.json({ success: false, error: "Delivery not found" }, { status: 404 });
    }

    if (!isAdmin) {
      if (role !== "courier" || !isApprovedCourier) {
        return NextResponse.json(
          { success: false, error: "Only approved couriers can update delivery status" },
          { status: 403 }
        );
      }

      if (currentDelivery.courier_id !== user.id) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const allowedNextStatuses = STATUS_TRANSITIONS[currentDelivery.status] ?? [];
      if (!allowedNextStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid status transition from ${currentDelivery.status} to ${status}`,
          },
          { status: 409 }
        );
      }
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
      .eq("status", currentDelivery.status)
      .select(`
        *,
        orders (
          id,
          customer_info,
          order_items (shop_id, shops (contact))
        )
      `)
      .maybeSingle();

    if (error) throw error;
    if (!delivery) {
      return NextResponse.json(
        { success: false, error: "Delivery status was updated by another action. Refresh and retry." },
        { status: 409 }
      );
    }

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

    // Courier auto-payout on delivered. Runs in the same request because the
    // courier is right here finishing the job. Failures are logged, not thrown
    // — the delivery is already marked delivered and a retry can be triggered
    // by an admin if needed. Idempotent on the per-delivery Paystack reference.
    if (status === "delivered") {
      try {
        await settleCourierPayout(delivery.id as string);
      } catch (payoutErr) {
        console.error("Courier payout failed (delivery still completed)", {
          deliveryId: delivery.id,
          error: payoutErr instanceof Error ? payoutErr.message : payoutErr,
        });
      }
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

    const { role, isApprovedCourier } = await getActorContext(supabase, user.id);
    if (role !== "courier" || !isApprovedCourier) {
      return NextResponse.json(
        { success: false, error: "Only approved couriers can accept jobs" },
        { status: 403 }
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
      .eq("status", "pending")
      .is("courier_id", null)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: "This job is no longer available" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/deliveries/[id]/accept", err);
    return NextResponse.json({ success: false, error: "Failed to accept job" }, { status: 500 });
  }
}

// ─── Courier payout helper ────────────────────────────────────────────────────

/**
 * Transfer the courier's earnings via Paystack and stamp `paid_to_courier_at`.
 *
 * Idempotent: uses a deterministic Paystack reference (`gpkc_<delivery_id>`)
 * and skips if `paid_to_courier_at` is already set. If this delivery is the
 * last unpaid leg of the parent order, the order's `courier_paid_at` is also
 * stamped so vendors can see the order is fully settled.
 *
 * Uses the admin client so RLS cannot interfere with bookkeeping rows that the
 * courier or customer would otherwise have no write permission on (orders).
 */
async function settleCourierPayout(deliveryId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: delivery, error: deliveryError } = await admin
    .from("deliveries")
    .select("id, order_id, courier_id, courier_fee, status, leg, paid_to_courier_at")
    .eq("id", deliveryId)
    .single();

  if (deliveryError) throw deliveryError;
  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`);

  if (delivery.status !== "delivered") {
    console.info("Courier payout skipped — delivery not delivered", { deliveryId });
    return;
  }
  if (delivery.paid_to_courier_at) {
    console.info("Courier payout skipped — already paid", { deliveryId });
    return;
  }
  const fee = Number(delivery.courier_fee ?? 0);
  if (fee <= 0) {
    console.info("Courier payout skipped — zero fee", { deliveryId });
    // Still stamp paid_to_courier_at so the order can be marked complete.
    await admin
      .from("deliveries")
      .update({ paid_to_courier_at: new Date().toISOString() })
      .eq("id", deliveryId);
    await maybeStampOrderCourierPaid(admin, delivery.order_id as string);
    return;
  }
  if (!delivery.courier_id) {
    throw new Error(`Delivery ${deliveryId} has no courier_id`);
  }

  const { data: courier, error: courierError } = await admin
    .from("profiles")
    .select("paystack_recipient_code, full_name")
    .eq("id", delivery.courier_id)
    .single();

  if (courierError) throw courierError;
  if (!courier?.paystack_recipient_code) {
    throw new Error(
      `Courier ${delivery.courier_id} has no paystack_recipient_code — they must complete /courier/payout setup`
    );
  }

  // Idempotency reference. Paystack will reject duplicates so even a double-
  // invocation cannot double-pay.
  const reference = `gpkc_${deliveryId.replace(/-/g, "")}`;

  const transfer = await paystackInitiateTransfer({
    amountNaira: fee,
    recipientCode: courier.paystack_recipient_code,
    reason: `GreenPack delivery ${deliveryId.slice(0, 8).toUpperCase()}`,
    reference,
  });

  console.info("Courier payout initiated", {
    deliveryId,
    transferCode: transfer.transfer_code,
    amountNaira: fee,
  });

  await admin
    .from("deliveries")
    .update({ paid_to_courier_at: new Date().toISOString() })
    .eq("id", deliveryId);

  await maybeStampOrderCourierPaid(admin, delivery.order_id as string);
}

/**
 * If every delivery row for this order has been paid, stamp the order's
 * `courier_paid_at` so vendors and admins can see settlement is complete.
 */
async function maybeStampOrderCourierPaid(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string
): Promise<void> {
  const { data: legs, error } = await admin
    .from("deliveries")
    .select("paid_to_courier_at")
    .eq("order_id", orderId);

  if (error) {
    console.error("Failed to inspect delivery legs for order settlement", {
      orderId,
      error,
    });
    return;
  }

  if (!legs || legs.length === 0) return;
  const allPaid = legs.every((l) => l.paid_to_courier_at);
  if (!allPaid) return;

  await admin
    .from("orders")
    .update({
      courier_paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .is("courier_paid_at", null);
}
