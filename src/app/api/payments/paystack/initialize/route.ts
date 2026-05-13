import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const InitializeSchema = z.object({
  orderId: z.string().uuid(),
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json(
        { success: false, error: "PAYSTACK_SECRET_KEY is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = InitializeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, customer_id, total_amount, payment_status")
      .eq("id", parsed.data.orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { success: false, error: "Order is already paid" },
        { status: 409 }
      );
    }

    const amount = Math.round(Number(order.total_amount) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Order amount is invalid for payment" },
        { status: 400 }
      );
    }

    const reference = `gpk_${order.id.replace(/-/g, "")}_${Date.now()}`;
    const callbackUrl = `${new URL(request.url).origin}/checkout`;

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: parsed.data.email,
        amount,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: {
          order_id: order.id,
          customer_id: order.customer_id,
        },
      }),
    });

    const paystackPayload = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackPayload.status || !paystackPayload.data) {
      return NextResponse.json(
        {
          success: false,
          error:
            typeof paystackPayload.message === "string"
              ? paystackPayload.message
              : "Failed to initialize Paystack transaction",
        },
        { status: 502 }
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_provider: "paystack",
        payment_currency: "NGN",
        payment_reference: reference,
        payment_metadata: {
          paystack_access_code: paystackPayload.data.access_code,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("customer_id", user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paystackPayload.data.authorization_url as string,
        access_code: paystackPayload.data.access_code as string,
        reference: paystackPayload.data.reference as string,
      },
    });
  } catch (err) {
    console.error("POST /api/payments/paystack/initialize", err);
    return NextResponse.json(
      { success: false, error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
