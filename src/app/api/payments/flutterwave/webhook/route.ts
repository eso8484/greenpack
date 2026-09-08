import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security";
import { flutterwaveVerifyTransaction } from "@/lib/flutterwave";
import {
  fulfillFlutterwavePayment,
  markOrderCourierPaidIfSettled,
} from "@/lib/payment-fulfillment";

interface FlutterwaveWebhookEvent {
  event?: string;
  data?: {
    id?: string | number;
    tx_ref?: string;
    reference?: string;
    status?: string;
  };
}

function isVerifiedPayment(
  transaction: {
    status: string;
    tx_ref: string;
    amount: number | string;
    currency: string;
  },
  reference: string,
  totalAmount: number
) {
  return (
    transaction.status.toLowerCase() === "successful" &&
    transaction.tx_ref === reference &&
    transaction.currency.toUpperCase() === "NGN" &&
    Math.abs(Number(transaction.amount) - totalAmount) < 0.005
  );
}

export async function POST(request: Request) {
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    if (!secretHash) {
      return NextResponse.json(
        { success: false, error: "FLW_SECRET_HASH is not configured" },
        { status: 503 }
      );
    }

    const signature = request.headers.get("verif-hash");
    if (!safeEqual(signature, secretHash)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    const event = (await request.json()) as FlutterwaveWebhookEvent;
    if (event.event === "transfer.completed") {
      return handleTransferCompleted(event);
    }
    if (event.event !== "charge.completed" || event.data?.status?.toLowerCase() !== "successful") {
      return NextResponse.json({ success: true, ignored: true });
    }
    if (!process.env.FLW_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "FLW_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }
    if (!event.data.id || !event.data.tx_ref) {
      return NextResponse.json(
        { success: false, error: "Missing transaction details" },
        { status: 400 }
      );
    }

    // Treat webhook data as an alert, not proof: query Flutterwave again before
    // changing an order's status.
    const transaction = await flutterwaveVerifyTransaction(event.data.id);
    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, total_amount")
      .eq("payment_reference", event.data.tx_ref)
      .eq("payment_provider", "flutterwave")
      .single();
    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    if (!isVerifiedPayment(transaction, event.data.tx_ref, Number(order.total_amount))) {
      return NextResponse.json(
        { success: false, error: "Payment could not be confirmed for this order" },
        { status: 409 }
      );
    }

    await fulfillFlutterwavePayment({
      orderId: order.id,
      reference: event.data.tx_ref,
      transaction,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/payments/flutterwave/webhook", err);
    return NextResponse.json(
      { success: false, error: "Failed to process Flutterwave webhook" },
      { status: 500 }
    );
  }
}

async function handleTransferCompleted(event: FlutterwaveWebhookEvent) {
  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ success: true, ignored: true });
  }
  if (event.data?.status?.toUpperCase() !== "SUCCESSFUL") {
    return NextResponse.json({ success: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: delivery, error } = await admin
    .from("deliveries")
    .update({ paid_to_courier_at: new Date().toISOString() })
    .eq("flutterwave_payout_reference", reference)
    .is("paid_to_courier_at", null)
    .select("order_id")
    .maybeSingle();
  if (error) throw error;
  if (delivery?.order_id) {
    await markOrderCourierPaidIfSettled(delivery.order_id);
  }

  return NextResponse.json({ success: true });
}
