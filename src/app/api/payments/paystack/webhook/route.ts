import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isValidPaystackSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  return expected === signature;
}

export async function POST(request: Request) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { success: false, error: "PAYSTACK_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      return NextResponse.json({ success: false, error: "Missing signature" }, { status: 401 });
    }

    const rawBody = await request.text();
    if (!isValidPaystackSignature(rawBody, signature, paystackSecret)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        metadata?: { order_id?: string };
      };
    };

    if (event.event !== "charge.success" || event.data?.status !== "success") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const reference = event.data?.reference;
    const metadataOrderId = event.data?.metadata?.order_id;
    if (!reference && !metadataOrderId) {
      return NextResponse.json({ success: false, error: "Missing order reference" }, { status: 400 });
    }

    const admin = createAdminClient();
    let orderQuery = admin
      .from("orders")
      .select("id, status, payment_status")
      .limit(1);

    if (metadataOrderId) {
      orderQuery = orderQuery.eq("id", metadataOrderId);
    } else if (reference) {
      orderQuery = orderQuery.eq("payment_reference", reference);
    }

    const { data: orders, error: orderError } = await orderQuery;
    if (orderError) throw orderError;
    const order = orders?.[0];

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status !== "paid") {
      const now = new Date().toISOString();
      const nextStatus = order.status === "pending" ? "confirmed" : order.status;

      // Update order payment status
      const { error: updateError } = await admin
        .from("orders")
        .update({
          payment_status: "paid",
          status: nextStatus,
          payment_provider: "paystack",
          payment_reference: reference ?? null,
          payment_verified_at: now,
          payment_metadata: event.data ?? {},
          updated_at: now,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // Create delivery if order needs delivery
      const { data: fullOrder, error: fetchError } = await admin
        .from("orders")
        .select("needs_delivery, customer_info, id")
        .eq("id", order.id)
        .single();

      if (fetchError) {
        console.error("Failed to fetch order after payment update", {
          orderId: order.id,
          error: fetchError,
        });
      } else if (fullOrder?.needs_delivery && fullOrder.customer_info) {
        const deliveryAddress = fullOrder.customer_info.address || "";
        const { error: deliveryError } = await admin
          .from("deliveries")
          .insert({
            order_id: order.id,
            pickup_address: {
              address: deliveryAddress,
              instructions: fullOrder.customer_info.message || "",
            },
            delivery_address: {
              address: deliveryAddress,
              instructions: fullOrder.customer_info.message || "",
            },
            courier_fee: 0,
            status: "pending",
            created_at: now,
          });

        if (deliveryError) {
          console.error("Failed to create delivery from webhook", {
            orderId: order.id,
            error: deliveryError,
          });
        } else {
          console.info("Created delivery from Paystack webhook", {
            orderId: order.id,
            reference: reference ?? null,
          });
        }
      }

      console.info("Paystack webhook marked order as paid", {
        orderId: order.id,
        reference: reference ?? null,
      });
    } else {
      console.info("Paystack webhook received for already-paid order", {
        orderId: order.id,
        reference: reference ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/payments/paystack/webhook", err);
    return NextResponse.json(
      { success: false, error: "Failed to process Paystack webhook" },
      { status: 500 }
    );
  }
}
