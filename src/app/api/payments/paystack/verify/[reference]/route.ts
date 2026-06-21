import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateFeeBreakdown } from "@/lib/utils";
import { buildDeliveryNodes } from "@/lib/delivery";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { success: false, error: "PAYSTACK_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const { reference } = await params;
    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Payment reference is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: profile }, { data: order, error: orderError }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("orders")
        .select(
          "id, customer_id, payment_status, status, total_amount, subtotal, delivery_fee, platform_fee, vendor_payout, courier_payout"
        )
        .eq("payment_reference", reference)
        .single(),
    ]);

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.customer_id !== user.id && profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({
        success: true,
        data: { orderId: order.id, payment_status: "paid", order_status: order.status },
      });
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackPayload = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackPayload.status || !paystackPayload.data) {
      return NextResponse.json(
        {
          success: false,
          error:
            typeof paystackPayload.message === "string"
              ? paystackPayload.message
              : "Unable to verify transaction",
        },
        { status: 502 }
      );
    }

    const transactionStatus = paystackPayload.data.status as string;
    if (transactionStatus !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment status is '${transactionStatus}', not successful yet`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const nextOrderStatus = order.status === "pending" ? "confirmed" : order.status;

    // Ensure fee breakdown is populated (initialize should have done it, but be defensive)
    const needsBreakdown =
      !order.subtotal ||
      Number(order.subtotal) === 0 ||
      order.platform_fee == null ||
      order.vendor_payout == null;

    let backfilledBreakdown:
      | {
          subtotal: number;
          delivery_fee: number;
          platform_fee: number;
          vendor_payout: number;
          courier_payout: number;
        }
      | null = null;

    if (needsBreakdown) {
      const deliveryFee = Number(order.delivery_fee ?? 0);
      const subtotal = Math.max(
        0,
        Number(order.subtotal ?? 0) > 0
          ? Number(order.subtotal)
          : Number(order.total_amount ?? 0) - deliveryFee
      );
      const breakdown = calculateFeeBreakdown(subtotal, deliveryFee);
      backfilledBreakdown = {
        subtotal: breakdown.subtotal,
        delivery_fee: breakdown.deliveryFee,
        platform_fee: breakdown.platformFee,
        vendor_payout: breakdown.vendorPayout,
        courier_payout: breakdown.courierPayout,
      };
    }

    // Update order payment status (and any missing breakdown fields)
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        status: nextOrderStatus,
        payment_provider: "paystack",
        payment_verified_at: now,
        payment_metadata: paystackPayload.data,
        updated_at: now,
        ...(backfilledBreakdown ?? {}),
      })
      .eq("id", order.id);

    if (updateError) throw updateError;

    // Create delivery if order needs delivery and payment is now confirmed
    const { data: fullOrder, error: fetchError } = await supabase
      .from("orders")
      .select("needs_delivery, customer_info, id")
      .eq("id", order.id)
      .single();

    if (fetchError) throw fetchError;

    if (fullOrder?.needs_delivery && fullOrder.customer_info) {
      // Resolve the final delivery_fee actually persisted on the order
      const finalDeliveryFee =
        backfilledBreakdown?.delivery_fee ?? Number(order.delivery_fee ?? 0);

      // Detect whether this order contains a pickup_return service (two-leg delivery)
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("item_type, item_id, shop_id")
        .eq("order_id", order.id);

      if (orderItemsError) {
        console.error("Failed to load order items for delivery creation", {
          orderId: order.id,
          error: orderItemsError,
        });
      }

      let hasPickupReturn = false;
      const serviceIds = (orderItems ?? [])
        .filter((it) => it.item_type === "service" && it.item_id)
        .map((it) => it.item_id as string);

      if (serviceIds.length > 0) {
        const { data: matchingServices, error: servicesError } = await supabase
          .from("services")
          .select("id, service_type")
          .in("id", serviceIds);
        if (servicesError) {
          console.error("Failed to load services for delivery leg detection", {
            orderId: order.id,
            error: servicesError,
          });
        } else {
          hasPickupReturn = (matchingServices ?? []).some(
            (s) => s.service_type === "pickup_return"
          );
        }
      }

      // Fetch the shop so the courier sees its coords + name + phone.
      const shopId = (orderItems ?? []).find((it) => it.shop_id)?.shop_id as
        | string
        | undefined;
      let shopRow = null;
      if (shopId) {
        const { data } = await supabase
          .from("shops")
          .select("name, lat, lng, location, contact")
          .eq("id", shopId)
          .single();
        shopRow = data;
      }

      // Build address nodes with coords (customer coords from checkout, or
      // geocoded as a fallback) so couriers get distance + navigation.
      const { customerNode, shopNode } = await buildDeliveryNodes(
        fullOrder.customer_info,
        shopRow
      );
      const pickupAddress = customerNode;
      const dropoffAddress = customerNode;

      let deliveryError: unknown = null;
      if (hasPickupReturn) {
        const perLegFee = Math.round((finalDeliveryFee / 2) * 100) / 100;
        const { error } = await supabase.from("deliveries").insert([
          {
            order_id: order.id,
            pickup_address: pickupAddress,
            shop_address: shopNode,
            delivery_address: dropoffAddress,
            courier_fee: perLegFee,
            leg: "pickup",
            status: "pending",
            created_at: now,
          },
          {
            order_id: order.id,
            pickup_address: pickupAddress,
            shop_address: shopNode,
            delivery_address: dropoffAddress,
            courier_fee: perLegFee,
            leg: "return",
            status: "pending",
            created_at: now,
          },
        ]);
        deliveryError = error;
      } else {
        const { error } = await supabase.from("deliveries").insert({
          order_id: order.id,
          pickup_address: pickupAddress,
          shop_address: shopNode,
          delivery_address: dropoffAddress,
          courier_fee: finalDeliveryFee,
          leg: "single",
          status: "pending",
          created_at: now,
        });
        deliveryError = error;
      }

      if (deliveryError) {
        console.error("Failed to create delivery after payment verification", {
          orderId: order.id,
          error: deliveryError,
        });
        // Log error but don't fail the payment verification - order is already paid
      }
    }

    return NextResponse.json({
      success: true,
      data: { orderId: order.id, payment_status: "paid", order_status: nextOrderStatus },
    });
  } catch (err) {
    console.error("POST /api/payments/paystack/verify/[reference]", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
