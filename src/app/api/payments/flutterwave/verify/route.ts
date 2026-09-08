import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { flutterwaveVerifyTransaction } from "@/lib/flutterwave";
import { fulfillFlutterwavePayment } from "@/lib/payment-fulfillment";

const VerifySchema = z.object({
  transactionId: z.union([z.string().min(1), z.number().int().positive()]),
  reference: z.string().min(1).max(120),
});

function matchesOrder(
  transaction: { status: string; tx_ref: string; amount: number | string; currency: string },
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
    if (!process.env.FLW_SECRET_KEY) {
      return NextResponse.json(
        { success: false, error: "FLW_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const parsed = VerifySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, status, payment_status, total_amount")
      .eq("payment_reference", parsed.data.reference)
      .eq("payment_provider", "flutterwave")
      .single();
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

    const transaction = await flutterwaveVerifyTransaction(parsed.data.transactionId);
    if (!matchesOrder(transaction, parsed.data.reference, Number(order.total_amount))) {
      return NextResponse.json(
        { success: false, error: "Payment could not be confirmed for this order" },
        { status: 409 }
      );
    }

    const result = await fulfillFlutterwavePayment({
      orderId: order.id,
      reference: parsed.data.reference,
      transaction,
    });
    return NextResponse.json({
      success: true,
      data: {
        orderId: result.orderId,
        payment_status: "paid",
        order_status: result.orderStatus,
      },
    });
  } catch (err) {
    console.error("POST /api/payments/flutterwave/verify", err);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
