import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateFeeBreakdown, nairaToKobo } from "@/lib/utils";
import { PAYSTACK_BASE_URL } from "@/lib/constants";

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
      .select(
        "id, customer_id, total_amount, payment_status, delivery_fee, subtotal"
      )
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

    // Load order items to determine shops (split is per-transaction in Paystack)
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("shop_id, price, quantity")
      .eq("order_id", order.id);

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order has no items" },
        { status: 400 }
      );
    }

    const shopIds = Array.from(new Set(items.map((it) => it.shop_id)));
    if (shopIds.length > 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Order contains items from multiple shops. Please check out one shop at a time.",
        },
        { status: 400 }
      );
    }

    const shopId = shopIds[0];
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("id, paystack_subaccount_code")
      .eq("id", shopId)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found for this order" },
        { status: 404 }
      );
    }

    if (!shop.paystack_subaccount_code) {
      return NextResponse.json(
        {
          success: false,
          error: "Vendor is not yet payment-enabled. Please contact support.",
        },
        { status: 400 }
      );
    }

    // Compute fee breakdown
    const itemsSubtotal = items.reduce(
      (sum, it) => sum + Number(it.price) * Number(it.quantity ?? 1),
      0
    );
    const deliveryFee = Number(order.delivery_fee ?? 0);
    // Prefer stored subtotal if it exists; otherwise fall back to items sum or (total - delivery)
    const subtotal =
      Number(order.subtotal) > 0
        ? Number(order.subtotal)
        : itemsSubtotal > 0
          ? itemsSubtotal
          : Math.max(0, Number(order.total_amount) - deliveryFee);

    const breakdown = calculateFeeBreakdown(subtotal, deliveryFee);

    // Persist breakdown on the order BEFORE calling Paystack
    const { error: preUpdateError } = await supabase
      .from("orders")
      .update({
        subtotal: breakdown.subtotal,
        delivery_fee: breakdown.deliveryFee,
        platform_fee: breakdown.platformFee,
        vendor_payout: breakdown.vendorPayout,
        courier_payout: breakdown.courierPayout,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("customer_id", user.id);

    if (preUpdateError) throw preUpdateError;

    const amount = nairaToKobo(breakdown.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Order amount is invalid for payment" },
        { status: 400 }
      );
    }

    // Platform retains (platform_fee + delivery_fee) via transaction_charge;
    // Paystack settles the remainder to the vendor's subaccount.
    const transactionChargeKobo = nairaToKobo(
      breakdown.platformFee + breakdown.deliveryFee
    );

    const reference = `gpk_${order.id.replace(/-/g, "")}_${Date.now()}`;
    const callbackUrl = `${new URL(request.url).origin}/checkout`;

    const paystackResponse = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
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
          subaccount: shop.paystack_subaccount_code,
          bearer: "account",
          transaction_charge: transactionChargeKobo,
          metadata: {
            order_id: order.id,
            customer_id: order.customer_id,
            shop_id: shop.id,
            subtotal: breakdown.subtotal,
            delivery_fee: breakdown.deliveryFee,
            platform_fee: breakdown.platformFee,
            vendor_payout: breakdown.vendorPayout,
            courier_payout: breakdown.courierPayout,
            total: breakdown.total,
          },
        }),
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
          subaccount: shop.paystack_subaccount_code,
          transaction_charge_kobo: transactionChargeKobo,
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
